import {
  getStats,
  searchGuidelines,
  listTags,
  generateReviewChecklist,
  generateReviewChecklistWithTests,
  findRelevantGuidance,
  reviewDesignDecision,
  reviewProcurementRequirement,
  validateStarAlignment,
  getStarStats
} from './wsg-data.js';

import { registerWsgTools } from './webmcp-tools.js';

// Register WebMCP tools as soon as the module loads so supported browsers can discover them.
registerWsgTools().catch((error) => {
  const status = document.querySelector('#webmcp-status');

  if (status) {
    status.textContent = `WebMCP registration failed: ${error.message}`;
  }

  console.error(error);
});

const output = document.querySelector('#output');
const button = document.querySelector('#load-stats');

function bindClickHandler(element, handler, description) {
  if (!element) {
    console.warn(`Missing element for ${description}`);
    return;
  }

  element.addEventListener('click', handler);
}

function renderTaskLayerResult(result) {
  if (!output) {
    return;
  }

  const container = document.createElement('div');
  container.className = 'stack';

  const summary = document.createElement('p');
  summary.className = 'lede';
  summary.textContent = buildTaskLayerSummary(result);
  container.append(summary);

  const findingsSection = document.createElement('section');
  findingsSection.className = 'stack';
  findingsSection.append(buildSectionHeading('Key findings'));
  findingsSection.append(buildTaskLayerList(buildTaskLayerFindings(result)));
  container.append(findingsSection);

  const linksSection = document.createElement('section');
  linksSection.className = 'stack';
  linksSection.append(buildSectionHeading('Source guideline links'));
  linksSection.append(buildSourceLinkList(buildTaskLayerSourceLinks(result)));
  container.append(linksSection);

  const details = document.createElement('details');
  const detailsSummary = document.createElement('summary');
  detailsSummary.textContent = 'Raw JSON';
  details.append(detailsSummary);

  const rawJson = document.createElement('pre');
  rawJson.className = 'results';
  rawJson.textContent = JSON.stringify(result, null, 2);
  details.append(rawJson);

  container.append(details);
  output.replaceChildren(container);
}

function buildSectionHeading(text) {
  const heading = document.createElement('h3');
  heading.textContent = text;
  return heading;
}

function buildTaskLayerList(items) {
  const list = document.createElement('ul');
  list.className = 'bullet-list';

  if (!items.length) {
    const item = document.createElement('li');
    item.textContent = 'No additional findings.';
    list.append(item);
    return list;
  }

  for (const itemText of items) {
    const item = document.createElement('li');
    item.textContent = itemText;
    list.append(item);
  }

  return list;
}

function buildSourceLinkList(sourceLinks) {
  const list = document.createElement('ul');
  list.className = 'bullet-list';

  if (!sourceLinks.length) {
    const item = document.createElement('li');
    item.textContent = 'No source guideline links were provided.';
    list.append(item);
    return list;
  }

  for (const sourceLink of sourceLinks) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = sourceLink.url;
    link.textContent = sourceLink.label;
    item.append(link);
    list.append(item);
  }

  return list;
}

function buildTaskLayerSummary(result) {
  if (Array.isArray(result.items)) {
    return `${result.status} This draft includes ${result.items.length} checklist items.`;
  }

  if (Array.isArray(result.matches)) {
    return `${result.status} This draft includes ${result.matches.length} relevant guidance matches.`;
  }

  if (Array.isArray(result.potentialConcerns) && Array.isArray(result.relevantGuidance)) {
    const concernCount = result.potentialConcerns.length;
    const guidanceCount = result.relevantGuidance.length;
    const starCount = Array.isArray(result.starTechniques) ? result.starTechniques.length : 0;

    if (Array.isArray(result.suggestedLanguage)) {
      return `${result.status} This draft flags ${concernCount} concerns, ${guidanceCount} guidance matches, and ${result.suggestedLanguage.length} language suggestions.`;
    }

    return `${result.status} This draft flags ${concernCount} concerns, ${guidanceCount} guidance matches, and ${starCount} STAR techniques.`;
  }

  return result.status || 'Results ready.';
}

function buildTaskLayerFindings(result) {
  if (Array.isArray(result.items)) {
    return result.items.map((item, index) => item.question || item.title || `Checklist item ${index + 1}`);
  }

  if (Array.isArray(result.matches)) {
    return result.matches.map((match) => `${match.guideline} — ${match.criterion}`);
  }

  if (Array.isArray(result.potentialConcerns) && Array.isArray(result.relevantGuidance)) {
    const findings = [];

    for (const concern of result.potentialConcerns) {
      findings.push(`Potential concern: ${concern}`);
    }

    for (const item of result.relevantGuidance) {
      findings.push(`Relevant guidance: ${item.guideline} — ${item.criterion}`);
    }

    if (Array.isArray(result.starTechniques)) {
      for (const technique of result.starTechniques) {
        findings.push(`STAR technique: ${technique.title}`);
      }
    }

    return findings;
  }

  return [result.status || 'Results ready.'];
}

function buildTaskLayerSourceLinks(result) {
  const links = [];

  if (Array.isArray(result.items)) {
    for (const item of result.items) {
      if (!item.sourceUrl) {
        continue;
      }

      links.push({
        label: `${item.guideline} — ${item.criterion}`,
        url: item.sourceUrl
      });
    }
  }

  if (Array.isArray(result.matches)) {
    for (const match of result.matches) {
      if (!match.sourceUrl) {
        continue;
      }

      links.push({
        label: `${match.guideline} — ${match.criterion}`,
        url: match.sourceUrl
      });
    }
  }

  if (Array.isArray(result.relevantGuidance)) {
    for (const item of result.relevantGuidance) {
      if (!item.sourceUrl) {
        continue;
      }

      links.push({
        label: `${item.guideline} — ${item.criterion}`,
        url: item.sourceUrl
      });
    }
  }

  const uniqueLinks = [];
  const seen = new Set();

  for (const link of links) {
    const key = `${link.label}|${link.url}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueLinks.push(link);
  }

  return uniqueLinks;
}

// The stats button demonstrates the shared data layer by combining summary data and a sample search.
bindClickHandler(button, async () => {
  try {
    const stats = await getStats();
    const tags = await listTags();
    const performanceResults = await searchGuidelines({
      query: 'performance',
      limit: 5
    });

    output.textContent = JSON.stringify({
      stats,
      sampleTags: tags.slice(0, 20),
      performanceResults
    }, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#load-stats');

const searchButton = document.querySelector('#search-wsg');
const searchInput = document.querySelector('#search-query');
const guidanceDescription = document.querySelector('#guidance-description');
const findRelevantGuidanceButton = document.querySelector('#find-relevant-guidance');
const reviewDesignDecisionButton = document.querySelector('#review-design-decision');
const procurementRequirement = document.querySelector('#procurement-requirement');
const reviewProcurementRequirementButton = document.querySelector('#review-procurement-requirement');

// The search form is the simplest human-facing entry point into the guidelines index.
bindClickHandler(searchButton, async () => {
  try {
    const results = await searchGuidelines({
      query: searchInput.value,
      limit: 10
    });

    output.textContent = JSON.stringify(results, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#search-wsg');

bindClickHandler(findRelevantGuidanceButton, async () => {
  try {
    const result = await findRelevantGuidance({
      description: guidanceDescription ? guidanceDescription.value : '',
      limit: 10
    });

    renderTaskLayerResult(result);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#find-relevant-guidance');

bindClickHandler(reviewDesignDecisionButton, async () => {
  try {
    const result = await reviewDesignDecision({
      description: guidanceDescription ? guidanceDescription.value : '',
      limit: 10
    });

    renderTaskLayerResult(result);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#review-design-decision');

bindClickHandler(reviewProcurementRequirementButton, async () => {
  try {
    const result = await reviewProcurementRequirement({
      requirement: procurementRequirement ? procurementRequirement.value : '',
      limit: 10
    });

    renderTaskLayerResult(result);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#review-procurement-requirement');

const listWebMcpToolsButton = document.querySelector('#list-webmcp-tools');
const testWebMcpStatsButton = document.querySelector('#test-webmcp-stats');
const webMcpOutput = document.querySelector('#webmcp-output');

// Chromium exposes WebMCP testing hooks through navigator.modelContextTesting when available.
function getModelContextTesting() {
  return navigator.modelContextTesting || null;
}

if (listWebMcpToolsButton) {
  bindClickHandler(listWebMcpToolsButton, async () => {
    const testing = getModelContextTesting();

    if (!testing) {
      webMcpOutput.textContent =
        'WebMCP tools are registered, but navigator.modelContextTesting is not available. Use Chrome DevTools → Application → WebMCP to inspect tools.';
      return;
    }

    if (typeof testing.listTools !== 'function') {
      webMcpOutput.textContent =
        'navigator.modelContextTesting is available, but listTools() is not exposed in this browser build.';
      return;
    }

    try {
      const tools = await testing.listTools();
      webMcpOutput.textContent = JSON.stringify(tools, null, 2);
    }
    catch (error) {
      webMcpOutput.textContent = error.message;
    }
  }, '#list-webmcp-tools');
}

if (testWebMcpStatsButton) {
  bindClickHandler(testWebMcpStatsButton, async () => {
    const testing = getModelContextTesting();

    if (!testing) {
      webMcpOutput.textContent =
        'WebMCP tools are registered, but navigator.modelContextTesting is not available. Use Chrome DevTools → Application → WebMCP to test tool invocation.';
      return;
    }

    if (typeof testing.executeTool !== 'function') {
      webMcpOutput.textContent =
        'navigator.modelContextTesting is available, but executeTool() is not exposed in this browser build.';
      return;
    }

    try {
      const result = await testing.executeTool('wsg.stats', '{}');
      webMcpOutput.textContent = JSON.stringify(result, null, 2);
    }
    catch (error) {
      webMcpOutput.textContent = error.message;
    }
  }, '#test-webmcp-stats');
}

const checklistButton = document.querySelector('#generate-checklist');

// The checklist generators turn guideline text into draft review prompts for humans to refine.
bindClickHandler(checklistButton, async () => {
  try {
    const result = await generateReviewChecklist({
      topic: 'accessibility',
      role: 'procurement',
      limit: 10
    });

    renderTaskLayerResult(result);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#generate-checklist');

const starStatsButton = document.querySelector('#load-star-stats');
const starAlignmentButton = document.querySelector('#validate-star-alignment');
const checklistWithTestsButton = document.querySelector('#generate-checklist-with-tests');

// STAR actions stay separate because they depend on the second dataset and alignment checks.
bindClickHandler(starStatsButton, async () => {
  try {
    const result = await getStarStats();
    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#load-star-stats');

bindClickHandler(starAlignmentButton, async () => {
  try {
    const result = await validateStarAlignment();
    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#validate-star-alignment');

bindClickHandler(checklistWithTestsButton, async () => {
  try {
    const result = await generateReviewChecklistWithTests({
      topic: 'accessibility',
      role: 'procurement',
      limit: 10
    });

    renderTaskLayerResult(result);
  }
  catch (error) {
    output.textContent = error.message;
  }
}, '#generate-checklist-with-tests');
