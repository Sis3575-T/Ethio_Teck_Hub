/**
 * Integration tests for Quiz API endpoints
 *
 * Covers tasks 4.2 – 4.5:
 *   GET  /api/quizzes/history
 *   GET  /api/quizzes/:courseId
 *   POST /api/quizzes/:id/submit
 */
require('./setup');

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Course = require('../src/models/Course');
const Quiz = require('../src/models/Quiz');
const QuizAttempt = require('../src/models/QuizAttempt');
const User = require('../src/models/User');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeToken = (userId, role = 'student') =>
  jwt.sign({ id: userId.toString(), role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

const createUser = async (overrides = {}) => {
  const user = await User.create({
    email: overrides.email || `user-${Date.now()}-${Math.random()}@example.com`,
    displayName: overrides.displayName || 'Test User',
    passwordHash: 'hashed',
    portfolioSlug: `slug-${Date.now()}-${Math.random()}`,
    role: overrides.role || 'student',
    isActive: true,
    ...overrides,
  });
  const token = makeToken(user._id, user.role);
  return { user, token };
};

const createCourse = async (overrides = {}) =>
  Course.create({
    title: overrides.title || 'Test Course',
    description: overrides.description || 'A test course',
    category: overrides.category || 'Web Development',
    instructorName: 'Instructor',
    isPublished: true,
    ...overrides,
  });

/**
 * Creates a quiz with a mix of multiple-choice and coding questions.
 */
const createQuiz = async (courseId, overrides = {}) =>
  Quiz.create({
    courseId,
    title: overrides.title || 'Test Quiz',
    durationSeconds: overrides.durationSeconds || 300,
    isFinal: overrides.isFinal || false,
    questions: overrides.questions || [
      {
        text: 'What is 2 + 2?',
        type: 'multiple-choice',
        options: ['3', '4', '5', '6'],
        correctIndex: 1, // '4'
      },
      {
        text: 'What is the output of print("hello")?',
        type: 'coding',
        testCases: [{ input: '', expectedOutput: 'hello' }],
      },
    ],
  });

// ---------------------------------------------------------------------------
// GET /api/quizzes/history
// ---------------------------------------------------------------------------

describe('GET /api/quizzes/history', () => {
  let user, token;

  beforeEach(async () => {
    const result = await createUser();
    user = result.user;
    token = result.token;
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/quizzes/history');
    expect(res.status).toBe(401);
  });

  it('returns empty array when student has no attempts', async () => {
    const res = await request(app)
      .get('/api/quizzes/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns attempts ordered by submittedAt descending', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Create two attempts with different timestamps
    const earlier = new Date('2024-01-01T10:00:00Z');
    const later = new Date('2024-01-02T10:00:00Z');

    await QuizAttempt.create({
      studentId: user._id,
      quizId: quiz._id,
      score: 50,
      timeTakenSeconds: 120,
      answers: [1, 'hello'],
      submittedAt: earlier,
    });

    await QuizAttempt.create({
      studentId: user._id,
      quizId: quiz._id,
      score: 100,
      timeTakenSeconds: 60,
      answers: [1, 'hello'],
      submittedAt: later,
    });

    const res = await request(app)
      .get('/api/quizzes/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Most recent first
    expect(new Date(res.body[0].submittedAt).getTime()).toBeGreaterThan(
      new Date(res.body[1].submittedAt).getTime()
    );
  });

  it('only returns attempts for the authenticated student', async () => {
    const { user: otherUser } = await createUser();
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Attempt by other user
    await QuizAttempt.create({
      studentId: otherUser._id,
      quizId: quiz._id,
      score: 80,
      timeTakenSeconds: 100,
      answers: [],
    });

    const res = await request(app)
      .get('/api/quizzes/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/quizzes/:courseId
// ---------------------------------------------------------------------------

describe('GET /api/quizzes/:courseId', () => {
  let token;

  beforeEach(async () => {
    const { token: t } = await createUser();
    token = t;
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await request(app).get(`/api/quizzes/${course._id}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when course does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/quizzes/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns empty array when course has no quizzes', async () => {
    const course = await createCourse();
    const res = await request(app)
      .get(`/api/quizzes/${course._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns quizzes for the course', async () => {
    const course = await createCourse();
    await createQuiz(course._id, { title: 'Quiz 1' });
    await createQuiz(course._id, { title: 'Quiz 2' });

    const res = await request(app)
      .get(`/api/quizzes/${course._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('strips correctIndex from multiple-choice questions', async () => {
    const course = await createCourse();
    await createQuiz(course._id);

    const res = await request(app)
      .get(`/api/quizzes/${course._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const questions = res.body[0].questions;
    questions.forEach((q) => {
      expect(q).not.toHaveProperty('correctIndex');
    });
  });

  it('strips testCases from coding questions', async () => {
    const course = await createCourse();
    await createQuiz(course._id);

    const res = await request(app)
      .get(`/api/quizzes/${course._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const questions = res.body[0].questions;
    questions.forEach((q) => {
      expect(q).not.toHaveProperty('testCases');
    });
  });

  it('allows admin to access quiz list', async () => {
    const { token: adminToken } = await createUser({ role: 'admin' });
    const course = await createCourse();
    await createQuiz(course._id);

    const res = await request(app)
      .get(`/api/quizzes/${course._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/quizzes/:id/submit
// ---------------------------------------------------------------------------

describe('POST /api/quizzes/:id/submit', () => {
  let user, token;

  beforeEach(async () => {
    const result = await createUser();
    user = result.user;
    token = result.token;
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .send({ answers: [1, 'hello'], timeTakenSeconds: 60 });

    expect(res.status).toBe(401);
  });

  it('returns 404 when quiz does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/quizzes/${fakeId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [], timeTakenSeconds: 0 });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when answers is not an array', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: 'not-an-array', timeTakenSeconds: 60 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('grades all correct answers as 100%', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Correct: index 1 for MC, 'hello' for coding
    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 'hello'], timeTakenSeconds: 60 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(100);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0].correct).toBe(true);
    expect(res.body.results[1].correct).toBe(true);
  });

  it('grades all wrong answers as 0%', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Wrong: index 0 for MC (correct is 1), 'world' for coding (correct is 'hello')
    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [0, 'world'], timeTakenSeconds: 60 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.results[0].correct).toBe(false);
    expect(res.body.results[1].correct).toBe(false);
  });

  it('grades partial answers correctly (50%)', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Correct MC, wrong coding
    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 'wrong'], timeTakenSeconds: 90 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(50);
    expect(res.body.results[0].correct).toBe(true);
    expect(res.body.results[1].correct).toBe(false);
  });

  it('returns correctAnswer in results', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [0, 'wrong'], timeTakenSeconds: 60 });

    expect(res.status).toBe(200);
    // MC: correctAnswer is the index (1)
    expect(res.body.results[0].correctAnswer).toBe(1);
    // Coding: correctAnswer is the expected output string
    expect(res.body.results[1].correctAnswer).toBe('hello');
  });

  it('creates a QuizAttempt record in the database', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1, 'hello'], timeTakenSeconds: 45 });

    expect(res.status).toBe(200);
    expect(res.body.attempt).toBeDefined();
    expect(res.body.attempt.studentId.toString()).toBe(user._id.toString());
    expect(res.body.attempt.quizId.toString()).toBe(quiz._id.toString());
    expect(res.body.attempt.score).toBe(100);
    expect(res.body.attempt.timeTakenSeconds).toBe(45);

    // Verify it was persisted
    const saved = await QuizAttempt.findById(res.body.attempt._id);
    expect(saved).not.toBeNull();
    expect(saved.score).toBe(100);
  });

  it('handles empty quiz (0 questions) with score 0', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id, { questions: [] });

    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [], timeTakenSeconds: 0 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.results).toHaveLength(0);
  });

  it('handles missing answers for some questions (null treated as wrong)', async () => {
    const course = await createCourse();
    const quiz = await createQuiz(course._id);

    // Only provide answer for first question
    const res = await request(app)
      .post(`/api/quizzes/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ answers: [1], timeTakenSeconds: 30 });

    expect(res.status).toBe(200);
    // First question correct (50%), second undefined → wrong
    expect(res.body.score).toBe(50);
    expect(res.body.results[0].correct).toBe(true);
    expect(res.body.results[1].correct).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Route ordering: /history must not be captured by /:courseId
// ---------------------------------------------------------------------------

describe('Route ordering: /history vs /:courseId', () => {
  it('GET /api/quizzes/history is not treated as a courseId lookup', async () => {
    const { token } = await createUser();

    const res = await request(app)
      .get('/api/quizzes/history')
      .set('Authorization', `Bearer ${token}`);

    // Should return 200 with an array, not 404 (course not found)
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
