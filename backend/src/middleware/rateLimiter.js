/**
 * Rate limiting middleware for /api/auth/* routes.
 *
 * Limits each IP to 10 requests per 60-second window.
 * Returns 429 Too Many Requests when the limit is exceeded.
 *
 * In test mode (NODE_ENV=test) the limiter is bypassed so existing
 * integration tests are not affected by the counter state.
 */
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Skip rate limiting entirely in the test environment so that
  // existing test suites are not affected by counter state.
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = authRateLimiter;
