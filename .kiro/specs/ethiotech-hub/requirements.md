# Requirements Document

## Introduction

EthioTech Hub is a full-stack, AI-powered learning and freelance platform designed specifically for Ethiopian technology students. The platform combines structured course learning, interactive coding challenges, AI-assisted tutoring, real-time group communication, project submission and review, a freelance marketplace, and personal portfolio management — all within a single, Ethiopian-localized ecosystem. The platform serves two primary roles: Students who learn, build, and find work, and Admins who manage content, users, and quality.

---

## Glossary

- **Platform**: The EthioTech Hub web application as a whole.
- **Student**: A registered user with the "student" role who consumes learning content, submits projects, and participates in the marketplace.
- **Admin**: A registered user with the "admin" role who manages platform content, users, and submissions.
- **Auth_Service**: The backend module responsible for registration, login, token issuance, and password management.
- **JWT**: JSON Web Token used for stateless authentication and authorization.
- **Dashboard**: The personalized overview page shown to a Student after login.
- **Course**: A structured learning unit containing a title, description, category, video lessons, notes, quizzes, and assignments.
- **Lesson**: A single learning unit within a Course, consisting of a video link, written notes, and optional coding tasks.
- **Quiz**: A set of multiple-choice or coding questions associated with a Course or Lesson.
- **AI_Assistant**: The AI-powered chatbot module that answers questions, explains code, generates quizzes, and recommends content.
- **Test_Engine**: The module that delivers timed exams, grades responses, and records scores.
- **Project_Submission**: A student-uploaded project entry containing a title, description, GitHub link, optional live demo link, and supporting files.
- **Review_System**: The admin-facing module for evaluating, approving, commenting on, and ranking Project_Submissions.
- **Chat_System**: The real-time messaging module powered by Socket.IO, supporting public groups and private team rooms.
- **Group**: A named public or private communication channel within the Chat_System (e.g., "React Ethiopia", "AI Ethiopia").
- **Freelance_Marketplace**: The module where clients post jobs and Students apply, get hired, and receive ratings.
- **Job**: A freelance work listing posted by a client, containing title, description, required skills, budget, and category.
- **Portfolio**: A public-facing profile page for a Student displaying skills, completed projects, certificates, and GitHub links.
- **Certificate**: A digital credential issued to a Student upon successful completion of a Course.
- **Notification_Service**: The module that delivers in-app alerts for events such as course updates, job matches, and submission feedback.
- **Leaderboard**: A ranked list of Students based on test scores, completed courses, and project ratings.
- **Telebirr**: An Ethiopian mobile payment service reserved for future payment integration.
- **Amharic**: The primary official language of Ethiopia, supported as an alternative UI language.

---

## Requirements

---

### Requirement 1: User Registration and Login

**User Story:** As a visitor, I want to register and log in to the platform, so that I can access personalized learning content and platform features.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a registration request containing a unique email address, a display name, and a password of at least 8 characters.
2. WHEN a registration request is received, THE Auth_Service SHALL hash the password using bcrypt before storing the user record.
3. WHEN a registration request contains an email address already associated with an existing account, THE Auth_Service SHALL return a 409 Conflict response with a descriptive error message.
4. WHEN a valid login request is received, THE Auth_Service SHALL return a signed JWT with an expiry of 24 hours and a refresh token with an expiry of 7 days.
5. WHEN a login request contains an unrecognized email address or an incorrect password, THE Auth_Service SHALL return a 401 Unauthorized response without revealing which field is incorrect.
6. THE Auth_Service SHALL assign the "student" role to all newly registered users by default.
7. WHEN a JWT expires, THE Auth_Service SHALL accept a valid refresh token and issue a new JWT without requiring the user to re-enter credentials.
8. WHEN a refresh token is used, THE Auth_Service SHALL invalidate the previous refresh token and issue a new one (token rotation).

---

### Requirement 2: Password Recovery

**User Story:** As a Student, I want to reset my forgotten password, so that I can regain access to my account without contacting support.

#### Acceptance Criteria

1. WHEN a password-reset request is submitted with a registered email address, THE Auth_Service SHALL generate a time-limited reset token valid for 60 minutes and send it to the provided email address.
2. WHEN a password-reset request is submitted with an email address not associated with any account, THE Auth_Service SHALL return a 200 OK response without revealing whether the address exists in the system.
3. WHEN a valid reset token and a new password of at least 8 characters are submitted, THE Auth_Service SHALL update the stored password hash and invalidate the reset token.
4. WHEN an expired or already-used reset token is submitted, THE Auth_Service SHALL return a 400 Bad Request response with a descriptive error message.

---

### Requirement 3: Role-Based Access Control

**User Story:** As a platform operator, I want role-based access control enforced on all routes, so that Students and Admins can only access the resources appropriate to their role.

#### Acceptance Criteria

1. WHILE a request carries a valid JWT with the "student" role, THE Platform SHALL permit access to student-designated routes and deny access to admin-designated routes with a 403 Forbidden response.
2. WHILE a request carries a valid JWT with the "admin" role, THE Platform SHALL permit access to both admin-designated and student-designated routes.
3. WHEN a request is made to any protected route without a valid JWT, THE Platform SHALL return a 401 Unauthorized response.
4. THE Auth_Service SHALL support promotion of a user from the "student" role to the "admin" role exclusively by an existing Admin.

---

### Requirement 4: Student Dashboard

**User Story:** As a Student, I want a personalized dashboard, so that I can see my learning progress, recent activity, and key metrics at a glance.

#### Acceptance Criteria

1. WHEN a Student loads the Dashboard, THE Dashboard SHALL display the total number of completed lessons, the number of courses in progress, and the overall learning progress percentage.
2. WHEN a Student loads the Dashboard, THE Dashboard SHALL display the Student's five most recent activity events (e.g., lesson completed, test taken, project submitted).
3. WHEN a Student loads the Dashboard, THE Dashboard SHALL display the Student's most recent test score and overall average test score.
4. WHEN a Student loads the Dashboard, THE Dashboard SHALL display the number of certificates earned and a link to each certificate.
5. WHEN a Student loads the Dashboard, THE Dashboard SHALL display the Student's current freelance application status for any active Job applications.
6. THE Dashboard SHALL render progress data using visual charts and progress bars.
7. WHEN a Student has no activity data, THE Dashboard SHALL display contextual empty-state messages with suggested next actions rather than blank sections.

---

### Requirement 5: Course Catalog and Enrollment

**User Story:** As a Student, I want to browse and enroll in courses, so that I can start learning technology skills relevant to my goals.

#### Acceptance Criteria

1. THE Platform SHALL organize courses into the following categories: Web Development, Mobile Development, AI/ML, Cybersecurity, UI/UX Design, and Database Systems.
2. WHEN a Student requests the course catalog, THE Platform SHALL return a paginated list of courses, each containing a title, description, category, instructor name, and enrollment count.
3. WHEN a Student enrolls in a Course, THE Platform SHALL record the enrollment and set the Student's progress for that Course to 0%.
4. WHEN a Student attempts to enroll in a Course they are already enrolled in, THE Platform SHALL return a 409 Conflict response.
5. WHILE a Student is enrolled in a Course, THE Platform SHALL track and persist the Student's progress percentage based on the proportion of Lessons marked as complete.
6. WHEN a Student completes all Lessons and passes the final Quiz of a Course, THE Platform SHALL automatically issue a Certificate to the Student for that Course.
7. THE Platform SHALL allow filtering the course catalog by category and sorting by enrollment count or creation date.

---

### Requirement 6: Lesson Delivery

**User Story:** As a Student, I want to watch video lessons and read notes within a course, so that I can learn at my own pace.

#### Acceptance Criteria

1. WHEN a Student opens a Lesson, THE Platform SHALL display the lesson video link, written notes, and any associated coding tasks.
2. WHEN a Student marks a Lesson as complete, THE Platform SHALL update the enrollment progress percentage for the parent Course.
3. THE Platform SHALL present Lessons within a Course in a defined sequential order.
4. WHEN a Student has not yet completed the prerequisite Lesson, THE Platform SHALL prevent access to the subsequent Lesson and display a descriptive message indicating the prerequisite.
5. WHERE a Lesson includes a coding task, THE Platform SHALL provide an embedded code editor for the Student to write and submit a solution.

---

### Requirement 7: Quiz and Assessment System

**User Story:** As a Student, I want to take quizzes and timed exams, so that I can assess my understanding and earn scores.

#### Acceptance Criteria

1. THE Test_Engine SHALL support multiple-choice questions and coding-challenge questions.
2. WHEN a Student starts a timed exam, THE Test_Engine SHALL begin a countdown timer for the configured duration and submit the exam automatically when the timer reaches zero.
3. WHEN a Student submits a multiple-choice quiz, THE Test_Engine SHALL grade the submission immediately and return the score as a percentage.
4. WHEN a Student submits a coding-challenge response, THE Test_Engine SHALL evaluate the response against predefined test cases and return a pass/fail result per test case.
5. THE Test_Engine SHALL record each attempt, including the score, timestamp, and time taken, and associate the record with the Student's account.
6. WHEN a Student requests their test history, THE Test_Engine SHALL return all recorded attempts for that Student, ordered by timestamp descending.
7. THE Test_Engine SHALL maintain a Leaderboard ranking Students by their highest score per exam, updated after each submission.
8. WHERE the AI_Assistant is enabled for a Course, THE Test_Engine SHALL support AI-generated quiz questions for that Course.

---

### Requirement 8: AI Assistant

**User Story:** As a Student, I want an AI-powered assistant, so that I can get instant help with code, concepts, and course recommendations without waiting for a human instructor.

#### Acceptance Criteria

1. WHEN a Student sends a message to the AI_Assistant, THE AI_Assistant SHALL return a response within 10 seconds under normal operating conditions.
2. THE AI_Assistant SHALL support the following request types: code explanation, bug identification and fix suggestion, quiz question generation, course recommendation, project idea suggestion, and general technology question answering.
3. THE AI_Assistant SHALL persist the full conversation history for each Student session and make it retrievable by the Student.
4. WHEN a Student requests a code explanation, THE AI_Assistant SHALL return an explanation that references the specific language and constructs present in the submitted code snippet.
5. WHEN the AI_Assistant cannot fulfill a request due to an upstream API error, THE AI_Assistant SHALL return a descriptive error message to the Student and log the failure internally.
6. THE AI_Assistant SHALL integrate with either the OpenAI API or the Google Gemini API as the underlying language model provider.

---

### Requirement 9: Project Submission

**User Story:** As a Student, I want to submit my projects for review, so that I can receive feedback, build my portfolio, and earn recognition.

#### Acceptance Criteria

1. WHEN a Student submits a project, THE Platform SHALL require a title, a description, and at least one of: a GitHub repository URL or a live demo URL.
2. WHEN a project submission is received, THE Platform SHALL set the submission status to "pending" and notify the Admin via the Notification_Service.
3. WHEN an Admin reviews a Project_Submission, THE Review_System SHALL allow the Admin to set the status to "approved" or "rejected" and attach a written comment.
4. WHEN a Project_Submission status changes, THE Notification_Service SHALL deliver an in-app notification to the submitting Student containing the new status and any Admin comment.
5. WHEN a Project_Submission is approved, THE Platform SHALL make the project visible on the Student's Portfolio.
6. THE Review_System SHALL allow an Admin to assign a numeric rating from 1 to 5 to an approved Project_Submission.
7. WHEN a Student requests their submission history, THE Platform SHALL return all Project_Submissions associated with that Student, including status, rating, and Admin comments.

---

### Requirement 10: Real-Time Communication Groups

**User Story:** As a Student, I want to join topic-based chat groups and team rooms, so that I can collaborate with peers and discuss technology topics.

#### Acceptance Criteria

1. THE Chat_System SHALL provide the following default public Groups: "React Ethiopia", "Node.js Ethiopia", "AI Ethiopia", "Freelancers Hub", and "General".
2. WHEN a Student joins a Group, THE Chat_System SHALL deliver all messages sent in that Group to the Student in real time using Socket.IO.
3. WHEN a Student sends a message in a Group, THE Chat_System SHALL broadcast the message to all connected members of that Group within 500 milliseconds under normal network conditions.
4. THE Chat_System SHALL persist all Group messages and make the most recent 50 messages available to a Student upon joining a Group.
5. THE Platform SHALL allow Students to create private team rooms with a defined list of invited members.
6. WHEN a Student is not a member of a private team room, THE Chat_System SHALL deny access to that room and return a 403 Forbidden response.
7. THE Chat_System SHALL support a threaded discussion forum view in addition to the real-time chat view for each Group.

---

### Requirement 11: Freelance Marketplace

**User Story:** As a Student, I want to browse and apply for freelance jobs, so that I can earn income and gain professional experience using my technology skills.

#### Acceptance Criteria

1. THE Freelance_Marketplace SHALL organize Jobs into the following categories: Web Design, Frontend Development, Backend Development, Mobile Development, and AI Integration.
2. WHEN a client posts a Job, THE Freelance_Marketplace SHALL require a title, description, required skills list, budget range, and category.
3. WHEN a Student applies for a Job, THE Freelance_Marketplace SHALL record the application and notify the client via the Notification_Service.
4. WHEN a client accepts a Student's application, THE Freelance_Marketplace SHALL update the Job status to "in progress" and notify the Student via the Notification_Service.
5. WHEN a Job is marked as complete by both the client and the Student, THE Freelance_Marketplace SHALL prompt the client to submit a numeric rating from 1 to 5 and a written review for the Student.
6. THE Freelance_Marketplace SHALL display each Student's average rating, calculated from all received client reviews, on the Student's Portfolio.
7. WHEN a Student requests the job listing, THE Freelance_Marketplace SHALL return a paginated list of open Jobs filterable by category and required skills.
8. WHERE Telebirr payment integration is enabled, THE Freelance_Marketplace SHALL process job payments through the Telebirr API.

---

### Requirement 12: Portfolio System

**User Story:** As a Student, I want a public portfolio page, so that I can showcase my skills, projects, and certificates to potential clients and employers.

#### Acceptance Criteria

1. THE Platform SHALL generate a unique public Portfolio URL for each Student upon registration.
2. WHEN a visitor accesses a Student's Portfolio URL, THE Platform SHALL display the Student's display name, listed skills, approved projects, earned certificates, average freelance rating, and GitHub profile link.
3. WHEN a Student updates their skills list or GitHub link in Settings, THE Platform SHALL reflect the changes on the Portfolio within 5 seconds.
4. WHEN a Project_Submission is approved, THE Platform SHALL automatically add the project to the Student's Portfolio without requiring manual action from the Student.
5. THE Platform SHALL allow a Student to reorder the projects displayed on their Portfolio.

---

### Requirement 13: Admin Content Management

**User Story:** As an Admin, I want to manage courses, users, and freelance jobs from a dedicated dashboard, so that I can maintain platform quality and content accuracy.

#### Acceptance Criteria

1. WHEN an Admin creates a Course, THE Platform SHALL require a title, description, category, and at least one Lesson.
2. WHEN an Admin updates a Course, THE Platform SHALL persist the changes and reflect them to enrolled Students within 10 seconds.
3. WHEN an Admin deactivates a user account, THE Platform SHALL prevent that user from authenticating and revoke all active JWTs associated with that account.
4. WHEN an Admin requests the user list, THE Platform SHALL return a paginated list of all users including display name, email, role, registration date, and account status.
5. WHEN an Admin removes a Job listing, THE Platform SHALL notify all Students who had applied for that Job via the Notification_Service.
6. THE Platform SHALL provide an Admin dashboard displaying total user count, total course count, total active Jobs, and total pending Project_Submissions.

---

### Requirement 14: Notification System

**User Story:** As a Student or Admin, I want to receive in-app notifications for relevant platform events, so that I can stay informed without manually checking every section.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver in-app notifications for the following events: project submission status change, new freelance job match, Job application status change, new Group message (when not actively viewing the Group), and course update.
2. WHEN a notification is delivered, THE Notification_Service SHALL mark it as unread until the recipient explicitly views it.
3. WHEN a user requests their notification list, THE Notification_Service SHALL return all notifications for that user ordered by timestamp descending, with a maximum of 100 entries per page.
4. WHEN a user marks a notification as read, THE Notification_Service SHALL update the read status and reflect the change in the unread count immediately.

---

### Requirement 15: Ethiopian Localization

**User Story:** As an Ethiopian student, I want the platform to support Amharic language and Ethiopian cultural context, so that I can use the platform comfortably in my native language.

#### Acceptance Criteria

1. THE Platform SHALL provide a language toggle allowing users to switch the UI between English and Amharic.
2. WHEN a user selects Amharic, THE Platform SHALL render all static UI labels, navigation items, and system messages in Amharic.
3. THE Platform SHALL display an Ethiopian Tech News section on the home page, sourced from a configurable RSS feed or curated content API.
4. THE Platform SHALL apply an Ethiopian-inspired visual theme including color palette and iconography consistent with Ethiopian cultural aesthetics.
5. WHERE Telebirr payment integration is enabled, THE Platform SHALL display payment amounts in Ethiopian Birr (ETB).

---

### Requirement 16: Security and Input Validation

**User Story:** As a platform operator, I want all API inputs validated and all routes secured, so that the platform is protected against common web vulnerabilities.

#### Acceptance Criteria

1. THE Platform SHALL validate all incoming API request bodies against defined schemas and return a 400 Bad Request response with field-level error details for any validation failure.
2. THE Platform SHALL sanitize all user-supplied text inputs to prevent cross-site scripting (XSS) injection before persisting or rendering the data.
3. THE Platform SHALL enforce rate limiting on the authentication endpoints, allowing a maximum of 10 requests per IP address per minute, and return a 429 Too Many Requests response when the limit is exceeded.
4. THE Platform SHALL store all passwords exclusively as bcrypt hashes and SHALL NOT store or log plaintext passwords at any point.
5. THE Platform SHALL use HTTPS for all client-server communication in production.
6. THE Platform SHALL apply CORS policy restricting API access to the configured frontend origin domains.

---

### Requirement 17: Leaderboard and Gamification

**User Story:** As a Student, I want to see a leaderboard ranking, so that I can measure my progress against peers and stay motivated.

#### Acceptance Criteria

1. THE Leaderboard SHALL rank Students based on a composite score derived from: total completed courses (weighted 40%), highest test scores (weighted 40%), and total approved projects (weighted 20%).
2. WHEN a Student's composite score changes, THE Leaderboard SHALL update the Student's rank within 60 seconds.
3. WHEN a Student requests the Leaderboard, THE Platform SHALL return the top 100 ranked Students including display name, rank, and composite score.
4. THE Platform SHALL display the requesting Student's own rank on the Leaderboard page regardless of whether they appear in the top 100.

---

### Requirement 18: Certificate Generation

**User Story:** As a Student, I want to receive a verifiable digital certificate upon completing a course, so that I can share my achievement with employers and clients.

#### Acceptance Criteria

1. WHEN a Student completes all Lessons and achieves a passing score of 70% or above on the final Quiz of a Course, THE Platform SHALL generate a Certificate containing the Student's display name, course title, completion date, and a unique verification code.
2. THE Platform SHALL provide a publicly accessible URL for each Certificate that displays the Certificate details when visited.
3. WHEN a third party visits a Certificate verification URL, THE Platform SHALL confirm the Certificate's authenticity and display the associated Student name and course title.
4. THE Platform SHALL make each Certificate available for download as a PDF from the Student's Dashboard and Portfolio.
