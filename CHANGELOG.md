# Changelog

All notable changes to this project are documented in this file.

## Unreleased

- Implement `LessonViewer` improvements: initialize `completed` from server, safer prev/next lookup, add auto-mark-on-video-end toggle, and wire coding-task submissions to POST `/lessons/:id/submission` with localStorage fallback.
- Add `node-fetch@2` to backend to satisfy AI service tests.
- Frontend build and tests verified; backend tests passed.

### Security audit (npm audit)

- Frontend: 6 moderate vulnerabilities (related to `vitest`, `vite`, `esbuild`), no high/critical. Recommended: update `vitest`/`vite` to versions with fixes; these are semver-major updates.
- Backend: 2 vulnerabilities (1 high related to `nodemailer`, 1 moderate related to `uuid`). Recommended: upgrade `nodemailer` and `uuid` to patched versions, and validate SMTP/UUID usage.

Note: I did not run `npm audit fix --force` to avoid breaking changes; please approve major upgrades or schedule dependency update work.
