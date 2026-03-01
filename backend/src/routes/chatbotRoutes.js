const express = require('express');
const { chat, getHistory } = require('../controllers/chatbotController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/chat', optionalAuth, chat);
router.get('/history/:sessionId', optionalAuth, getHistory);

module.exports = router;
