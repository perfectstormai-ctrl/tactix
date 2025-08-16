const express = require('express');
const app = express();
app.get('/health', (_req, res) => res.send('auth ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`auth-svc listening on ${PORT}`));
