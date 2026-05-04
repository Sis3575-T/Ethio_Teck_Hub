# REPORT — Dependency Upgrades & Audit Remediation

Date: 2026-05-04

Overview
- This branch (`upgrade/deps-audit`) applies dependency upgrades to address `npm audit` findings observed during a security review. Changes were applied to both `frontend` and `backend` packages.

Notable Upgrades
- Frontend: Vite, Vitest, esbuild (dev) — upgraded to resolve several moderate vulnerabilities reported by `npm audit`.
- Backend: nodemailer, uuid, node-fetch — upgraded to patched versions.

What I changed
- Ran `npm audit` and applied `npm audit fix --force` where necessary.
- Verified frontend build (`npm run build`) and Vitest unit tests locally.
- Verified backend Jest tests locally after installing a missing `node-fetch@2` compatibility dependency used by `aiService`.
- Added CI workflow at `.github/workflows/ci.yml` to run frontend build/tests and backend tests on push/PR.
- Added `backend/scripts/smoke-test.js` and `backend` `smoke` script to perform a basic health check.
- Implemented UI improvements in `frontend/src/pages/LessonViewer.jsx` (video ended auto-mark, code submission fallback to localStorage, improved navigation logic).

Verification performed
- Frontend: `npm run build` succeeded; Vitest unit tests passed locally.
- Backend: Jest test suite passed locally after installing `node-fetch@2`.
- Smoke test: `/api/health` returns healthy; `/api/courses` returned 401 (expected without auth/DB config).

Risks & Recommendations
- The fixes required forced semver-major upgrades for some packages; these can introduce runtime behavior changes.
- Before merging to production, run a staging validation of runtime integrations:
  - SMTP (password reset, verification emails)
  - AI service usage paths (ensure `node-fetch` compatibility)
  - Any third-party SDKs that may have peer dependency constraints

Staging validation checklist
1. Start staging environment with production-like env vars (DB, SMTP credentials, AI keys).
2. Run backend smoke tests and full integration tests against staging DB.
3. Manually validate flows: register → login → open course → play video → mark complete → request password reset (email).
4. Verify AI-related features (AISession creation, assistant endpoints) behave as expected.

How to run locally

Frontend (from `frontend/`):
```
npm install
npm run dev    # for local development
npm run build  # verify production build
npm test       # run vitest
```

Backend (from `backend/`):
```
npm install
npm test       # run Jest tests
npm run smoke   # runs basic health smoke test
node server.js  # or use nodemon in dev
```

Files of interest
- `REPORT.md` (this file)
- `CHANGELOG.md`
- `frontend/src/pages/LessonViewer.jsx` (UI improvements)
- `.github/workflows/ci.yml` (CI integration)
- `backend/scripts/smoke-test.js` (smoke test script)

Notes
- If anything breaks in staging because of the forced upgrades, we can pin the package(s) to previous versions and handle fixes incrementally. The forced upgrades were chosen to resolve known advisories quickly.
# Final Report — EthioTech Hub updates

Summary
- Implemented improvements to `frontend/src/pages/LessonViewer.jsx`:
  - Initialize `completed` state from server response
  - Safer prev/next navigation lookup
  - Added `auto-mark` toggle to mark lesson complete on video end (native video)
  - Added coding submission flow: POST `/api/lessons/:id/submission` if available, otherwise persist to `localStorage` as fallback
- Backend: added `node-fetch@2` (to satisfy AI service) and upgraded `nodemailer` / `uuid` to patched versions to address vulnerabilities.
- Dependency audit: performed `npm audit fix --force` on a branch `upgrade/deps-audit` to remove reported vulnerabilities; verified frontend and backend tests and frontend build.
- Added ESLint config for frontend and a GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- Added a lightweight smoke test script at `backend/scripts/smoke-test.js` and `backend` npm script `npm run smoke`.

How to run locally

- Install dependencies for frontend and backend:

```bash
cd frontend
npm ci
cd ../backend
npm ci
```

- Run backend tests:

```bash
cd backend
npm test
```

- Run frontend tests and build:

```bash
cd frontend
npm test
npm run build
```

- Run smoke test (starts the app in-process and checks /api/health):

```bash
cd backend
npm run smoke
```

Git / PR
- I created branch `upgrade/deps-audit` locally with dependency upgrades and commits. There is no remote configured in this repository.
- To push and open a PR, add a remote and push the branch, then create a PR on GitHub. Example:

```bash
cd "C:\Users\hp\OneDrive\Desktop\Ethio teck hub"
git remote add origin <git-remote-url>
git push -u origin upgrade/deps-audit
# Create PR using GitHub CLI (optional):
gh pr create --base main --head upgrade/deps-audit --title "chore: upgrade deps to address audit" --body "Upgraded dependencies to address npm audit findings; tests & build verified locally."
```

Notes and recommendations
- The `npm audit fix --force` step performed semver-major upgrades (vite/vitest/esbuild, nodemailer, uuid). While tests and build passed locally, please validate runtime integrations (SMTP, AI services, deployment environment) in a staging environment.
- If you want me to push and open the PR, please provide a remote URL or authorize a push (I cannot push without a configured remote and credentials).
