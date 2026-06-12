# SUSTAINABILITY.md

## Commitment
- Sustainability is part of our definition of done.
- We improve month over month, not once per year.
- We keep this project static unless a build step is clearly justified.
- We prefer small, inspectable changes that are easy to review.

## CI Guardrails
- Block on critical accessibility regressions.
- Block on obvious page-weight or request-budget regressions.
- Keep the demo usable in browsers that do not support WebMCP.
- Keep the output readable and avoid unnecessary complexity in the UI.

## AI Policy
- Prefer deterministic tools first.
- Keep prompts scoped, log usage, and avoid waste.
- Review generated content before relying on it.
- Use AI to support drafting and exploration, not to replace human judgment.

## Agent Guidance
- Treat this file as the project policy layer and `AGENTS.md` as the operational layer.
- If a task touches sustainability, accessibility, page weight, request count, hosting, or infrastructure choices, consult the WSG WebMCP tools before proposing code.
- Use WSG WebMCP to draft checklists or reviews, then validate the result against the static docs if WebMCP is not available.

## Ownership
- Assign owners for the data, demo, and docs.
- Track baselines, targets, and review cadence.
- Publish trade-offs and exceptions with expiry dates.
- Review the WSG and STAR data refresh workflow regularly.

## Scope
- This repository is a browser-based prototype for WSG and STAR task-layer tooling.
- The project should stay easy to inspect, static, and accessible.
- Changes should keep the demo understandable in ordinary browsers.

## References
- [Web Sustainability Guidelines](https://www.w3.org/TR/web-sustainability-guidelines/)
- [WSG WebMCP Experiment](./README.md)
- [Background](./background.html)

## Validation
- Treat this file as a policy statement, not proof of sustainability.
- Validate before use and revise as the project evolves.
