const express = require('express');
const app = express();
app.get('/health', (_req, res) => res.send('tak ingest ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`tak-ingest-svc listening on ${PORT}`));
