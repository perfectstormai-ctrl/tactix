const express = require('express');
const app = express();
app.get('/health', (_req, res) => res.send('incident ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`incident-svc listening on ${PORT}`));
