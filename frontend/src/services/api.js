import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach JWT from localStorage to every outgoing request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────────────────────────
// On 401: clear auth state and redirect to /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API functions ───────────────────────────────────────────────────────

/**
 * Register a new student account.
 * @param {{ displayName: string, email: string, password: string }} data
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * Log in with email + password.
 * @param {{ email: string, password: string }} data
 */
export const login = (data) => api.post('/auth/login', data);

/**
 * Request a password-reset email.
 * @param {{ email: string }} data
 */
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);

/**
 * Submit a new password using the reset token from the email link.
 * @param {{ token: string, newPassword: string }} data
 */
export const resetPassword = (data) => api.post('/auth/reset-password', data);

// ─── Course API functions ─────────────────────────────────────────────────────

/**
 * Fetch paginated course catalog.
 * @param {{ page?: number, limit?: number, category?: string, sort?: string }} params
 */
export const getCourses = (params) => api.get('/courses', { params });

/**
 * Fetch a single course by ID.
 * @param {string} id - Course ObjectId
 */
export const getCourseById = (id) => api.get(`/courses/${id}`);

/**
 * Fetch ordered lesson list for a course.
 * @param {string} id - Course ObjectId
 */
export const getCourseLessons = (id) => api.get(`/courses/${id}/lessons`);

/**
 * Enroll the authenticated student in a course.
 * @param {string} id - Course ObjectId
 */
export const enrollInCourse = (id) => api.post(`/courses/${id}/enroll`);

/**
 * Fetch a single lesson by ID.
 * @param {string} id - Lesson ObjectId
 */
export const getLessonById = (id) => api.get(`/lessons/${id}`);

/**
 * Mark a lesson as complete for the authenticated student.
 * @param {string} id - Lesson ObjectId
 */
export const completeLesson = (id) => api.post(`/lessons/${id}/complete`);

// ─── Quiz API functions ───────────────────────────────────────────────────────

/**
 * Fetch all quizzes for a course (correctIndex stripped server-side).
 * @param {string} courseId - Course ObjectId
 */
export const getQuizzesByCourse = (courseId) => api.get(`/quizzes/${courseId}`);

/**
 * Submit a quiz attempt for grading.
 * @param {string} quizId - Quiz ObjectId
 * @param {{ answers: Array, timeTakenSeconds: number }} data
 */
export const submitQuiz = (quizId, data) => api.post(`/quizzes/${quizId}/submit`, data);

/**
 * Fetch the authenticated student's quiz attempt history.
 */
export const getQuizHistory = () => api.get('/quizzes/history');

// ─── Leaderboard API ───────────────────────────────────────────────────────
/**
 * Fetch top 100 leaderboard entries and requesting student's own rank.
 */
export const getLeaderboard = () => api.get('/leaderboard');

// ─── AI API ────────────────────────────────────────────────────────────────
export const postAIChat = (data) => api.post('/ai/chat', data);
export const getAIHistory = (sessionId) => api.get(`/ai/history/${sessionId}`);

export default api;
