require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/courses', require('./server/routes/courses'));
app.use('/api/favorites', require('./server/routes/favorites'));
app.use('/api/purchases', require('./server/routes/purchases'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/scraping', require('./server/routes/scraping'));
app.use('/api/uploads', require('./server/routes/upload'));
app.use('/api/lessons', require('./server/routes/lessons'));
app.use('/api/progress', require('./server/routes/progress'));
app.use('/api/points', require('./server/routes/points'));
app.use('/api/quiz', require('./server/routes/quiz'));
app.use('/api/chat', require('./server/routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Start server (only when not on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
