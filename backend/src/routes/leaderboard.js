const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

// GET /api/leaderboard — top 100 + requesting student's own rank
router.get('/', authenticate, roleGuard('student'), asyncHandler(getLeaderboard));

module.exports = router;
