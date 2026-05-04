/**
 * Role-guard middleware factory.
 *
 * Usage:
 *   router.get('/admin/stats', authenticate, roleGuard('admin'), handler);
 *   router.get('/courses',     authenticate, roleGuard('student'), handler);
 *
 * Rules:
 *   - 'admin' role passes both admin-level and student-level routes.
 *   - 'student' role is rejected on admin-level routes (403 Forbidden).
 *
 * @param {'student' | 'admin'} requiredRole
 * @returns {import('express').RequestHandler}
 */
const roleGuard = (requiredRole) => (req, res, next) => {
  const userRole = req.user && req.user.role;

  // Admins can access everything
  if (userRole === 'admin') {
    return next();
  }

  // For any other role, it must exactly match the required role
  if (userRole === requiredRole) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: insufficient role' });
};

module.exports = roleGuard;
