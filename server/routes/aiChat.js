const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');

// AI Chat proxy - no auth required for public chatbot
router.post('/completions', aiChatController.chatCompletion);

// N8N AI Agent proxy - keeps webhook URL hidden
router.post('/n8n', aiChatController.n8nChatProxy);

module.exports = router;
