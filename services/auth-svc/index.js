const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// Simple in-memory LDAP mock
// username -> { password, roles }
const USERS = {
  alice: { password: 'password123', roles: ['admin'] },
  bob: { password: 'password', roles: ['user'] }
};

/**
 * Authenticate a user against the LDAP mock and return roles.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<string[]>}
 */
function authenticate(username, password) {
  return new Promise((resolve, reject) => {
    const user = USERS[username];
    if (!user || user.password !== password) {
      return reject(new Error('invalid credentials'));
    }
    resolve(user.roles);
  });
}

// Health endpoint
app.get('/health', (_req, res) => res.send('auth ok'));

// Login endpoint – issue access and refresh tokens
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    const roles = await authenticate(username, password);
    const token = jwt.sign({ sub: username, roles }, JWT_SECRET, {
      expiresIn: '15m'
    });
    const refreshToken = jwt.sign(
      { sub: username, roles, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, refreshToken, roles });
  } catch (err) {
    res.status(401).json({ error: 'invalid credentials' });
  }
});

// Refresh endpoint – validate refresh token and issue new tokens
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken required' });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('invalid token');

    const { sub, roles } = payload;
    const token = jwt.sign({ sub, roles }, JWT_SECRET, {
      expiresIn: '15m'
    });
    const newRefreshToken = jwt.sign(
      { sub, roles, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, refreshToken: newRefreshToken, roles });
  } catch (err) {
    res.status(401).json({ error: 'invalid refresh token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`auth-svc listening on ${PORT}`));

