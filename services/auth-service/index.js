require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
const LDAP_URL = process.env.LDAP_URL;
const LDAP_BIND_DN = process.env.LDAP_BIND_DN;
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD;
const LDAP_BASE_DN = process.env.LDAP_BASE_DN;
const ROLE_MAP = process.env.LDAP_ROLE_MAP ? JSON.parse(process.env.LDAP_ROLE_MAP) : {};

function ldapAuthenticate(upn, password) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });
    client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        client.unbind();
        return reject(err);
      }
      const opts = {
        filter: `(userPrincipalName=${upn})`,
        scope: 'sub',
        attributes: ['dn', 'memberOf']
      };
      client.search(LDAP_BASE_DN, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }
        let userDn = null;
        let groups = [];
        res.on('searchEntry', (entry) => {
          userDn = entry.objectName || entry.dn;
          const member = entry.attributes.find(a => a.type === 'memberOf');
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
            const roles = [];
            for (const g of groups) {
              if (ROLE_MAP[g]) roles.push(ROLE_MAP[g]);
            }
            client.unbind();
            resolve(roles);
          });
        });
      });
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/auth/login', async (req, res) => {
  const { upn, password } = req.body || {};
  if (!upn || !password) {
    return res.status(400).json({ error: 'upn and password required' });
  }
  try {
    const roles = await ldapAuthenticate(upn, password);
    const accessToken = jwt.sign({ sub: upn, roles }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign({ sub: upn, roles, type: 'refresh' }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '7d'
    });
    res.json({ accessToken, refreshToken, roles });
  } catch (err) {
    res.status(401).json({ error: 'invalid credentials' });
  }
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken required' });
  }
  try {
    const payload = jwt.verify(refreshToken, PUBLIC_KEY, { algorithms: ['RS256'] });
    if (payload.type !== 'refresh') throw new Error('invalid token');
    const { sub, roles } = payload;
    const accessToken = jwt.sign({ sub, roles }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '15m'
    });
    const newRefreshToken = jwt.sign({ sub, roles, type: 'refresh' }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '7d'
    });
    res.json({ accessToken, refreshToken: newRefreshToken, roles });
  } catch (err) {
    res.status(401).json({ error: 'invalid refresh token' });
  }
});

app.listen(PORT, () => {
  console.log(`auth-service listening on ${PORT}`);
});
