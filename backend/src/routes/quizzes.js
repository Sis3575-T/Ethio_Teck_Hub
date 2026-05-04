/**
 * Quiz routes — mounted at /api/quizzes
 *
 * IMPORTANT: /history must be registered BEFORE /:courseId to avoid route conflicts.
 */
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const {
  getQuizHistory,
  getQuizzesByCourse,
  submitQuiz,
} = require('../controllers/quizController');

const router = express.Router();

// GET /api/quizzes/history — student's attempt history (must be before /:courseId)
router.get(
  '/history',
  authenticate,
  roleGuard('student'),
  asyncHandler(getQuizHistory)
);

// GET /api/quizzes/:courseId — all quizzes for a course (correctIndex stripped)
router.get(
  '/:courseId',
  authenticate,
  roleGuard('student'),
  asyncHandler(getQuizzesByCourse)
);

// POST /api/quizzes/:id/submit — grade and record a quiz attempt
router.post(
  '/:id/submit',
  authenticate,
  roleGuard('student'),
  asyncHandler(submitQuiz)
);

module.exports = router;
