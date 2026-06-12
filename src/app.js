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
const webMcpCapabilities = document.querySelector('#webmcp-capabilities');

function bindClickHandler(element, handler, description) {
  if (!element) {
    console.warn(`Missing element for ${description}`);
    return;
  }

  element.addEventListener('click', handler);
}

function renderWebMcpCapabilities() {
  if (!webMcpCapabilities) {
    return;
  }

  const modelContext = navigator.modelContext || document.modelContext;
  const testing = navigator.modelContextTesting || null;
  const container = document.createElement('div');
  container.className = 'stack';

  const badge = document.createElement('p');
  badge.className = 'webmcp-capabilities__badge';
  badge.textContent = modelContext ? 'WebMCP enabled' : 'WebMCP unavailable';
  container.append(badge);

  const title = document.createElement('h3');
  title.className = 'webmcp-capabilities__title';
  title.textContent = modelContext
    ? 'What WebMCP adds in this browser'
    : 'What WebMCP would add in a supported browser';
  container.append(title);

  const list = document.createElement('ul');
  list.className = 'webmcp-capabilities__list';

  const items = modelContext
    ? [
        'Compatible agents can discover the registered WSG tools on this page.',
        'The status banner above changes when the browser exposes WebMCP registration.',
        testing && typeof testing.listTools === 'function'
          ? 'The diagnostics section can list the exposed tools in supported Chromium builds.'
          : 'The diagnostics section explains how to inspect the tool registry in the browser developer tools.'
      ]
    : [
        'The page still works as a normal JavaScript demo.',
        'WebMCP tools are not exposed to compatible agents in this browser.',
        'Firefox and other unsupported browsers keep the same search, review, and checklist features.'
      ];

  for (const itemText of items) {
    const item = document.createElement('li');
    item.textContent = itemText;
    list.append(item);
  }

  container.append(list);

  const actions = document.createElement('div');
  actions.className = 'webmcp-capabilities__actions';

  const toolsLink = document.createElement('a');
  toolsLink.className = 'button secondary';
  toolsLink.href = '#registered-webmcp-tools';
  toolsLink.textContent = 'View registered tools';
  actions.append(toolsLink);

  const diagnosticsLink = document.createElement('a');
  diagnosticsLink.className = 'button secondary';
  diagnosticsLink.href = '#webmcp-diagnostics';
  diagnosticsLink.textContent = 'Open diagnostics';
  actions.append(diagnosticsLink);

  container.append(actions);
  webMcpCapabilities.replaceChildren(container);
}

renderWebMcpCapabilities();

function renderTaskLayerResult(result) {
  if (!output) {
    return;
  }

  if (Array.isArray(result.items)) {
    renderChecklistResult(result);
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

function renderChecklistResult(result) {
  const container = document.createElement('div');
  container.className = 'stack';

  const summary = document.createElement('p');
  summary.className = 'lede';
  summary.textContent = buildTaskLayerSummary(result);
  container.append(summary);

  const resourcesToggle = buildChecklistResourcesToggle(result.items || []);
  if (resourcesToggle) {
    container.append(resourcesToggle);
  }

  const checklistSection = document.createElement('section');
  checklistSection.className = 'stack';

  checklistSection.append(buildSectionHeading('Checklist items'));
  checklistSection.append(buildChecklistList(result.items || []));
  container.append(checklistSection);

  const detailsSection = document.createElement('section');
  detailsSection.className = 'stack';
  detailsSection.append(buildSectionHeading('Source guideline links'));
  detailsSection.append(buildSourceLinkList(buildTaskLayerSourceLinks(result)));
  container.append(detailsSection);

  container.append(buildRawJsonDetails(result));

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

function buildChecklistList(items) {
  const list = document.createElement('ul');
  list.className = 'checklist-list';

  if (!items.length) {
    const item = document.createElement('li');
    item.textContent = 'No checklist items were returned.';
    list.append(item);
    return list;
  }

  for (const [index, item] of items.entries()) {
    list.append(buildChecklistItem(item, index));
  }

  return list;
}

function buildChecklistItem(item, index) {
  const listItem = document.createElement('li');
  listItem.className = 'checklist-item';

  const label = document.createElement('label');
  label.className = 'checklist-item__label';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.disabled = true;
  checkbox.className = 'checklist-item__checkbox';
  checkbox.setAttribute('aria-label', `Checklist item ${index + 1}`);

  const content = document.createElement('div');
  content.className = 'checklist-item__content';

  const question = document.createElement('span');
  question.className = 'checklist-item__question';
  question.textContent = item.question || `Checklist item ${index + 1}`;
  content.append(question);

  const meta = buildChecklistMeta(item);
  if (meta) {
    content.append(meta);
  }

  label.append(checkbox, content);
  listItem.append(label);

  const resources = buildChecklistResources(item);
  if (resources) {
    listItem.append(resources);
  }

  const starTechniques = buildChecklistStarTechniques(item);
  if (starTechniques) {
    listItem.append(starTechniques);
  }

  return listItem;
}

function buildChecklistResourcesToggle(items) {
  const itemsWithResources = items.filter((item) => item.resources && item.resources.length);

  if (!itemsWithResources.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'checklist-toolbar';

  const label = document.createElement('p');
  label.className = 'checklist-toolbar__label';
  label.textContent = `Supporting resources are hidden for ${itemsWithResources.length} checklist items.`;
  wrapper.append(label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'checklist-toolbar__button';
  button.setAttribute('aria-expanded', 'false');
  button.textContent = 'Show supporting resources';

  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !isExpanded;
    const resourceGroups = document.querySelectorAll('.checklist-item__resources');

    for (const group of resourceGroups) {
      group.hidden = !nextExpanded;
    }

    button.setAttribute('aria-expanded', String(nextExpanded));
    button.textContent = nextExpanded ? 'Hide supporting resources' : 'Show supporting resources';
  });

  wrapper.append(button);
  return wrapper;
}

function buildChecklistMeta(item) {
  const pieces = [];

  if (item.categoryName) {
    pieces.push(`Category: ${item.categoryName}`);
  }

  if (item.tags && item.tags.length) {
    pieces.push(`Tags: ${item.tags.join(', ')}`);
  }

  if (item.benefits && item.benefits.length) {
    pieces.push(`Benefits: ${item.benefits.join(', ')}`);
  }

  if (item.gri && item.gri.length) {
    pieces.push(`GRI: ${item.gri.join(', ')}`);
  }

  if (!pieces.length) {
    return null;
  }

  const meta = document.createElement('p');
  meta.className = 'checklist-item__meta';
  meta.textContent = pieces.join(' · ');
  return meta;
}

function buildChecklistResources(item) {
  if (!item.resources || !item.resources.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'checklist-item__group checklist-item__resources';
  wrapper.hidden = true;

  const heading = document.createElement('p');
  heading.className = 'checklist-item__group-label';
  heading.textContent = `Supporting resources (${item.resources.length})`;
  wrapper.append(heading);

  const list = document.createElement('ul');
  list.className = 'checklist-item__sublist';

  for (const resource of item.resources) {
    const resourceItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = resource.url;
    link.textContent = resource.title;
    resourceItem.append(link);
    list.append(resourceItem);
  }

  wrapper.append(list);

  return wrapper;
}

function buildChecklistStarTechniques(item) {
  if (!item.starTechniques || !item.starTechniques.length) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'checklist-item__group';

  const heading = document.createElement('p');
  heading.className = 'checklist-item__group-label';
  heading.textContent = 'Related STAR techniques';
  wrapper.append(heading);

  const list = document.createElement('ul');
  list.className = 'checklist-item__sublist';

  for (const technique of item.starTechniques) {
    const techniqueItem = document.createElement('li');

    const techniqueTitle = document.createElement('strong');
    techniqueTitle.textContent = technique.title;
    techniqueItem.append(techniqueTitle);

    if (technique.testSuite) {
      const suite = document.createElement('span');
      suite.className = 'checklist-item__subtext';
      suite.textContent = ` ${technique.testSuite}`;
      techniqueItem.append(suite);
    }

    if (technique.tests && technique.tests.length) {
      const tests = document.createElement('span');
      tests.className = 'checklist-item__subtext';
      tests.textContent = ` Tests: ${technique.tests.join(', ')}`;
      techniqueItem.append(tests);
    }

    list.append(techniqueItem);
  }

  wrapper.append(list);
  return wrapper;
}

function buildRawJsonDetails(result) {
  const details = document.createElement('details');
  const detailsSummary = document.createElement('summary');
  detailsSummary.textContent = 'Raw JSON';
  details.append(detailsSummary);

  const rawJson = document.createElement('pre');
  rawJson.className = 'results';
  rawJson.textContent = JSON.stringify(result, null, 2);
  details.append(rawJson);

  return details;
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
    const scope = result.category || result.topic;
    const scopeText = scope ? ` for ${scope}` : '';

    return `${result.status} This draft includes ${result.items.length} checklist items${scopeText}.`;
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
const checklistUxButton = document.querySelector('#generate-checklist-ux');
const checklistWebDevelopmentButton = document.querySelector('#generate-checklist-web-development');
const checklistHostingButton = document.querySelector('#generate-checklist-hosting');
const checklistBusinessButton = document.querySelector('#generate-checklist-business');

function bindChecklistPresetButton(element, options, description) {
  bindClickHandler(element, async () => {
    try {
      const result = await generateReviewChecklist(options);
      renderTaskLayerResult(result);
    }
    catch (error) {
      output.textContent = error.message;
    }
  }, description);
}

// The checklist generators turn guideline text into draft review prompts for humans to refine.
bindChecklistPresetButton(checklistButton, {
  topic: 'accessibility',
  role: 'procurement',
  limit: 10
}, '#generate-checklist');

bindChecklistPresetButton(checklistUxButton, {
  category: 'UX Design',
  role: 'ux design',
  limit: 10
}, '#generate-checklist-ux');

bindChecklistPresetButton(checklistWebDevelopmentButton, {
  category: 'Web Development',
  role: 'web development',
  limit: 10
}, '#generate-checklist-web-development');

bindChecklistPresetButton(checklistHostingButton, {
  category: 'Hosting and Infrastructure',
  role: 'hosting and infrastructure',
  limit: 10
}, '#generate-checklist-hosting');

bindChecklistPresetButton(checklistBusinessButton, {
  category: 'Business Strategy And Product Management',
  role: 'business and project management',
  limit: 10
}, '#generate-checklist-business');

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
