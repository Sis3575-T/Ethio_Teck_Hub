/**
 * Integration tests for POST /api/auth/refresh
 */
require('./setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/refresh', () => {
  /**
   * Helper: create a user in the DB with a known raw refresh token.
   * Returns { user, rawRefreshToken } so tests can call the endpoint directly.
   */
  const createUserWithRefreshToken = async ({
    email = 'refresh@example.com',
    isActive = true,
  } = {}) => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
    const passwordHash = await bcrypt.hash('password123', rounds);

    // Generate a raw refresh token and hash it
    const rawRefreshToken = 'raw-refresh-token-' + Math.random().toString(36).slice(2);
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, rounds);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      displayName: 'Refresh Test User',
      passwordHash,
      portfolioSlug: `refresh-user-${Math.random().toString(36).slice(2, 8)}`,
      isActive,
      refreshToken: refreshTokenHash,
    });

    return { user, rawRefreshToken };
  };

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it('returns 200 with new token and refreshToken on valid refresh token', async () => {
    const { rawRefreshToken } = await createUserWithRefreshToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    // New tokens must be non-empty strings
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('new JWT is signed with JWT_SECRET and contains id and role', async () => {
    const { user, rawRefreshToken } = await createUserWithRefreshToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', user._id.toString());
    expect(decoded).toHaveProperty('role', 'student');
  });

  it('new JWT expires in 24h', async () => {
    const { rawRefreshToken } = await createUserWithRefreshToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });

    const decoded = jwt.decode(res.body.token);
    const lifetimeSeconds = decoded.exp - decoded.iat;
    expect(lifetimeSeconds).toBeGreaterThanOrEqual(86395);
    expect(lifetimeSeconds).toBeLessThanOrEqual(86405);
  });

  it('stores the new hashed refresh token in the DB after rotation', async () => {
    const { user, rawRefreshToken } = await createUserWithRefreshToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.refreshToken).not.toBeNull();
    // Stored value must be a bcrypt hash of the new raw token
    const match = await bcrypt.compare(res.body.refreshToken, updatedUser.refreshToken);
    expect(match).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Token rotation — old token must be rejected after use
  // ---------------------------------------------------------------------------

  it('rejects the old refresh token after rotation (token rotation enforced)', async () => {
    const { rawRefreshToken } = await createUserWithRefreshToken();

    // First use — should succeed
    const firstRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });
    expect(firstRes.status).toBe(200);

    // Second use of the SAME old token — must be rejected
    const secondRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });
    expect(secondRes.status).toBe(401);
    expect(secondRes.body).toHaveProperty('error');
  });

  it('new refresh token from rotation can itself be used successfully', async () => {
    const { rawRefreshToken } = await createUserWithRefreshToken();

    // First rotation
    const firstRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });
    expect(firstRes.status).toBe(200);

    // Use the newly issued refresh token
    const secondRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRes.body.refreshToken });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body).toHaveProperty('token');
    expect(secondRes.body).toHaveProperty('refreshToken');
  });

  // ---------------------------------------------------------------------------
  // Invalid / unknown token
  // ---------------------------------------------------------------------------

  it('returns 401 for an invalid/unknown refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'completely-invalid-token-that-does-not-match-any-user' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/invalid refresh token/i);
  });

  it('returns 401 for a random string that looks like a token', async () => {
    // Create a user so there is at least one candidate in the DB
    await createUserWithRefreshToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token-xyz-987654321' });

    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Deactivated account
  // ---------------------------------------------------------------------------

  it('returns 401 when the account is deactivated', async () => {
    const { rawRefreshToken } = await createUserWithRefreshToken({ isActive: false });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rawRefreshToken });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  // ---------------------------------------------------------------------------
  // Missing / malformed body
  // ---------------------------------------------------------------------------

  it('returns 400 when refreshToken field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when body is sent with no refreshToken field (empty JSON)', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
