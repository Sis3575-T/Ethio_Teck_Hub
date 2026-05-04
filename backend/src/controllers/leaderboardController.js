const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const leaderboardService = require('../services/leaderboardService');

async function getLeaderboard(req, res) {
  const requesterId = req.user.id;

  // Ensure requester has a leaderboard entry
  const requesterEntry = await Leaderboard.findOne({ studentId: requesterId });
  if (!requesterEntry) {
    // Recalculate on-demand for the requester if missing
    // ignore errors and continue
    try {
      // eslint-disable-next-line no-unused-vars
      await leaderboardService.recalculate(requesterId);
    } catch (err) {
      // continue
    }
  }

  // Top 100
  const top = await Leaderboard.find()
    .sort({ compositeScore: -1 })
    .limit(100)
    .populate('studentId', 'displayName')
    .lean();

  // Fetch requester's entry to include even if not in top100
  const me = await Leaderboard.findOne({ studentId: requesterId }).populate('studentId', 'displayName').lean();

  const response = { top: top.map((e, idx) => ({
    rank: e.rank || idx + 1,
    studentId: e.studentId._id,
    displayName: e.studentId.displayName,
    compositeScore: e.compositeScore,
  })),
  };

  if (me) {
    // If me not in top list, include own entry under `me`
    const inTop = top.some((t) => String(t.studentId._id) === String(me.studentId._id));
    response.me = {
      rank: me.rank || null,
      studentId: me.studentId._id,
      displayName: me.studentId.displayName,
      compositeScore: me.compositeScore,
    };
    if (!inTop) {
      // optionally include position if not in top
    }
  }

  return res.json(response);
}

module.exports = { getLeaderboard };
