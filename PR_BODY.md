Title: chore(deps): upgrade dependencies to address npm audit findings

Summary:
Upgrades dev and runtime dependencies to remediate npm audit findings. Notable upgrades: Vite, Vitest, esbuild (frontend); Nodemailer, uuid, node-fetch (backend). See `REPORT.md` for full details and rationale.

What I did:
- Ran frontend build & tests, ran backend tests, added CI workflow, added `backend/scripts/smoke-test.js`, and created the `upgrade/deps-audit` branch with these changes.

Verification:
- Frontend build & Vitest passed locally; backend Jest passed locally; smoke test: `/api/health` OK (`/api/courses` requires auth—expected).

Risk & recommendation:
- Forced semver-major upgrades were applied. Please validate runtime integrations (SMTP, AI service, third-party SDKs) in a staging environment before merging.

Files/locations:
- `REPORT.md`, `CHANGELOG.md`, `.github/workflows/ci.yml`, dependency updates in `frontend/package.json` and `backend/package.json`.

Checklist:
- [x] Tests pass (frontend & backend)
- [x] Branch pushed (`upgrade/deps-audit`)
- [ ] Manual staging validation (recommended)
- [ ] Approve & merge

Staging validation checklist:
1. Start staging app with production-like env vars (DB, SMTP, AI keys).
2. Run end-to-end smoke flow: register → login → open course → run lesson video → mark complete.
3. Verify email sending (password reset flow) using test SMTP or capture service.
4. Validate AI endpoints that use `node-fetch` in `aiService`.
