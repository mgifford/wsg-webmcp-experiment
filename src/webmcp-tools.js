import {
  searchGuidelines,
  listByTag,
  getStats
} from './wsg-data.js';

export async function registerWsgTools() {
  const status = document.querySelector('#webmcp-status');
  const modelContext = navigator.modelContext || document.modelContext;

  if (!modelContext) {
    status.textContent = 'WebMCP not available. In Chrome, check chrome://flags/#enable-webmcp-testing.';
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
