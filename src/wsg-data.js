// src/wsg-data.js

const GUIDELINES_URL = './data/guidelines.json';
let cachedData = null;
let cachedIndex = null;

const STAR_URL = './data/star.json';
let cachedStarData = null;
let cachedStarIndex = null;

// Cache the fetched WSG document so repeated reads do not refetch the JSON file.
export async function loadGuidelines() {
  if (cachedData) return cachedData;

  const response = await fetch(GUIDELINES_URL);

  if (!response.ok) {
    throw new Error(`Failed to load ${GUIDELINES_URL}`);
  }

  cachedData = await response.json();
  return cachedData;
}

// Build a searchable in-memory index that flattens the raw guideline JSON into tool-friendly records.
export async function getIndex() {
  if (cachedIndex) return cachedIndex;

  const data = await loadGuidelines();
  cachedIndex = buildIndex(data);

  return cachedIndex;
}

export function buildIndex(data) {
  const categories = data.category || [];
  const guidelines = [];
  const criteria = [];
  const tags = new Set();

  for (const category of categories) {
    for (const guideline of category.guidelines || []) {
      const guidelineRecord = {
        id: guideline.id,
        url: guideline.url,
        guideline: guideline.guideline,
        subheading: guideline.subheading || '',
        categoryId: category.id,
        categoryName: category.name,
        categoryShortName: category.shortName || category.name,
        benefits: guideline.benefits || [],
        gri: guideline.GRI || [],
        tags: guideline.tags || [],
        criteria: guideline.criteria || []
      };

      guidelines.push(guidelineRecord);

      for (const tag of guideline.tags || []) {
        tags.add(tag);
      }

      for (const criterion of guideline.criteria || []) {
        criteria.push({
          id: makeCriterionId(guideline.id, criterion.title),
          title: criterion.title,
          description: criterion.description || '',
          resources: normalizeResources(criterion.resources || []),
          guidelineId: guideline.id,
          guideline: guideline.guideline,
          guidelineUrl: guideline.url,
          categoryId: category.id,
          categoryName: category.name,
          tags: guideline.tags || [],
          benefits: guideline.benefits || [],
          gri: guideline.GRI || []
        });
      }
    }
  }

  return {
    title: data.title || 'Web Sustainability Guidelines',
    edition: data.edition || '',
    lastModified: data.lastModified || '',
    categories,
    guidelines,
    criteria,
    tags: Array.from(tags).sort()
  };
}

// Statistics are derived from the indexed data, not stored separately in the source JSON.
export async function getStats() {
  const index = await getIndex();

  return {
    title: index.title,
    edition: index.edition,
    lastModified: index.lastModified,
    categories: index.categories.length,
    guidelines: index.guidelines.length,
    criteria: index.criteria.length,
    tags: index.tags.length
  };
}

// Search is intentionally broad so the same function can back both human and WebMCP-facing queries.
export async function searchGuidelines({
  query = '',
  category = '',
  tag = '',
  limit = 20
} = {}) {
  const index = await getIndex();

  const normalizedQuery = normalizeText(query);
  const normalizedCategory = normalizeText(category);
  const normalizedTag = normalizeText(tag);

  const results = index.guidelines.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      normalizeText([
        item.id,
        item.guideline,
        item.subheading,
        item.categoryName,
        item.tags.join(' '),
        JSON.stringify(item.criteria),
        JSON.stringify(item.benefits),
        JSON.stringify(item.gri)
      ].join(' ')).includes(normalizedQuery);

    const matchesCategory =
      !normalizedCategory ||
      normalizeText(item.categoryName).includes(normalizedCategory) ||
      normalizeText(item.categoryShortName).includes(normalizedCategory);

    const matchesTag =
      !normalizedTag ||
      item.tags.some((itemTag) => normalizeText(itemTag) === normalizedTag);

    return matchesQuery && matchesCategory && matchesTag;
  });

  return results.slice(0, limit);
}

// Guideline and criterion lookups accept either IDs or exact titles to keep the tools forgiving.
export async function getGuideline(idOrTitle) {
  const index = await getIndex();
  const search = normalizeText(idOrTitle);

  return index.guidelines.find((guideline) =>
    normalizeText(guideline.id) === search ||
    normalizeText(guideline.guideline) === search
  ) || null;
}

export async function getCriterion(idOrTitle) {
  const index = await getIndex();
  const search = normalizeText(idOrTitle);

  return index.criteria.find((criterion) =>
    normalizeText(criterion.id) === search ||
    normalizeText(criterion.title) === search
  ) || null;
}

// Tag lookup keeps the original tag list intact so the UI can surface the canonical labels.
export async function listByTag(tag) {
  const index = await getIndex();
  const search = normalizeText(tag);

  return index.guidelines.filter((guideline) =>
    guideline.tags.some((itemTag) => normalizeText(itemTag) === search)
  );
}

export async function listTags() {
  const index = await getIndex();
  return index.tags;
}

// Resource lookup expands nested resource groups into a simple list that is easier for agents to consume.
export async function findResources({
  query = '',
  tag = '',
  guideline = '',
  limit = 50
} = {}) {
  let matchingGuidelines;

  if (guideline) {
    const item = await getGuideline(guideline);
    matchingGuidelines = item ? [item] : [];
  }
  else {
    matchingGuidelines = await searchGuidelines({
      query,
      tag,
      limit: 100
    });
  }

  const resources = [];

  for (const item of matchingGuidelines) {
    for (const criterion of item.criteria || []) {
      for (const resource of normalizeResources(criterion.resources || [])) {
        resources.push({
          ...resource,
          criterionTitle: criterion.title,
          guidelineId: item.id,
          guideline: item.guideline,
          guidelineUrl: item.url,
          categoryName: item.categoryName
        });
      }
    }
  }

  return resources.slice(0, limit);
}

// Draft questions stay phrased as prompts so humans can adapt them to their review process.
export async function suggestAuditQuestions({
  guideline = '',
  tag = '',
  query = '',
  limit = 25
} = {}) {
  const guidelines = guideline
    ? [await getGuideline(guideline)].filter(Boolean)
    : await searchGuidelines({ query, tag, limit: 10 });

  const questions = [];

  for (const item of guidelines) {
    for (const criterion of item.criteria || []) {
      questions.push({
        guidelineId: item.id,
        guideline: item.guideline,
        criterion: criterion.title,
        question: `Has the team ${toAuditPhrase(criterion.description)}`,
        sourceUrl: item.url
      });
    }
  }

  return {
    status: 'Draft audit questions only. Human review is required.',
    questions: questions.slice(0, limit)
  };
}

// Procurement output intentionally uses SHOULD language to keep the text draftable, not normative.
export async function suggestProcurementRequirements({
  guideline = '',
  tag = '',
  query = '',
  limit = 25
} = {}) {
  const guidelines = guideline
    ? [await getGuideline(guideline)].filter(Boolean)
    : await searchGuidelines({ query, tag, limit: 10 });

  const requirements = [];

  for (const item of guidelines) {
    for (const criterion of item.criteria || []) {
      requirements.push({
        guidelineId: item.id,
        guideline: item.guideline,
        criterion: criterion.title,
        requirement: `The supplier SHOULD ${toRequirementPhrase(criterion.description)}`,
        sourceUrl: item.url
      });
    }
  }

  return {
    status: 'Draft procurement language only. Legal and procurement review is required.',
    requirements: requirements.slice(0, limit)
  };
}

// Conformance claims are assembled from selected criteria and clearly marked as draft-only.
export async function generateConformanceClaimDraft({
  criteria = [],
  guidelines = [],
  evaluator = '',
  project = '',
  notes = ''
} = {}) {
  const index = await getIndex();

  const selectedCriteria = [];

  for (const criterion of criteria) {
    const found = await getCriterion(criterion);
    if (found) selectedCriteria.push(found);
  }

  for (const guideline of guidelines) {
    const foundGuideline = await getGuideline(guideline);

    if (foundGuideline) {
      for (const criterion of foundGuideline.criteria || []) {
        selectedCriteria.push({
          id: makeCriterionId(foundGuideline.id, criterion.title),
          title: criterion.title,
          description: criterion.description || '',
          guidelineId: foundGuideline.id,
          guideline: foundGuideline.guideline,
          guidelineUrl: foundGuideline.url,
          categoryName: foundGuideline.categoryName,
          tags: foundGuideline.tags || []
        });
      }
    }
  }

  return {
    title: 'Draft WSG Conformance Claim',
    status: 'Draft only. This does not certify conformance.',
    generatedDate: new Date().toISOString().split('T')[0],
    project,
    evaluator,
    source: {
      title: index.title,
      edition: index.edition,
      lastModified: index.lastModified
    },
    criteria: selectedCriteria.map((criterion) => ({
      id: criterion.id,
      title: criterion.title,
      guidelineId: criterion.guidelineId,
      guideline: criterion.guideline,
      guidelineUrl: criterion.guidelineUrl,
      categoryName: criterion.categoryName
    })),
    notes
  };
}

function toAuditPhrase(description) {
  return String(description || '')
    .trim()
    .replace(/\.$/, '')
    .replace(/^Ensure /i, 'ensured ')
    .replace(/^Identify /i, 'identified ')
    .replace(/^Evaluate /i, 'evaluated ')
    .replace(/^Use /i, 'used ')
    .replace(/^Avoid /i, 'avoided ')
    .replace(/^Remove /i, 'removed ')
    .replace(/^Minimize /i, 'minimized ')
    .replace(/^Provide /i, 'provided ')
    + '?';
}

function toRequirementPhrase(description) {
  return String(description || '')
    .trim()
    .replace(/\.$/, '')
    .replace(/^Ensure /i, 'ensure ')
    .replace(/^Identify /i, 'identify ')
    .replace(/^Evaluate /i, 'evaluate ')
    .replace(/^Use /i, 'use ')
    .replace(/^Avoid /i, 'avoid ')
    .replace(/^Remove /i, 'remove ')
    .replace(/^Minimize /i, 'minimize ')
    .replace(/^Provide /i, 'provide ');
}

function makeCriterionId(guidelineId, title) {
  return `${guidelineId}-${slugify(title)}`;
}

function normalizeResources(resources) {
  const normalized = [];

  for (const resourceGroup of resources) {
    for (const [title, url] of Object.entries(resourceGroup)) {
      normalized.push({ title, url });
    }
  }

  return normalized;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateReviewChecklist({
  topic = '',
  role = '',
  limit = 10
} = {}) {
  const guidelines = await searchGuidelines({
    query: topic,
    limit
  });

  const items = [];

  for (const guideline of guidelines) {
    if (items.length >= limit) {
      break;
    }

    for (const criterion of guideline.criteria || []) {
      items.push({
        question: `Has the team ${criterion.description
          .replace(/\.$/, '')
          .toLowerCase()}?`,
        guidelineId: guideline.id,
        guideline: guideline.guideline,
        criterion: criterion.title,
        sourceUrl: guideline.url
      });

      if (items.length >= limit) {
        break;
      }
    }
  }

  return {
    status:
      'Draft checklist only. Human review required.',
    topic,
    role,
    items
  };
}

// STAR data follows the same caching and indexing pattern so alignment checks stay fast.
export async function loadStar() {
  if (cachedStarData) return cachedStarData;

  const response = await fetch(STAR_URL);

  if (!response.ok) {
    throw new Error(`Failed to load ${STAR_URL}`);
  }

  cachedStarData = await response.json();
  return cachedStarData;
}

// The STAR index mirrors the WSG index so both datasets can be queried with similar helper functions.
export async function getStarIndex() {
  if (cachedStarIndex) return cachedStarIndex;

  const star = await loadStar();
  cachedStarIndex = buildStarIndex(star);

  return cachedStarIndex;
}

export function buildStarIndex(star) {
  const techniques = [];

  for (const category of star.category || []) {
    for (const technique of category.techniques || []) {
      const wsgLinks = extractWsgLinks(technique.applicability || '');

      techniques.push({
        id: technique.id,
        title: technique.title,
        categoryId: category.id,
        categoryName: category.name,
        categoryShortName: category.shortName || category.name,
        applicability: technique.applicability || '',
        wsgLinks,
        description: flattenNumberedObjects(technique.description || []),
        examples: flattenNumberedObjects(technique.examples || []),
        tests: technique.tests || [],
        testSuite: technique.testSuite || ''
      });
    }
  }

  return {
    title: star.title || 'Sustainable Tooling And Reporting',
    edition: star.edition || '',
    lastModified: star.lastModified || '',
    techniques
  };
}

// STAR statistics summarize the secondary dataset used by the review-checklist helpers.
export async function getStarStats() {
  const star = await getStarIndex();

  return {
    title: star.title,
    edition: star.edition,
    lastModified: star.lastModified,
    techniques: star.techniques.length
  };
}

// Alignment checks compare STAR links against the current WSG anchor set.
export async function validateStarAlignment() {
  const wsg = await getIndex();
  const star = await getStarIndex();

  const wsgHashes = new Set(
    wsg.guidelines
      .map((guideline) => getUrlHash(guideline.url))
      .filter(Boolean)
  );

  const issues = [];

  for (const technique of star.techniques) {
    for (const link of technique.wsgLinks) {
      const hash = getUrlHash(link.url);

      if (!hash || !wsgHashes.has(hash)) {
        issues.push({
          techniqueId: technique.id,
          techniqueTitle: technique.title,
          problem: 'STAR technique links to a WSG anchor that was not found in guidelines.json.',
          url: link.url
        });
      }
    }
  }

  return {
    status: issues.length === 0
      ? 'No STAR-to-WSG anchor alignment problems found.'
      : 'Potential STAR-to-WSG alignment problems found.',
    wsgGuidelines: wsg.guidelines.length,
    starTechniques: star.techniques.length,
    issues
  };
}

// Technique search returns STAR entries that match either the query text or a specific WSG guideline.
export async function findStarTechniques({
  query = '',
  guideline = '',
  limit = 20
} = {}) {
  const star = await getStarIndex();
  const normalizedQuery = normalizeText(query);
  let guidelineHash = '';

  if (guideline) {
    const wsgGuideline = await getGuideline(guideline);
    guidelineHash = wsgGuideline ? getUrlHash(wsgGuideline.url) : '';
  }

  const results = star.techniques.filter((technique) => {
    const matchesQuery =
      !normalizedQuery ||
      normalizeText([
        technique.id,
        technique.title,
        technique.applicability,
        technique.description.join(' '),
        technique.examples.join(' '),
        JSON.stringify(technique.tests)
      ].join(' ')).includes(normalizedQuery);

    const matchesGuideline =
      !guidelineHash ||
      technique.wsgLinks.some((link) => getUrlHash(link.url) === guidelineHash);

    return matchesQuery && matchesGuideline;
  });

  return results.slice(0, limit);
}

// Review checklists with tests combine the WSG prompt with the STAR techniques for each matched guideline.
export async function generateReviewChecklistWithTests({
  topic = '',
  role = '',
  guideline = '',
  limit = 10
} = {}) {
  const guidelines = guideline
    ? [await getGuideline(guideline)].filter(Boolean)
    : await searchGuidelines({ query: topic, limit });

  const items = [];

  for (const item of guidelines) {
    const starTechniques = await findStarTechniques({
      guideline: item.id,
      limit: 10
    });

    for (const criterion of item.criteria || []) {
      items.push({
        question: `Has the team ${toAuditPhrase(criterion.description)}`,
        guidelineId: item.id,
        guideline: item.guideline,
        criterion: criterion.title,
        sourceUrl: item.url,
        starTechniques: starTechniques.map((technique) => ({
          id: technique.id,
          title: technique.title,
          tests: technique.tests,
          testSuite: technique.testSuite
        }))
      });

      if (items.length >= limit) break;
    }

    if (items.length >= limit) break;
  }

  return {
    status: 'Draft checklist with STAR techniques. Human review required.',
    topic,
    role,
    guideline,
    items
  };
}

function extractWsgLinks(markdown) {
  const links = [];
  const regex = /\[([^\]]+)\]\((https:\/\/www\.w3\.org\/TR\/web-sustainability-guidelines\/#[^)]+)\)/g;

  let match;

  while ((match = regex.exec(markdown)) !== null) {
    links.push({
      label: match[1],
      url: match[2]
    });
  }

  return links;
}

function getUrlHash(url) {
  return String(url || '').split('#')[1] || '';
}

function flattenNumberedObjects(items) {
  const values = [];

  for (const item of items) {
    for (const value of Object.values(item)) {
      values.push(value);
    }
  }

  return values;
}
