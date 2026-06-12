# wsg-webmcp-experiment
Prototype of a WebMCP for the Web Sustainability Guidelines

# WSG WebMCP Experiment

An experimental implementation of the W3C Web Sustainability Guidelines (WSG) using WebMCP.

This project explores how AI agents can interact directly with sustainability guidance through browser-native tools. Rather than treating the WSG as a static document, this prototype exposes guideline data as structured tools that can be discovered and used by AI systems.

The goal is to better understand how emerging standards such as WebMCP might support sustainability audits, procurement reviews, conformance reporting, education, and implementation guidance.

## Status

⚠️ Experimental

This project is not affiliated with the W3C Web Sustainability Guidelines Working Group and should not be considered an official implementation.

This project does not certify compliance, conformance, accessibility, sustainability, or legal obligations.

Its purpose is to explore how WebMCP can expose WSG content to AI agents in a transparent and interoperable way.

## Background

The W3C Web Sustainability Guidelines (WSG) provide guidance for creating digital products and services that are environmentally sustainable, socially responsible, and economically viable.

The guidelines are available at:

https://www.w3.org/TR/web-sustainability-guidelines/

This prototype uses the machine-readable guideline data published by the WSG project:

https://github.com/w3c/sustainableweb-wsg/blob/main/guidelines.json

It also uses STAR technique data from the same project:

https://github.com/w3c/sustainableweb-wsg/blob/main/star.json

Those files are refreshed by the scheduled GitHub Actions workflow in
`.github/workflows/update-guidelines.yml`. The repository must allow GitHub Actions
to write contents so the workflow can commit updates to `data/guidelines.json` and
`data/star.json`.

## Objectives

This project aims to:

* Explore WebMCP as an interface between AI systems and web standards.
* Expose WSG content as structured tools.
* Support retrieval of guidelines, success criteria, tags, benefits, and resources.
* Investigate agent-assisted sustainability audits and reporting.
* Gather practical experience that may inform future standards discussions.

## Current Tool Set

### wsg.search

Search WSG guidelines, success criteria, tags, and supporting resources.

### wsg.get_guideline

Retrieve a full WSG guideline by ID or exact title.

### wsg.get_criterion

Retrieve detailed information for a specific success criterion.

### wsg.list_by_tag

List guidelines and criteria associated with a specific tag.

Examples:

* Accessibility
* Performance
* Carbon
* Procurement
* User Experience

### wsg.find_resources

Return supporting resources, references, and implementation guidance related to a guideline or criterion.

### wsg.suggest_audit_questions

Generate draft audit questions from WSG guidelines or tags.

### wsg.suggest_procurement_requirements

Generate draft procurement requirements from WSG guidelines or tags.

### wsg.generate_conformance_claim_draft

Generate a draft conformance statement based on selected WSG criteria.

Generated content is informational only and should be reviewed by humans before use.

### wsg.generate_review_checklist

Generate a draft review checklist from WSG guidance.

### wsg.star_stats

Show STAR data statistics.

### wsg.validate_star_alignment

Check whether STAR links still match WSG anchors.

### wsg.find_star_techniques

Find STAR techniques by query or WSG guideline.

### wsg.generate_review_checklist_with_tests

Generate checklist items with related STAR test techniques.

### wsg.stats

Show WSG data statistics.

## Future Tool Ideas

The following tools are being considered for later phases:

* wsg.list_by_role
* wsg.map_to_wcag
* wsg.map_to_sdg
* wsg.generate_training_material
* wsg.compare_guidelines

## Architecture

text guidelines.json         │         ▼ WSG Data Layer         │         ▼ WebMCP Tool Registry         │         ▼ AI Agents (ChatGPT, Gemini, Claude, etc.) 

## Development Roadmap

Phase 1

* GitHub Pages deployment
* Load and index guidelines.json
* Register initial WebMCP tools
* Chrome Canary testing

Phase 2

* Role-based filtering
* WCAG mappings
* SDG mappings
* Audit-question generation

Phase 3

* Integration with additional sustainability resources
* Cross-standard mappings
* Prototype sustainability assistant

## Testing

Current testing targets:

* Chrome Canary
* WebMCP experimental features enabled
* Local and GitHub Pages deployments

Testing procedures and browser configuration will be documented as the WebMCP ecosystem evolves.

## Contributing

Feedback, ideas, issues, and pull requests are welcome.

Particular areas of interest include:

* Sustainability reporting
* Digital public goods
* Accessibility
* Open standards
* AI interoperability
* Structured guideline data

## AI Assistance

This project was developed with the assistance of generative AI tools, including ChatGPT (OpenAI).

AI was used to support brainstorming, software design discussions, code generation, documentation drafting, and exploration of WebMCP use cases.

All design decisions, code review, validation, and project direction remain the responsibility of the project maintainer.

Users should independently review any generated code, documentation, or recommendations before relying on them.

## License

All documents in this Repository are licensed by contributors
under the 
[W3C Software and Document License](https://www.w3.org/copyright/software-license/).

Please consult the W3C licensing and usage terms applicable to the original WSG content before reusing guideline text.
