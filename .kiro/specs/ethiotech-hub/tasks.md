# Tasks Document: EthioTech Hub

## Task List

- [~] 1. Project Setup and Infrastructure
  - [x] 1.1 Initialize monorepo structure with frontend (React Vite) and backend (Node.js/Express) directories
  - [x] 1.2 Configure frontend: Vite, React Router, Tailwind CSS, Framer Motion, React Icons, Axios
  - [x] 1.3 Configure backend: Express, Mongoose, dotenv, cors, helmet, express-rate-limit, xss-clean
  - [x] 1.4 Set up MongoDB connection with Mongoose and environment-based config
  - [x] 1.5 Configure Socket.IO on the Express server
  - [x] 1.6 Set up Jest and fast-check for backend property-based testing
  - [x] 1.7 Set up Vitest and React Testing Library for frontend testing
  - [x] 1.8 Create shared asyncHandler middleware and global error handler
  - [x] 1.9 Set up i18n infrastructure with en.json and am.json translation files

- [x] 2. Authentication and Authorization
  - [x] 2.1 Create User Mongoose model with all fields defined in the data model
  - [x] 2.2 Implement POST /api/auth/register: validate input, hash password with bcrypt, generate portfolioSlug, return JWT + refresh token
  - [x] 2.3 Implement POST /api/auth/login: verify credentials, return signed JWT (24h) and refresh token (7d)
  - [x] 2.4 Implement POST /api/auth/refresh: verify refresh token, rotate tokens, return new pair
  - [x] 2.5 Implement POST /api/auth/forgot-password: generate reset token, store hash + expiry, send email
  - [x] 2.6 Implement POST /api/auth/reset-password: verify token hash and expiry, update password, invalidate token
  - [x] 2.7 Implement JWT verification middleware and role-guard middleware (student / admin)
  - [x] 2.8 Implement rate limiting middleware on all /api/auth/* routes (10 req/IP/min → 429)
  - [x] 2.9 Implement input sanitization middleware (xss-clean) applied globally
  - [x] 2.10 Write property-based tests for auth service
    - [x] 2.10.1 Property 1: password hashing round-trip (hash ≠ plaintext, bcrypt.compare returns true)
    - [x] 2.10.2 Property 2: duplicate email registration always returns 409 and leaves collection unchanged
    - [x] 2.10.3 Property 3: used refresh token is invalidated (token rotation)
    - [x] 2.10.4 Property 4: role-based access invariant (student → 403 on admin routes, admin → not 403)
    - [x] 2.10.5 Property 12: rate limiting returns 429 after 10 requests per IP per minute
  - [x] 2.11 Build Register, Login, and ForgotPassword/ResetPassword React pages with form validation

- [x] 3. Course Catalog and Enrollment
  - [x] 3.1 Create Course and Lesson Mongoose models
  - [x] 3.2 Create Enrollment Mongoose model with compound unique index on (studentId, courseId)
  - [x] 3.3 Implement GET /api/courses with pagination, category filter, and sort options
  - [x] 3.4 Implement GET /api/courses/:id and GET /api/courses/:id/lessons
  - [x] 3.5 Implement POST /api/courses/:id/enroll: create enrollment at 0%, increment enrollmentCount, return 409 on duplicate
  - [x] 3.6 Implement GET /api/lessons/:id with sequential order enforcement
  - [x] 3.7 Implement POST /api/lessons/:id/complete: add lesson to completedLessons, recalculate progressPercent
  - [x] 3.8 Write property-based tests for enrollment and progress
    - [x] 3.8.1 Property 5: enrollment progress is monotonically non-decreasing across arbitrary lesson completion sequences
  - [x] 3.9 Build CourseCatalog page with filter/sort controls and pagination
  - [x] 3.10 Build CourseDetail page with lesson list and enrollment button
  - [x] 3.11 Build LessonViewer with video embed, notes display, and embedded code editor for coding tasks

- [x] 4. Quiz and Assessment System
  - [x] 4.1 Create Quiz and QuizAttempt Mongoose models
  - [x] 4.2 Implement GET /api/quizzes/:courseId to fetch quiz questions
  - [x] 4.3 Implement POST /api/quizzes/:id/submit: grade multiple-choice answers, evaluate coding answers against test cases, record attempt
  - [x] 4.4 Implement countdown timer logic: auto-submit when timer reaches zero
  - [x] 4.5 Implement GET /api/quizzes/history: return student's attempts ordered by timestamp descending
  - [x] 4.6 Build QuizRunner component with timer, question navigation, and submission
  - [x] 4.7 Build quiz results display with per-question feedback

- [~] 5. Leaderboard
  - [-] 5.1 Create Leaderboard Mongoose model
  - [ ] 5.2 Implement leaderboardService.recalculate(studentId): compute composite score (0.4 * courses + 0.4 * testScore + 0.2 * projects, normalized) and update rank
  - [~] 5.3 Trigger leaderboard recalculation after quiz submission, course completion, and project approval
  - [~] 5.4 Implement GET /api/leaderboard: return top 100 students plus requesting student's own rank
  - [~] 5.5 Write property-based test for leaderboard formula
    - [~] 5.5.1 Property 8: compositeScore always equals 0.4*norm(courses) + 0.4*norm(testScore) + 0.2*norm(projects) within floating-point tolerance
  - [~] 5.6 Build Leaderboard page with rank table and student's own rank highlight

- [~] 6. AI Assistant
  - [~] 6.1 Create AISession Mongoose model
  - [~] 6.2 Implement aiService.js with provider abstraction (OpenAI / Gemini switchable via env var)
  - [~] 6.3 Implement POST /api/ai/chat: forward message to AI provider, persist to session, return reply within 10s timeout
  - [~] 6.4 Implement GET /api/ai/history/:sessionId: return full conversation history for the session
  - [~] 6.5 Handle AI provider errors: log internally, return 503 with user-friendly message
  - [~] 6.6 Build AIChatPanel component with message history, input field, and loading state
  - [~] 6.7 Build ConversationHistory list showing past sessions

- [~] 7. Project Submission and Review
  - [~] 7.1 Create Project Mongoose model
  - [~] 7.2 Implement POST /api/projects: validate (title + description + at least one URL), set status to "pending", trigger admin notification
  - [~] 7.3 Implement GET /api/projects/mine: return all submissions for the authenticated student
  - [~] 7.4 Implement PATCH /api/projects/:id/review (admin only): set status, attach comment and optional rating, trigger student notification
  - [~] 7.5 Write property-based tests for project submission
    - [~] 7.5.1 Property 9: any project status transition from "pending" creates a notification record with correct type and payload for the student
  - [~] 7.6 Build ProjectSubmitForm with URL validation and file upload
  - [~] 7.7 Build SubmissionHistory page showing status, rating, and admin comments
  - [~] 7.8 Build admin ProjectReview panel with approve/reject controls and comment field

- [~] 8. Real-Time Chat System
  - [~] 8.1 Create ChatGroup and ChatMessage Mongoose models with indexes
  - [~] 8.2 Seed the 5 default public groups on server startup
  - [~] 8.3 Implement GET /api/chat/groups and GET /api/chat/groups/:id/messages?limit=50
  - [~] 8.4 Implement POST /api/chat/rooms: create private team room with invited members
  - [~] 8.5 Implement Socket.IO chatHandler: join_group, leave_group, send_message, join_room, send_dm events
  - [~] 8.6 Enforce private room access control in Socket.IO handler (emit error if not member)
  - [~] 8.7 Write property-based test for private room access
    - [~] 8.7.1 Property 10: any request from a non-member to a private room returns 403
  - [~] 8.8 Build GroupList sidebar and ChatRoom component with real-time message display
  - [~] 8.9 Build ThreadView for threaded discussion forum mode
  - [~] 8.10 Build private room creation dialog with member invite

- [~] 9. Freelance Marketplace
  - [~] 9.1 Create Job, JobApplication, and FreelanceReview Mongoose models
  - [~] 9.2 Implement GET /api/marketplace/jobs with pagination, category filter, and skills filter
  - [~] 9.3 Implement POST /api/marketplace/jobs: validate required fields, create job, notify matching students
  - [~] 9.4 Implement POST /api/marketplace/jobs/:id/apply: record application, notify client
  - [~] 9.5 Implement PATCH /api/marketplace/jobs/:id/accept/:applicationId: update job status to "in progress", notify student
  - [~] 9.6 Implement PATCH /api/marketplace/jobs/:id/complete: require both parties to confirm, then prompt client for review
  - [~] 9.7 Implement POST /api/marketplace/jobs/:id/review: save FreelanceReview, update student's average rating on Portfolio
  - [~] 9.8 Build JobBoard page with filter controls and paginated job cards
  - [~] 9.9 Build JobDetail page with application form
  - [~] 9.10 Build client job management view (accept applicants, mark complete)

- [~] 10. Portfolio System
  - [~] 10.1 Implement GET /api/portfolio/:studentId (public, no auth required): return displayName, skills, approved projects, certificates, average rating, githubLink
  - [~] 10.2 Implement PATCH /api/portfolio: update skills, githubLink, and projectOrder for authenticated student
  - [~] 10.3 Auto-add approved projects to portfolio when project status changes to "approved"
  - [~] 10.4 Build public PortfolioPage with all required sections
  - [~] 10.5 Build PortfolioEditor for students to reorder projects and update skills/GitHub link

- [~] 11. Notification System
  - [~] 11.1 Create Notification Mongoose model with index on (recipientId, createdAt)
  - [~] 11.2 Implement notificationService.create(recipientId, type, payload): insert notification and emit Socket.IO event to recipient
  - [~] 11.3 Implement GET /api/notifications with pagination (max 100 per page), ordered by timestamp descending
  - [~] 11.4 Implement PATCH /api/notifications/:id/read and PATCH /api/notifications/read-all
  - [~] 11.5 Build NotificationBell component showing unread count badge
  - [~] 11.6 Build NotificationList dropdown/panel with read/unread state

- [~] 12. Certificate System
  - [~] 12.1 Create Certificate Mongoose model with unique verificationCode index
  - [~] 12.2 Implement certificateService.issue(studentId, courseId): generate UUID-based verificationCode, create Certificate record, set Enrollment.certificateIssued = true
  - [~] 12.3 Trigger certificate issuance when all lessons are complete and final quiz score ≥ 70%
  - [~] 12.4 Implement GET /api/certificates/:verificationCode (public): return certificate details for verification
  - [~] 12.5 Implement GET /api/certificates/mine: return all certificates for authenticated student
  - [~] 12.6 Implement GET /api/certificates/:id/pdf: generate and return PDF using a PDF library (e.g., pdfkit)
  - [~] 12.7 Write property-based tests for certificate system
    - [~] 12.7.1 Property 6: any enrollment with all lessons complete and quiz score ≥ 70% has a corresponding Certificate record
    - [~] 12.7.2 Property 7: all generated verificationCodes across N certificates are distinct strings
  - [~] 12.8 Build Certificate display component (shown on Dashboard and Portfolio)
  - [~] 12.9 Build public Certificate verification page at /certificates/:verificationCode

- [~] 13. Student Dashboard
  - [~] 13.1 Implement GET /api/dashboard/stats: aggregate completed lessons, courses in progress, progress %, recent activity, test scores, certificate count, freelance application statuses
  - [~] 13.2 Build StudentDashboard page with progress charts (recharts or chart.js), progress bars, and recent activity feed
  - [~] 13.3 Implement empty-state messages with suggested next actions for all dashboard sections
  - [~] 13.4 Build certificate links section on dashboard

- [~] 14. Admin Dashboard and Content Management
  - [~] 14.1 Implement GET /api/admin/stats: total users, total courses, active jobs, pending project submissions
  - [~] 14.2 Implement admin course CRUD: POST /api/admin/courses, PATCH /api/admin/courses/:id, DELETE /api/admin/courses/:id
  - [~] 14.3 Implement GET /api/admin/users with pagination and PATCH /api/admin/users/:id/deactivate (revoke JWTs)
  - [~] 14.4 Implement PATCH /api/admin/users/:id/promote: change role from "student" to "admin" (admin only)
  - [~] 14.5 Implement DELETE /api/admin/jobs/:id: set job status to "removed", notify all applicants
  - [~] 14.6 Build AdminDashboard with stats cards
  - [~] 14.7 Build UserManager table with deactivate and promote actions
  - [~] 14.8 Build CourseEditor form for creating and editing courses with lesson management

- [~] 15. Input Validation and Security
  - [~] 15.1 Implement Joi/Zod validation schemas for all API request bodies
  - [~] 15.2 Apply validation middleware to all routes; return 400 with field-level error details on failure
  - [~] 15.3 Configure CORS to restrict to configured frontend origin domains
  - [~] 15.4 Ensure HTTPS is enforced in production (redirect HTTP → HTTPS or use reverse proxy config)
  - [~] 15.5 Write property-based tests for input validation
    - [~] 15.5.1 Property 11: any malformed request body (missing required field or wrong type) returns 400 with field-level details and no DB write occurs

- [~] 16. Ethiopian Localization
  - [~] 16.1 Populate en.json with all static UI strings (navigation, labels, system messages)
  - [~] 16.2 Populate am.json with Amharic translations for all strings in en.json
  - [~] 16.3 Build LanguageToggle component that switches the active locale
  - [~] 16.4 Apply Ethiopian-inspired color palette and iconography to Tailwind theme config
  - [~] 16.5 Build Ethiopian Tech News section on the home page consuming a configurable RSS/content API

- [~] 17. End-to-End Integration Tests
  - [~] 17.1 Write integration test: full auth flow (register → login → protected route → refresh)
  - [~] 17.2 Write integration test: course enrollment and progress tracking end-to-end
  - [~] 17.3 Write integration test: project submission → admin review → notification delivery
  - [~] 17.4 Write integration test: job posting → application → acceptance → completion → review
  - [~] 17.5 Write integration test: certificate issuance on course completion
  - [~] 17.6 Write integration test: Socket.IO group messaging with socket.io-client
