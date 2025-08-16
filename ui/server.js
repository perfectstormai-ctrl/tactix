const express = require('express');
require('dotenv').config();
const app = express();
app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.send('ui ok'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ui listening on ${PORT}`));
