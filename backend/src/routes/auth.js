/**
 * Auth routes — mounted at /api/auth
 */
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { register, login, refresh, forgotPassword, resetPassword } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', asyncHandler(register));

// POST /api/auth/login
router.post('/login', asyncHandler(login));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(refresh));

// POST /api/auth/forgot-password
router.post('/forgot-password', asyncHandler(forgotPassword));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(resetPassword));

module.exports = router;
