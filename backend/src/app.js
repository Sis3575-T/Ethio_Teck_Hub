const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const lessonsRouter = require('./routes/lessons');
const quizzesRouter = require('./routes/quizzes');
const leaderboardRouter = require('./routes/leaderboard');
const aiRouter = require('./routes/ai');
const authRateLimiter = require('./middleware/rateLimiter');
const sanitize = require('./middleware/sanitize');

const app = express();

// Security middleware
app.use(helmet());

// Core middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// XSS sanitization — applied globally after body parsing
app.use(sanitize);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EthioTech Hub API is running' });
});

// Routes
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/ai', aiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
