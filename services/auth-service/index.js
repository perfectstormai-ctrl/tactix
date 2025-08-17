require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
const JWT_ISS = process.env.JWT_ISS || 'tactix-auth';
const ACCESS_TTL_MIN = Number(process.env.ACCESS_TTL_MIN || '15');
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || '7');

const CONFIG_PATH = path.resolve(__dirname, '../../tactix.config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch {
  config = {};
}
let ldapConfig = config.ldap;
let localUsers = Array.isArray(config.users) ? config.users : [];
const LDAP_USER_FILTER = '(uid={upn})';

function ldapAuthenticate(upn, password) {
  if (!ldapConfig) {
    return Promise.reject(new Error('ldap not configured'));
  }
  const { host, port, baseDn, bindDn, bindPw } = ldapConfig;
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: `ldap://${host}:${port}` });
    client.bind(bindDn, bindPw, (err) => {
      if (err) {
        client.unbind();
        return reject(err);
      }
      const filter = LDAP_USER_FILTER.replace(/\{upn\}/g, upn);
      const opts = { filter, scope: 'sub', attributes: ['dn', 'memberOf', 'cn'] };
      client.search(baseDn, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }
        let userDn = null;
        let groups = [];
        let name = upn;
        res.on('searchEntry', (entry) => {
          userDn = entry.objectName || entry.dn;
          name = entry.attributes.find((a) => a.type === 'cn')?.vals?.[0] || upn;
          const member = entry.attributes.find((a) => a.type === 'memberOf');
          if (member) {
            groups = Array.isArray(member.vals) ? member.vals : [member.vals];
          } else if (entry.object && entry.object.memberOf) {
            const m = entry.object.memberOf;
            groups = Array.isArray(m) ? m : [m];
          }
        });
        res.on('error', (err) => {
          client.unbind();
          reject(err);
        });
        res.on('end', () => {
          if (!userDn) {
            client.unbind();
            return reject(new Error('user not found'));
          }
          client.bind(userDn, password, (err) => {
            if (err) {
              client.unbind();
              return reject(new Error('invalid credentials'));
            }
            client.unbind();
            resolve({ ad_groups: groups, name });
          });
        });
      });
    });
  });
}

function localAuthenticate(upn, password) {
  const user = localUsers.find((u) => u.upn === upn && u.password === password);
  if (!user) return null;
  return { ad_groups: [], name: upn };
}

function searchFirst(client, base, filter) {
  return new Promise((resolve, reject) => {
    client.search(base, { scope: 'sub', filter, attributes: ['dn', 'cn'] }, (err, res) => {
      if (err) return reject(err);
      let dn = null;
      res.on('searchEntry', (entry) => {
        dn = entry.objectName || entry.dn;
      });
      res.on('error', (e) => reject(e));
      res.on('end', () => resolve(dn));
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/openapi.json', (_req, res) => {
  const spec = require('./openapi.json');
  res.json(spec);
});

app.post('/login', async (req, res) => {
  const { upn, password } = req.body || {};
  if (!upn || !password) {
    return res.status(400).json({ error: 'upn and password required' });
  }
  try {
    let result;
    if (ldapConfig) {
      result = await ldapAuthenticate(upn, password);
    } else {
      result = localAuthenticate(upn, password);
      if (!result) throw new Error('invalid credentials');
    }
    const { ad_groups, name } = result;
    const baseClaims = { sub: upn, name, ad_groups, iss: JWT_ISS };
    const access = jwt.sign({ ...baseClaims, aud: 'tactix' }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: `${ACCESS_TTL_MIN}m`,
    });
    const refresh = jwt.sign({ ...baseClaims, aud: 'refresh' }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: `${REFRESH_TTL_DAYS}d`,
    });
    res.json({ access, refresh, user: { upn, name, ad_groups } });
  } catch (err) {
    res.status(401).json({ error: 'invalid credentials' });
  }
});

app.post('/ldap/test', async (req, res) => {
  const { host, port, starttls, baseDn, bindDn, bindPw } = req.body || {};
  try {
    const client = ldap.createClient({ url: `ldap://${host}:${port}` });
    let responded = false;
    client.on('error', (err) => {
      if (!responded) {
        responded = true;
        res.json({ ok: false, error: err.message });
      }
    });
    client.bind(bindDn, bindPw, async (err) => {
      if (responded) return;
      if (err) {
        client.unbind();
        responded = true;
        return res.json({ ok: false, error: err.message });
      }
      try {
        const sampleUser = await searchFirst(client, baseDn, '(objectClass=person)');
        const sampleGroup = await searchFirst(
          client,
          baseDn,
          '(objectClass=groupOfNames)'
        );
        client.unbind();
        responded = true;
        res.json({ ok: true, sampleUser, sampleGroup });
      } catch (e) {
        client.unbind();
        responded = true;
        res.json({ ok: false, error: e.message });
      }
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

app.post('/ldap/save', (req, res) => {
  const { host, port, starttls, baseDn, bindDn, bindPw } = req.body || {};
  const newConfig = { host, port, starttls, baseDn, bindDn, bindPw };
  config.ldap = newConfig;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  ldapConfig = newConfig;
  res.json({ ok: true });
});

app.post('/refresh', (req, res) => {
  const { refresh } = req.body || {};
  if (!refresh) {
    return res.status(400).json({ error: 'refresh required' });
  }
  try {
    const payload = jwt.verify(refresh, PUBLIC_KEY, {
      algorithms: ['RS256'],
      audience: 'refresh',
      issuer: JWT_ISS,
    });
    const { sub, name, ad_groups } = payload;
    const access = jwt.sign(
      { sub, name, ad_groups, iss: JWT_ISS, aud: 'tactix' },
      PRIVATE_KEY,
      { algorithm: 'RS256', expiresIn: `${ACCESS_TTL_MIN}m` }
    );
    res.json({ access });
  } catch (err) {
    res.status(401).json({ error: 'invalid refresh token' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`auth-service listening on ${PORT}`);
  });
}

module.exports = app;
