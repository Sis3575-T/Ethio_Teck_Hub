/**
 * Integration tests for POST /api/auth/login
 */
require('./setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/login', () => {
  const validCredentials = {
    email: 'student@example.com',
    password: 'password123',
  };

  // Helper: register a user directly in the DB so we have a known account to log in with
  const createUser = async ({ email = validCredentials.email, password = validCredentials.password, isActive = true } = {}) => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
    const passwordHash = await bcrypt.hash(password, rounds);
    return User.create({
      email: email.toLowerCase().trim(),
      displayName: 'Test Student',
      passwordHash,
      portfolioSlug: `test-student-abc123`,
      isActive,
    });
  };

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns 200 with token, refreshToken, and user on valid credentials', async () => {
    await createUser();

    const res = await request(app).post('/api/auth/login').send(validCredentials);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({
      email: 'student@example.com',
      displayName: 'Test Student',
      role: 'student',
    });
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('portfolioSlug');
  });

  it('issues a JWT signed with JWT_SECRET containing id and role', async () => {
    await createUser();

    const res = await request(app).post('/api/auth/login').send(validCredentials);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', res.body.user.id);
    expect(decoded).toHaveProperty('role', 'student');
  });

  it('JWT expires in 24h', async () => {
    await createUser();

    const res = await request(app).post('/api/auth/login').send(validCredentials);

    const decoded = jwt.decode(res.body.token);
    const lifetimeSeconds = decoded.exp - decoded.iat;
    // Allow a small tolerance (±5 s) around 24 * 3600 = 86400 s
    expect(lifetimeSeconds).toBeGreaterThanOrEqual(86395);
    expect(lifetimeSeconds).toBeLessThanOrEqual(86405);
  });

  it('stores a new hashed refresh token in the DB after login', async () => {
    await createUser();

    const res = await request(app).post('/api/auth/login').send(validCredentials);

    const user = await User.findOne({ email: validCredentials.email });
    expect(user.refreshToken).not.toBeNull();
    // Stored value must be a bcrypt hash, not the raw token
    expect(user.refreshToken).not.toBe(res.body.refreshToken);
    const match = await bcrypt.compare(res.body.refreshToken, user.refreshToken);
    expect(match).toBe(true);
  });

  it('accepts email in any case (case-insensitive lookup)', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'STUDENT@EXAMPLE.COM', password: validCredentials.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('student@example.com');
  });

  // -------------------------------------------------------------------------
  // Wrong password
  // -------------------------------------------------------------------------

  it('returns 401 when password is wrong', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validCredentials.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('does not reveal whether the email or password was wrong (wrong password)', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validCredentials.email, password: 'wrongpassword' });

    // Error message must not mention "password" specifically
    expect(res.body.error.toLowerCase()).not.toMatch(/password/);
  });

  // -------------------------------------------------------------------------
  // Unknown email
  // -------------------------------------------------------------------------

  it('returns 401 when email is not registered', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('does not reveal whether the email or password was wrong (unknown email)', async () => {
    const resUnknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    await createUser();
    const resWrongPw = await request(app)
      .post('/api/auth/login')
      .send({ email: validCredentials.email, password: 'wrongpassword' });

    // Both error messages should be identical to avoid user enumeration
    expect(resUnknown.body.error).toBe(resWrongPw.body.error);
  });

  // -------------------------------------------------------------------------
  // Deactivated account
  // -------------------------------------------------------------------------

  it('returns 401 with "Account deactivated" when isActive is false', async () => {
    await createUser({ isActive: false });

    const res = await request(app).post('/api/auth/login').send(validCredentials);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/account deactivated/i);
  });

  // -------------------------------------------------------------------------
  // Missing fields
  // -------------------------------------------------------------------------

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when both fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
