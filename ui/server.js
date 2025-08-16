const express = require('express');
const app = express();
app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/config.js', (_req, res) => {
  const enabled = process.env.ENG_ENABLED === 'true' ? 'true' : 'false';
  res.type('application/javascript').send(`window.ENG_ENABLED=${enabled};`);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ui listening on ${PORT}`));
