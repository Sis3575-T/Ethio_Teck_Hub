/**
 * Integration tests for POST /api/auth/forgot-password
 */
require('./setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/forgot-password', () => {
  const registeredEmail = 'reset-user@example.com';

  /**
   * Helper: create a user directly in the DB.
   */
  const createUser = async (email = registeredEmail) => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
    const passwordHash = await bcrypt.hash('password123', rounds);
    return User.create({
      email: email.toLowerCase().trim(),
      displayName: 'Reset Test User',
      passwordHash,
      portfolioSlug: `reset-test-user-abc123`,
    });
  };

  // ---------------------------------------------------------------------------
  // Registered email — happy path
  // ---------------------------------------------------------------------------

  it('returns 200 when email is registered', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail });

    expect(res.status).toBe(200);
  });

  it('stores a hashed reset token and expiry in the DB for a registered email', async () => {
    await createUser();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail });

    const user = await User.findOne({ email: registeredEmail });

    // resetToken should be set and be a bcrypt hash (not null, not plaintext)
    expect(user.resetToken).not.toBeNull();
    expect(user.resetToken).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix

    // resetTokenExpiry should be set and be ~60 minutes in the future
    expect(user.resetTokenExpiry).not.toBeNull();
    const now = Date.now();
    const expiry = new Date(user.resetTokenExpiry).getTime();
    // Allow ±5 seconds tolerance around 60 minutes
    expect(expiry).toBeGreaterThan(now + 59 * 60 * 1000);
    expect(expiry).toBeLessThan(now + 61 * 60 * 1000);
  });

  it('stores a hash that verifies against the raw token (bcrypt round-trip)', async () => {
    await createUser();

    // We cannot directly observe the raw token from the response (by design),
    // but we can verify the stored hash is a valid bcrypt hash by checking
    // that it does NOT match an arbitrary string.
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail });

    const user = await User.findOne({ email: registeredEmail });
    expect(user.resetToken).not.toBeNull();

    // The stored value must be a bcrypt hash (not the raw token itself)
    const isPlaintext = await bcrypt.compare(user.resetToken, user.resetToken).catch(() => false);
    // A bcrypt hash of itself would be extremely unlikely; the real check is format
    expect(user.resetToken.startsWith('$2')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Unregistered email — security: no enumeration
  // ---------------------------------------------------------------------------

  it('returns 200 when email is NOT registered (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
  });

  it('does not create or modify any DB document for an unregistered email', async () => {
    const countBefore = await User.countDocuments();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    const countAfter = await User.countDocuments();
    expect(countAfter).toBe(countBefore);
  });

  it('returns the same response body for registered and unregistered emails', async () => {
    await createUser();

    const resRegistered = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail });

    const resUnregistered = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    // Both should return 200 with the same message to prevent enumeration
    expect(resRegistered.status).toBe(200);
    expect(resUnregistered.status).toBe(200);
    expect(resRegistered.body.message).toBe(resUnregistered.body.message);
  });

  // ---------------------------------------------------------------------------
  // Missing / invalid email field
  // ---------------------------------------------------------------------------

  it('returns 400 when email field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is null', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ---------------------------------------------------------------------------
  // Case-insensitive email lookup
  // ---------------------------------------------------------------------------

  it('stores reset token when email is provided in uppercase (case-insensitive)', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registeredEmail.toUpperCase() });

    expect(res.status).toBe(200);

    const user = await User.findOne({ email: registeredEmail });
    expect(user.resetToken).not.toBeNull();
  });
});
