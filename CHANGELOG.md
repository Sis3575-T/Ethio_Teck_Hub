# Changelog

All notable changes to this project are documented in this file.

## Unreleased

- Implement `LessonViewer` improvements: initialize `completed` from server, safer prev/next lookup, add auto-mark-on-video-end toggle, and wire coding-task submissions to POST `/lessons/:id/submission` with localStorage fallback.
- Add `node-fetch@2` to backend to satisfy AI service tests.
- Frontend build and tests verified; backend tests passed.
