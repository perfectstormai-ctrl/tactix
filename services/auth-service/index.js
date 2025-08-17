require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
const JWT_ISS = process.env.JWT_ISS || 'tactix-auth';
const ACCESS_TTL_MIN = Number(process.env.ACCESS_TTL_MIN || '15');
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || '7');
const LDAP_URL = process.env.LDAP_URL;
const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
const LDAP_BIND_PW = process.env.LDAP_BIND_PW;
const LDAP_USER_BASE = process.env.LDAP_USER_BASE;
const LDAP_USER_FILTER = process.env.LDAP_USER_FILTER || '(uid={upn})';

function ldapAuthenticate(upn, password) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });
    client.bind(LDAP_BIND_DN, LDAP_BIND_PW, (err) => {
      if (err) {
        client.unbind();
        return reject(err);
      }
      const filter = LDAP_USER_FILTER.replace(/\{upn\}/g, upn);
      const opts = { filter, scope: 'sub', attributes: ['dn', 'memberOf', 'cn'] };
      client.search(LDAP_USER_BASE, opts, (err, res) => {
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

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/login', async (req, res) => {
  const { upn, password } = req.body || {};
  if (!upn || !password) {
    return res.status(400).json({ error: 'upn and password required' });
  }
  try {
    const { ad_groups, name } = await ldapAuthenticate(upn, password);
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

app.listen(PORT, () => {
  console.log(`auth-service listening on ${PORT}`);
});
