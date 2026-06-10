import {
  searchGuidelines,
  getGuideline,
  getCriterion,
  listByTag,
  findResources,
  getStats,
  suggestAuditQuestions,
  suggestProcurementRequirements,
  generateConformanceClaimDraft
} from './wsg-data.js';

export async function registerWsgTools() {
  const status = document.querySelector('#webmcp-status');
  const modelContext = navigator.modelContext || document.modelContext;

  if (!modelContext) {
    if (status) {
      status.textContent = getUnavailableMessage();
    }

    console.log('WebMCP not available');
    return;
  }

  await registerTool(modelContext, {
    name: 'wsg.search',
    description: 'Search Web Sustainability Guidelines by keyword, category, or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        category: { type: 'string' },
        tag: { type: 'string' },
        limit: { type: 'number' }
      }
    },
    readOnlyHint: true,
    execute: async (input) => searchGuidelines(input)
  });

  await registerTool(modelContext, {
    name: 'wsg.get_guideline',
    description: 'Get a full WSG guideline by ID or exact title.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    readOnlyHint: true,
    execute: async ({ id }) => getGuideline(id)
  });

  await registerTool(modelContext, {
    name: 'wsg.get_criterion',
    description: 'Get a WSG success criterion by generated ID or exact title.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      },
      required: ['id']
    },
    readOnlyHint: true,
    execute: async ({ id }) => getCriterion(id)
  });

  await registerTool(modelContext, {
    name: 'wsg.list_by_tag',
    description: 'List WSG guidelines connected to a tag.',
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

  await registerTool(modelContext, {
    name: 'wsg.find_resources',
    description: 'Find supporting WSG resources by query, tag, or guideline ID.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        tag: { type: 'string' },
        guideline: { type: 'string' },
        limit: { type: 'number' }
      }
    },
    readOnlyHint: true,
    execute: async (input) => findResources(input)
  });

  await registerTool(modelContext, {
    name: 'wsg.suggest_audit_questions',
    description: 'Generate draft audit questions from WSG guidelines or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        guideline: { type: 'string' },
        tag: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' }
      }
    },
    readOnlyHint: true,
    execute: async (input) => suggestAuditQuestions(input)
  });

  await registerTool(modelContext, {
    name: 'wsg.suggest_procurement_requirements',
    description: 'Generate draft procurement requirements from WSG guidelines or tags.',
    inputSchema: {
      type: 'object',
      properties: {
        guideline: { type: 'string' },
        tag: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' }
      }
    },
    readOnlyHint: true,
    execute: async (input) => suggestProcurementRequirements(input)
  });

  await registerTool(modelContext, {
    name: 'wsg.generate_conformance_claim_draft',
    description: 'Generate a draft WSG conformance claim. This does not certify conformance.',
    inputSchema: {
      type: 'object',
      properties: {
        criteria: {
          type: 'array',
          items: { type: 'string' }
        },
        guidelines: {
          type: 'array',
          items: { type: 'string' }
        },
        evaluator: { type: 'string' },
        project: { type: 'string' },
        notes: { type: 'string' }
      }
    },
    readOnlyHint: true,
    execute: async (input) => generateConformanceClaimDraft(input)
  });

  await registerTool(modelContext, {
    name: 'wsg.stats',
    description: 'Show WSG data statistics.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    readOnlyHint: true,
    execute: async () => getStats()
  });

  if (status) {
    status.textContent = 'WebMCP available. WSG tools registered.';
  }
}

async function registerTool(modelContext, toolDefinition) {
  await modelContext.registerTool(toolDefinition);
  console.log(`Registered ${toolDefinition.name}`);
}

function getBrowserName() {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';

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
