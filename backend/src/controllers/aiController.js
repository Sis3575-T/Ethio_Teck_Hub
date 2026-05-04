const aiService = require('../services/aiService');

async function postChat(req, res) {
  const userId = req.user.id;
  const { sessionId, message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const result = await aiService.chat({ sessionId, userId, message });
    return res.json({ sessionId: result.sessionId, reply: result.reply });
  } catch (err) {
    return res.status(503).json({ error: 'AI provider error' });
  }
}

async function getHistory(req, res) {
  const userId = req.user.id;
  const { sessionId } = req.params;
  try {
    const msgs = await aiService.history(sessionId, userId);
    if (!msgs) return res.status(404).json({ error: 'session not found' });
    return res.json({ sessionId, messages: msgs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load session' });
  }
}

module.exports = { postChat, getHistory };
