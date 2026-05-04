const AISession = require('../models/AISession');
const fetch = require('node-fetch');

const DEFAULT_TIMEOUT_MS = 10000; // 10s

// Provider implementations
const providers = {
  async mock({ message }) {
    // Simple echo-like reply with a small transformation
    return `Echo: ${message}`;
  },
  async openai({ message }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const url = 'https://api.openai.com/v1/chat/completions';
    const body = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }],
      max_tokens: 512,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${txt}`);
    }

    const json = await res.json();
    // Defensive: navigate common response shapes
    const choice = json.choices && json.choices[0];
    return (choice?.message?.content) || String(choice?.text) || '';
  },
};

function selectProvider(name) {
  if (name && providers[name]) return providers[name];
  const env = process.env.AI_PROVIDER;
  if (env && providers[env]) return providers[env];
  return providers.mock;
}

async function callWithTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI provider timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a message to the AI provider, persist to session, and return reply.
 * @param {{ sessionId?: string, userId: ObjectId, message: string }} options
 */
async function chat({ sessionId, userId, message }) {
  if (!message || typeof message !== 'string') throw new Error('message required');

  // Find or create session
  let session = null;
  if (sessionId) session = await AISession.findOne({ sessionId, userId });
  if (!session) {
    // create new sessionId
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    session = await AISession.create({ sessionId, userId, messages: [] });
  }

  // Append user message
  session.messages.push({ role: 'user', text: message, timestamp: new Date() });
  await session.save();

  const providerFn = selectProvider(session.provider || process.env.AI_PROVIDER);

  let replyText;
  try {
    replyText = await callWithTimeout(providerFn({ message, session }), DEFAULT_TIMEOUT_MS);
  } catch (err) {
    // persist an error assistant message and rethrow a generic error
    const errMsg = 'The AI provider failed to respond. Please try again later.';
    session.messages.push({ role: 'assistant', text: errMsg, timestamp: new Date(), meta: { error: err.message } });
    await session.save();
    const e = new Error(errMsg);
    e.cause = err;
    throw e;
  }

  // Persist assistant reply
  session.messages.push({ role: 'assistant', text: replyText, timestamp: new Date() });
  await session.save();

  return { sessionId: session.sessionId, reply: replyText };
}

async function history(sessionId, userId) {
  if (!sessionId) throw new Error('sessionId required');
  const session = await AISession.findOne({ sessionId, userId }).lean();
  if (!session) return null;
  return session.messages || [];
}

module.exports = { chat, history };
