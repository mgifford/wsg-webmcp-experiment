import {
  searchGuidelines,
  getCriterion,
  listByTag,
  findResources,
  getStats
} from './wsg-data.js';

export async function registerWsgTools() {

  if (!navigator.modelContext) {
    console.log('WebMCP not available');
    return;
  }

  await navigator.modelContext.registerTool({
    name: 'wsg.search',
    description: 'Search Web Sustainability Guidelines',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      }
    },
    readOnlyHint: true,
    execute: async ({ query }) => {
      return await searchGuidelines({ query });
    }
  });

  await navigator.modelContext.registerTool({
    name: 'wsg.list_by_tag',
    description: 'List WSG guidelines by tag',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string' }
      }
    },
    readOnlyHint: true,
    execute: async ({ tag }) => {
      return await listByTag(tag);
    }
  });

  await navigator.modelContext.registerTool({
    name: 'wsg.stats',
    description: 'Show WSG statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    readOnlyHint: true,
    execute: async () => {
      return await getStats();
    }
  });
}
