/**
 * knowway Server
 * ===============
 * Main Express.js server entry point.
 * Handles API routing, static file serving, and middleware configuration.
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_KEY: Supabase anon key
 * - JWT_SECRET: Secret key for JWT token signing
 * - PORT: Server port (default: 3000)
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express');  // Web framework
const cors = require('cors');         // Cross-Origin Resource Sharing
const path = require('path');         // File path utilities

// Create Express application instance
const app = express();

// ====================
// MIDDLEWARE SETUP
// ====================

// Enable CORS for all routes (allows frontend to call API from different origin)
app.use(cors());

// Parse JSON request bodies (for POST/PUT requests)
app.use(express.json());

// Initialize Passport for Google OAuth
const { passport } = require('./server/controllers/googleAuthController');
app.use(passport.initialize());

// ====================
// SECURITY MIDDLEWARE
// ====================
// Block access to sensitive files and directories
const blockedPatterns = [
    /\.env/i,
    /\.git/i,
    /\.sql$/i,
    /package\.json$/i,
    /package-lock\.json$/i,
    /node_modules/i,
    /server\//i,
    /n8n-workflows/i,
    /\.md$/i,
    /vercel\.json$/i,
    /config/i
];

app.use((req, res, next) => {
    const requestPath = req.path.toLowerCase();

    // Check if request matches any blocked pattern
    for (const pattern of blockedPatterns) {
        if (pattern.test(requestPath)) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }
    }
    next();
});

// Serve static files from 'public' directory (HTML, CSS, JS, images)
// fallthrough: false ensures we handle missing files ourselves
app.use(express.static(path.join(__dirname, 'public'), {
    fallthrough: true
}));

// Handle missing static files - serve 404 page for any .html request that doesn't exist
app.use((req, res, next) => {
    // If requesting an HTML file that doesn't exist, show 404
    if (req.path.endsWith('.html') || req.path.includes('.')) {
        return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
    next();
});

// ====================
// API ROUTES
// ====================
// Each route file handles a specific feature/resource

// Authentication: register, login, get current user
app.use('/api/auth', require('./server/routes/auth'));

// Course CRUD operations: create, read, update, delete courses
app.use('/api/courses', require('./server/routes/courses'));

// Favorites/Wishlist: add/remove courses from favorites
app.use('/api/favorites', require('./server/routes/favorites'));

// Purchases/Enrollment: enroll in courses
app.use('/api/purchases', require('./server/routes/purchases'));

// User management: get users, update roles (admin)
app.use('/api/users', require('./server/routes/users'));

// Web scraping: trigger n8n webhooks for data scraping
app.use('/api/scraping', require('./server/routes/scraping'));

// File uploads: course images
app.use('/api/uploads', require('./server/routes/upload'));

// Lessons: course content management
app.use('/api/lessons', require('./server/routes/lessons'));

// Progress tracking: mark lessons as complete
app.use('/api/progress', require('./server/routes/progress'));

// Points system: balance, history, purchases
app.use('/api/points', require('./server/routes/points'));

// Quiz system: get/submit quizzes
app.use('/api/quiz', require('./server/routes/quiz'));

// Chat system: course discussion messages
app.use('/api/chat', require('./server/routes/chat'));

// Search logs: admin view of n8n search logs
app.use('/api/search-logs', require('./server/routes/searchLogs'));

// AI Chatbot: proxy for OpenRouter API (keeps API key secure)
app.use('/api/ai-chat', require('./server/routes/aiChat'));

// ====================
// HEALTH CHECK
// ====================
// Simple endpoint to verify server is running (used by monitoring tools)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====================
// 404 CATCH-ALL
// ====================
// Serve 404 page for all unknown routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ====================
// SERVER STARTUP
// ====================
// Only start listening when running locally (not on Vercel serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export app for Vercel serverless deployment
module.exports = app;
