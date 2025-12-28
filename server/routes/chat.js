const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// All chat routes require authentication
router.get('/:courseId', auth, chatController.getMessages);
router.post('/:courseId', auth, chatController.sendMessage);

module.exports = router;
