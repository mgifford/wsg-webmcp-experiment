import {
  searchGuidelines,
  getCriterion,
  listByTag,
  findResources,
  getStats
} from './wsg-data.js';

export async function registerWsgTools() {
  const status = document.querySelector('#webmcp-status');

  const modelContext = navigator.modelContext || document.modelContext;

  if (!modelContext) {
    console.log('WebMCP not available');

    if (status) {
      status.textContent = 'WebMCP not available in this browser.';
    }

    return;
  }

  if (status) {
    status.textContent = 'WebMCP available. Registering WSG tools...';
  }

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
    execute: async ({ query }) => {
      return await searchGuidelines({ query });
    }
  });

  console.log('Registered wsg.search');

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
    execute: async ({ tag }) => {
      return await listByTag(tag);
    }
  });

  console.log('Registered wsg.list_by_tag');

  await modelContext.registerTool({
    name: 'wsg.stats',
    description: 'Show WSG data statistics.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    readOnlyHint: true,
    execute: async () => {
      return await getStats();
    }
  });

  console.log('Registered wsg.stats');

  if (status) {
    status.textContent = 'WebMCP available. WSG tools registered.';
  }
}
