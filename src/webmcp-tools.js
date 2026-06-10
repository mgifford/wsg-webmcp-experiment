import {
  searchGuidelines,
  listByTag,
  getStats
} from './wsg-data.js';

function getBrowserName() {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox')) {
    return 'Firefox';
  }

  if (ua.includes('Edg/')) {
    return 'Edge';
  }

  if (ua.includes('Chrome')) {
    return 'Chrome';
  }

  if (ua.includes('Safari')) {
    return 'Safari';
  }

  return 'this browser';
}

function getUnavailableMessage() {
  const browser = getBrowserName();

  if (browser === 'Firefox') {
    return 'WebMCP not available in Firefox. The page still works as a normal JavaScript demo, but WebMCP tools are not exposed to AI agents.';
  }

  if (browser === 'Chrome' || browser === 'Edge') {
    return 'WebMCP not available. In supported Chromium builds, check whether WebMCP testing is enabled.';
  }

  return 'WebMCP not available in this browser. The page still works as a normal JavaScript demo.';
}

export async function registerWsgTools() {
  const status = document.querySelector('#webmcp-status');
  const modelContext = navigator.modelContext || document.modelContext;

  if (!modelContext) {
    status.textContent = getUnavailableMessage();
    console.log('WebMCP not available');
    return;
  }

  status.textContent = 'WebMCP available. WSG tools registered.';
  console.log('WebMCP available');

  await modelContext.registerTool({
    name: 'wsg.search',
    description: 'Search Web Sustainability Guidelines.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    readOnlyHint: true,
    execute: async ({ query }) => searchGuidelines({ query })
  });

  await modelContext.registerTool({
    name: 'wsg.list_by_tag',
    description: 'List WSG guidelines by tag.',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string' }
      },
      required: ['tag']
    },
    readOnlyHint: true,
    execute: async ({ tag }) => listByTag(tag)
  });

  await modelContext.registerTool({
    name: 'wsg.stats',
    description: 'Show WSG statistics.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    readOnlyHint: true,
    execute: async () => getStats()
  });
}
