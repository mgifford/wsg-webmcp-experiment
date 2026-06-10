import {
  getStats,
  searchGuidelines,
  listTags
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

function getModelContext() {
  return navigator.modelContext || document.modelContext || null;
}

if (listWebMcpToolsButton) {
  listWebMcpToolsButton.addEventListener('click', async () => {
    const modelContext = getModelContext();

    if (!modelContext) {
      webMcpOutput.textContent =
        'WebMCP is not available in this browser.';
      return;
    }

    if (typeof modelContext.getTools !== 'function') {
      webMcpOutput.textContent =
        'WebMCP is available, but this browser does not expose getTools(). The tools may still be registered for compatible agents.';
      return;
    }

    try {
      const tools = await modelContext.getTools();
      webMcpOutput.textContent = JSON.stringify(tools, null, 2);
    }
    catch (error) {
      webMcpOutput.textContent = error.message;
    }
  });
}

if (testWebMcpStatsButton) {
  testWebMcpStatsButton.addEventListener('click', async () => {
    const modelContext = getModelContext();

    if (!modelContext) {
      webMcpOutput.textContent =
        'WebMCP is not available in this browser.';
      return;
    }

    if (
      typeof modelContext.getTools !== 'function' ||
      typeof modelContext.executeTool !== 'function'
    ) {
      webMcpOutput.textContent =
        'WebMCP is available, but this browser does not expose tool discovery and execution APIs for page-level testing.';
      return;
    }

    try {
      const tools = await modelContext.getTools();
      const statsTool = tools.find((tool) => tool.name === 'wsg.stats');

      if (!statsTool) {
        webMcpOutput.textContent =
          'wsg.stats was not found in the registered WebMCP tools.';
        return;
      }

      const result = await modelContext.executeTool(statsTool, {});
      webMcpOutput.textContent = JSON.stringify(result, null, 2);
    }
    catch (error) {
      webMcpOutput.textContent = error.message;
    }
  });
}
