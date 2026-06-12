import {
  getStats,
  searchGuidelines,
  listTags,
  generateReviewChecklist,
  generateReviewChecklistWithTests,
  validateStarAlignment,
  getStarStats
} from './wsg-data.js';

import { registerWsgTools } from './webmcp-tools.js';

registerWsgTools();

const output = document.querySelector('#output');
const button = document.querySelector('#load-stats');

button.addEventListener('click', async () => {
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
});

const searchButton = document.querySelector('#search-wsg');
const searchInput = document.querySelector('#search-query');

searchButton.addEventListener('click', async () => {
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
});

const listWebMcpToolsButton = document.querySelector('#list-webmcp-tools');
const testWebMcpStatsButton = document.querySelector('#test-webmcp-stats');
const webMcpOutput = document.querySelector('#webmcp-output');

function getModelContextTesting() {
  return navigator.modelContextTesting || null;
}

if (listWebMcpToolsButton) {
  listWebMcpToolsButton.addEventListener('click', async () => {
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
  });
}

if (testWebMcpStatsButton) {
  testWebMcpStatsButton.addEventListener('click', async () => {
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
  });
}

const checklistButton = document.querySelector('#generate-checklist');

checklistButton?.addEventListener('click', async () => {
  try {
    const result = await generateReviewChecklist({
      topic: 'accessibility',
      role: 'procurement',
      limit: 10
    });

    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
});

const starStatsButton = document.querySelector('#load-star-stats');
const starAlignmentButton = document.querySelector('#validate-star-alignment');
const checklistWithTestsButton = document.querySelector('#generate-checklist-with-tests');

starStatsButton?.addEventListener('click', async () => {
  try {
    const result = await getStarStats();
    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
});

starAlignmentButton?.addEventListener('click', async () => {
  try {
    const result = await validateStarAlignment();
    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
});

checklistWithTestsButton?.addEventListener('click', async () => {
  try {
    const result = await generateReviewChecklistWithTests({
      topic: 'accessibility',
      role: 'procurement',
      limit: 10
    });

    output.textContent = JSON.stringify(result, null, 2);
  }
  catch (error) {
    output.textContent = error.message;
  }
});
