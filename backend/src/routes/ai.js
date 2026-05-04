const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const { postChat, getHistory } = require('../controllers/aiController');

const router = express.Router();

// POST /api/ai/chat — forward message to AI provider and persist session
router.post('/chat', authenticate, roleGuard('student'), asyncHandler(postChat));

// GET /api/ai/history/:sessionId — get full conversation history
router.get('/history/:sessionId', authenticate, roleGuard('student'), asyncHandler(getHistory));

module.exports = router;
