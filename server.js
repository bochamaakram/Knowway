require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./server/config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/courses', require('./server/routes/courses'));
app.use('/api/favorites', require('./server/routes/favorites'));
app.use('/api/purchases', require('./server/routes/purchases'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/scraping', require('./server/routes/scraping'));
app.use('/api/upload', require('./server/routes/upload'));
app.use('/api/lessons', require('./server/routes/lessons'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
