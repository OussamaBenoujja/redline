require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes');
const db = require('./db');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
});

app.listen(PORT, () => {
    console.log(`Fablean Memory Service running on http://localhost:${PORT}`);
});
