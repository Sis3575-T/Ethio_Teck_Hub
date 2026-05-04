/**
 * Integration tests for POST /api/auth/reset-password
 */
require('./setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/reset-password', () => {
  const userEmail = 'reset-pw@example.com';
  const originalPassword = 'original-password-123';
  const newPassword = 'new-secure-password-456';

  /**
   * Helper: create a user with a valid (non-expired) reset token.
   * Returns both the user document and the raw token.
   */
  const createUserWithResetToken = async ({
    email = userEmail,
    expiresInMs = 60 * 60 * 1000, // 60 minutes from now
  } = {}) => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
    const passwordHash = await bcrypt.hash(originalPassword, rounds);

    const rawToken = nanoid(64);
    const tokenHash = await bcrypt.hash(rawToken, rounds);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      displayName: 'Reset PW Test User',
      passwordHash,
      portfolioSlug: `reset-pw-test-${nanoid(6)}`,
      resetToken: tokenHash,
      resetTokenExpiry: new Date(Date.now() + expiresInMs),
    });

    return { user, rawToken };
  };

  // ---------------------------------------------------------------------------
  // Happy path: valid token + valid password
  // ---------------------------------------------------------------------------

  it('returns 200 with success message for a valid token and valid new password', async () => {
    const { rawToken } = await createUserWithResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Password reset successful');
  });

  it('updates the password hash in the DB so the new password can be used to log in', async () => {
    const { rawToken } = await createUserWithResetToken();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });

    // Verify the new password works for login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: newPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
  });

  it('clears resetToken and resetTokenExpiry after a successful reset', async () => {
    const { rawToken } = await createUserWithResetToken();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });

    const user = await User.findOne({ email: userEmail });
    expect(user.resetToken).toBeNull();
    expect(user.resetTokenExpiry).toBeNull();
  });

  it('old password no longer works after a successful reset', async () => {
    const { rawToken } = await createUserWithResetToken();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: originalPassword });

    expect(loginRes.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Expired token
  // ---------------------------------------------------------------------------

  it('returns 400 for an expired reset token', async () => {
    // Token expired 1 second ago
    const { rawToken } = await createUserWithResetToken({ expiresInMs: -1000 });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid or expired reset token');
  });

  // ---------------------------------------------------------------------------
  // Already-used token (token cleared after first use)
  // ---------------------------------------------------------------------------

  it('returns 400 when the same token is used a second time (already invalidated)', async () => {
    const { rawToken } = await createUserWithResetToken();

    // First use — should succeed
    const firstRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword });
    expect(firstRes.status).toBe(200);

    // Second use — token is now cleared, should fail
    const secondRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'another-password-789' });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toHaveProperty('error', 'Invalid or expired reset token');
  });

  // ---------------------------------------------------------------------------
  // Invalid / unknown token
  // ---------------------------------------------------------------------------

  it('returns 400 for a completely unknown/random token', async () => {
    await createUserWithResetToken(); // user exists but token won't match

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: nanoid(64), newPassword });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid or expired reset token');
  });

  it('returns 400 when no user has any reset token set', async () => {
    // Create a user without a reset token
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
    const passwordHash = await bcrypt.hash(originalPassword, rounds);
    await User.create({
      email: userEmail,
      displayName: 'No Token User',
      passwordHash,
      portfolioSlug: `no-token-${nanoid(6)}`,
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: nanoid(64), newPassword });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid or expired reset token');
  });

  // ---------------------------------------------------------------------------
  // Password too short
  // ---------------------------------------------------------------------------

  it('returns 400 when newPassword is fewer than 8 characters', async () => {
    const { rawToken } = await createUserWithResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('does not update the password when newPassword is too short', async () => {
    const { rawToken } = await createUserWithResetToken();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'short' });

    // Original password should still work
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: originalPassword });

    expect(loginRes.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Missing fields
  // ---------------------------------------------------------------------------

  it('returns 400 when token field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when newPassword field is missing', async () => {
    const { rawToken } = await createUserWithResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when both fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when token is null', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: null, newPassword });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when newPassword is null', async () => {
    const { rawToken } = await createUserWithResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
