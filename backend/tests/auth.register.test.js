/**
 * Integration tests for POST /api/auth/register
 */
require('./setup');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');

describe('POST /api/auth/register', () => {
  const validPayload = {
    email: 'student@example.com',
    displayName: 'Test Student',
    password: 'password123',
  };

  it('returns 201 with token, refreshToken, and user on valid input', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(201);
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

  it('stores a bcrypt hash of the password (not plaintext)', async () => {
    await request(app).post('/api/auth/register').send(validPayload);

    const user = await User.findOne({ email: validPayload.email });
    expect(user).not.toBeNull();
    expect(user.passwordHash).not.toBe(validPayload.password);
    const match = await bcrypt.compare(validPayload.password, user.passwordHash);
    expect(match).toBe(true);
  });

  it('stores a bcrypt hash of the refresh token (not plaintext)', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    const user = await User.findOne({ email: validPayload.email });
    expect(user.refreshToken).not.toBeNull();
    // The stored value should be a bcrypt hash, not the raw token
    expect(user.refreshToken).not.toBe(res.body.refreshToken);
    const match = await bcrypt.compare(res.body.refreshToken, user.refreshToken);
    expect(match).toBe(true);
  });

  it('generates a portfolioSlug containing a slugified displayName', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    const slug = res.body.user.portfolioSlug;
    expect(slug).toMatch(/^test-student-/);
  });

  it('issues a JWT signed with JWT_SECRET that contains id and role', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', res.body.user.id);
    expect(decoded).toHaveProperty('role', 'student');
  });

  it('returns 409 when email already exists', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 409 regardless of displayName or password when email is duplicate', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send({
      email: validPayload.email,
      displayName: 'Different Name',
      password: 'differentpassword',
    });

    expect(res.status).toBe(409);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ displayName: 'Test', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when displayName is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', displayName: 'Test', password: 'short' });

    expect(res.status).toBe(400);
  });

  it('does not write to DB when validation fails', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', displayName: 'Test', password: 'short' });

    const count = await User.countDocuments();
    expect(count).toBe(0);
  });

  it('normalizes email to lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'UPPER@EXAMPLE.COM', displayName: 'Test', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('upper@example.com');
  });
});
