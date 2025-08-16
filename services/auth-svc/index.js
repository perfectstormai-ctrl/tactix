const express = require('express');
const jwt = require('jsonwebtoken');
const ldap = require('ldapjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// LDAP configuration
const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:389';
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'dc=example,dc=com';
// Template used to construct the user's DN from the username
const LDAP_USER_DN = process.env.LDAP_USER_DN || 'uid=${username},' + LDAP_BASE_DN;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

/**
 * Authenticate a user against LDAP and return an array of group names.
 *
 * The function binds to LDAP using the provided credentials and reads the
 * `memberOf` attribute to determine group membership.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string[]>}
 */
function authenticate(username, password) {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });
    const userDN = LDAP_USER_DN.replace('${username}', username);

    client.bind(userDN, password, bindErr => {
      if (bindErr) {
        client.unbind();
        return reject(bindErr);
      }

      // Fetch group memberships from the user's entry
      client.search(
        userDN,
        { scope: 'base', attributes: ['memberOf'] },
        (searchErr, res) => {
          if (searchErr) {
            client.unbind();
            return reject(searchErr);
          }

          const groups = [];
          res.on('searchEntry', entry => {
            const attr = entry.attributes.find(a => a.type === 'memberOf');
            if (attr) {
              attr.values.forEach(v => groups.push(v));
            }
          });
          res.on('error', err => {
            client.unbind();
            reject(err);
          });
          res.on('end', () => {
            client.unbind();
            resolve(groups);
          });
        }
      );
    });
  });
}

/**
 * Middleware to verify JWTs and optionally enforce required groups.
 * @param {string[]} requiredGroups
 */
function authorize(requiredGroups = []) {
  return (req, res, next) => {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.sendStatus(401);

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (
        requiredGroups.length &&
        !requiredGroups.some(g => (payload.groups || []).includes(g))
      ) {
        return res.sendStatus(403);
      }
      req.user = payload;
      next();
    } catch (err) {
      res.sendStatus(401);
    }
  };
}

// Health endpoint
app.get('/health', (_req, res) => res.send('auth ok'));

// Login endpoint – authenticate against LDAP and issue a JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    const groups = await authenticate(username, password);
    const token = jwt.sign({ sub: username, groups }, JWT_SECRET, {
      expiresIn: '1h'
    });
    res.json({ token, groups });
  } catch (err) {
    res.status(401).json({ error: 'invalid credentials' });
  }
});

// Example protected route demonstrating RBAC
app.get('/profile', authorize(), (req, res) => {
  res.json({ user: req.user.sub, groups: req.user.groups || [] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`auth-svc listening on ${PORT}`));
