/**
 * Integration tests for authenticate and roleGuard middleware.
 *
 * Tests are run against a lightweight Express app that mounts two
 * protected routes:
 *   GET /protected/student  — requires authenticate + roleGuard('student')
 *   GET /protected/admin    — requires authenticate + roleGuard('admin')
 */
require('./setup');

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const authenticate = require('../src/middleware/authenticate');
const roleGuard = require('../src/middleware/roleGuard');

// ---------------------------------------------------------------------------
// Minimal test app
// ---------------------------------------------------------------------------

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.get('/protected/student', authenticate, roleGuard('student'), (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  app.get('/protected/admin', authenticate, roleGuard('admin'), (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  return app;
};

const app = buildApp();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Creates a real user in the in-memory DB and returns a signed JWT for them.
 */
const createUserAndToken = async ({
  role = 'student',
  isActive = true,
  expiresIn = '1h',
} = {}) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
  const passwordHash = await bcrypt.hash('password123', rounds);
  const user = await User.create({
    email: `${role}-${Date.now()}@example.com`,
    displayName: `Test ${role}`,
    passwordHash,
    portfolioSlug: `test-${role}-${Date.now()}`,
    role,
    isActive,
  });

  const token = jwt.sign({ id: user._id.toString(), role }, JWT_SECRET, { expiresIn });
  return { user, token };
};

// ---------------------------------------------------------------------------
// authenticate middleware
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
  it('populates req.user and calls next() for a valid JWT', async () => {
    const { token } = await createUserAndToken({ role: 'student' });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('role', 'student');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/protected/student');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const { token } = await createUserAndToken();

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', token); // missing "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for an invalid / malformed token', async () => {
    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    const badToken = jwt.sign({ id: 'fakeid', role: 'student' }, 'wrong-secret', {
      expiresIn: '1h',
    });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for an expired token', async () => {
    const { token } = await createUserAndToken({ expiresIn: '-1s' }); // already expired

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when the user account is deactivated (isActive === false)', async () => {
    const { token } = await createUserAndToken({ isActive: false });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when the user no longer exists in the DB', async () => {
    // Sign a token for a non-existent ObjectId
    const fakeId = '000000000000000000000001';
    const token = jwt.sign({ id: fakeId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// roleGuard middleware
// ---------------------------------------------------------------------------

describe('roleGuard middleware', () => {
  it('returns 403 when a student JWT is used on an admin route', async () => {
    const { token } = await createUserAndToken({ role: 'student' });

    const res = await request(app)
      .get('/protected/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('allows an admin JWT on an admin route', async () => {
    const { token } = await createUserAndToken({ role: 'admin' });

    const res = await request(app)
      .get('/protected/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toHaveProperty('role', 'admin');
  });

  it('allows an admin JWT on a student route (admin can access everything)', async () => {
    const { token } = await createUserAndToken({ role: 'admin' });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows a student JWT on a student route', async () => {
    const { token } = await createUserAndToken({ role: 'student' });

    const res = await request(app)
      .get('/protected/student')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
