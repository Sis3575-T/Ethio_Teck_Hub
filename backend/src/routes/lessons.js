/**
 * Lesson routes — mounted at /api/lessons
 */
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const { getLessonById, completeLesson } = require('../controllers/courseController');

const router = express.Router();

// GET /api/lessons/:id — single lesson (enforces sequential order)
router.get('/:id', authenticate, roleGuard('student'), asyncHandler(getLessonById));

// POST /api/lessons/:id/complete — mark lesson complete, update progress
router.post('/:id/complete', authenticate, roleGuard('student'), asyncHandler(completeLesson));

module.exports = router;
