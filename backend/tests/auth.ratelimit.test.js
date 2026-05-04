/**
 * Integration tests for rate limiting on /api/auth/* routes.
 *
 * Property 12: Rate Limiting Returns 429 After Threshold
 * Validates: Requirements 16.3
 *
 * The production rate limiter skips in NODE_ENV=test so other test suites
 * are unaffected. These tests build a minimal Express app that mounts the
 * same auth router behind a rate limiter configured with skip=false, so we
 * can exercise the real limiter logic without touching NODE_ENV.
 */
require('./setup');

const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');
const authRouter = require('../src/routes/auth');
const errorHandler = require('../src/middleware/errorHandler');

/**
 * Build a test app with rate limiting always enabled (no skip).
 * We use a fresh MemoryStore per test so counters don't bleed between tests.
 */
function buildRateLimitedApp() {
  const app = express();
  app.set('trust proxy', 1); // honour X-Forwarded-For

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    // No skip — rate limiting is always active in this test app
  });

  app.use('/api/auth', limiter, authRouter);
  app.use(errorHandler);

  return app;
}

describe('Rate limiting on /api/auth/* routes', () => {
  /**
   * Fire n sequential requests to POST /api/auth/login from a given IP.
   * Returns an array of HTTP status codes.
   */
  const fireRequests = async (app, n, ip) => {
    const statuses = [];
    for (let i = 0; i < n; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'test@example.com', password: 'password123' });
      statuses.push(res.status);
    }
    return statuses;
  };

  it('allows the first 10 requests without returning 429', async () => {
    const app = buildRateLimitedApp();
    const statuses = await fireRequests(app, 10, '10.0.0.1');
    // None of the first 10 should be rate-limited
    expect(statuses.every((s) => s !== 429)).toBe(true);
  });

  it('returns 429 on the 11th request from the same IP', async () => {
    const app = buildRateLimitedApp();
    const statuses = await fireRequests(app, 11, '10.0.0.2');
    // The 11th request must be 429
    expect(statuses[10]).toBe(429);
  });

  it('returns 429 for all requests beyond the 10th', async () => {
    const app = buildRateLimitedApp();
    const statuses = await fireRequests(app, 13, '10.0.0.3');
    // Requests 11, 12, 13 (indices 10, 11, 12) must all be 429
    expect(statuses[10]).toBe(429);
    expect(statuses[11]).toBe(429);
    expect(statuses[12]).toBe(429);
  });
});
