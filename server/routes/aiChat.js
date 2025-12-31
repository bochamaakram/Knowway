const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');

// AI Chat proxy - no auth required for public chatbot
router.post('/completions', aiChatController.chatCompletion);

module.exports = router;
