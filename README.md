# WSG WebMCP Experiment

Experimental browser-based prototype for exposing the W3C Web Sustainability Guidelines as structured WebMCP tools.

## Purpose

This project tests whether a web page can expose WSG content as a task layer for compatible browsers and agents.
It stays static and easy to inspect while exploring how structured tools might support:

* guideline lookup
* review checklists
* design reviews
* procurement review drafts
* STAR-based testing support

## Status

This is an experimental prototype.

It is not an official W3C project and it does not certify conformance, sustainability, accessibility, procurement compliance, or legal compliance.
All generated output is draft material only and needs human review.

## Data Sources

The project uses two JSON files copied from the WSG project:

* [data/guidelines.json](data/guidelines.json)
* [data/star.json](data/star.json)

The upstream source data is refreshed by the scheduled GitHub Actions workflow in [.github/workflows/update-guidelines.yml](.github/workflows/update-guidelines.yml).

## Architecture

The repository is intentionally simple:

* [index.html](index.html) provides the main demo page.
* [background.html](background.html) explains the experiment and its limits.
* [src/wsg-data.js](src/wsg-data.js) loads, indexes, searches, and transforms the WSG and STAR data.
* [src/webmcp-tools.js](src/webmcp-tools.js) registers the WebMCP tools.
* [src/app.js](src/app.js) wires the buttons, text areas, and output area in the browser.
* [styles/site.css](styles/site.css) provides shared styling.

The page works as a normal JavaScript demo in browsers that do not support WebMCP.
When WebMCP is available, the same page also registers machine-readable tools for compatible agents.

## Current WebMCP Tools

### Lookup and retrieval

* `wsg.search` - Search WSG guidelines, criteria, tags, and supporting content.
* `wsg.get_guideline` - Get a full WSG guideline by ID or exact title.
* `wsg.get_criterion` - Get a WSG success criterion by generated ID or exact title.
* `wsg.list_by_tag` - List WSG guidelines connected to a tag.
* `wsg.find_resources` - Find supporting WSG resources by query, tag, or guideline ID.

### Task-layer tools

* `wsg.find_relevant_guidance` - Match a real-world problem statement against relevant WSG guidance and related STAR text.
* `wsg.review_design_decision` - Draft a review of a design decision using WSG guidance and STAR techniques.
* `wsg.review_procurement_requirement` - Draft a review of a procurement requirement using WSG guidance.
* `wsg.suggest_audit_questions` - Generate draft audit questions from WSG guidelines or tags.
* `wsg.suggest_procurement_requirements` - Generate draft procurement requirements from WSG guidelines or tags.
* `wsg.generate_conformance_claim_draft` - Generate a draft WSG conformance claim.
* `wsg.generate_review_checklist` - Generate a draft review checklist from WSG guidance.

### STAR tools

* `wsg.star_stats` - Show STAR data statistics.
* `wsg.validate_star_alignment` - Check whether STAR links still match WSG anchors.
* `wsg.find_star_techniques` - Find STAR techniques by query or WSG guideline.
* `wsg.generate_review_checklist_with_tests` - Generate checklist items with related STAR test techniques.

### Summary

* `wsg.stats` - Show WSG data statistics.

## Current Human-Facing Demo Features

The main page includes:

* WSG search
* WSG stats
* a shared textarea for guidance review
* find relevant WSG guidance
* review design decision
* review procurement requirement
* WSG review checklist generation
* STAR stats
* STAR / WSG alignment checks
* accessibility checklist with STAR tests
* WebMCP tool discovery and invocation diagnostics

The task-layer buttons show a readable summary, key findings, source links, and the raw JSON result in a details block.

## How to Run Locally

This is a static site. You can open it with any local static server.

Examples:

* `python3 -m http.server`
* VS Code Live Server
* any other local static file server

Then open `index.html` in your browser.

## How GitHub Actions Updates Data

The scheduled workflow downloads the latest WSG JSON files from the upstream W3C source, validates them, and writes them into `data/guidelines.json` and `data/star.json`.

That keeps the demo aligned with the current source data while still letting the project run as a static site on GitHub Pages.

## Limitations

* This is an experimental prototype, not an official W3C deliverable.
* The outputs are drafts only and must be reviewed by a human.
* The tools do not certify compliance or legal status.
* Matching is deterministic and limited to the source data in this repository.
* WebMCP support is experimental and browser support is limited.

## AI Assistance Acknowledgement

This project was developed with assistance from generative AI tools. AI was used to support brainstorming, code drafting, documentation drafting, and exploration of WebMCP use cases. Human review and validation remain essential.

## Contributing

Feedback, issues, and pull requests are welcome.

Areas of interest include:

* sustainability reporting
* accessibility
* open standards
* AI interoperability
* structured guideline data

## License

All documents in this repository are licensed by contributors under the [W3C Software and Document License](https://www.w3.org/copyright/software-license/).

Please consult the W3C licensing and usage terms applicable to the original WSG content before reusing guideline text.
