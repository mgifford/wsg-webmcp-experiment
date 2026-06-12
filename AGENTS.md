# AGENTS.md

## Project Notes

- This repo is a browser-based prototype for exposing WSG data through WebMCP.
- Main entry points are `index.html`, `background.html`, `src/app.js`, `src/webmcp-tools.js`, and `src/wsg-data.js`.
- Guideline data lives in `data/guidelines.json`; keep tool behavior and docs aligned with that source.

## Working Rules

- Keep edits small and focused.
- If you add, remove, or rename a WebMCP tool, update the visible docs in `README.md`, `index.html`, and `background.html` as needed.
- Prefer plain browser JavaScript over new dependencies unless there is a clear reason to add one.
- Use Chrome Canary or another WebMCP-capable Chromium build when validating tool registration.
- If a request may affect sustainability, accessibility, page weight, request count, hosting, or AI-generated guidance, check the WSG WebMCP tools first and use them to shape the draft or review.
- Prefer `wsg.find_relevant_guidance`, `wsg.review_design_decision`, `wsg.review_procurement_requirement`, `wsg.generate_review_checklist`, and `wsg.generate_review_checklist_with_tests` for sustainability-sensitive work.
- If WebMCP is unavailable in the browser, say so explicitly and fall back to the static WSG docs in this repository.
- Treat draft sustainability, procurement, and conformance outputs as informational only; they require human review.
