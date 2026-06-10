// src/wsg-data.js

const GUIDELINES_URL = './data/guidelines.json';

let cachedData = null;
let cachedIndex = null;

export async function loadGuidelines() {
  if (cachedData) return cachedData;

  const response = await fetch(GUIDELINES_URL);

  if (!response.ok) {
    throw new Error(`Failed to load ${GUIDELINES_URL}`);
  }

  cachedData = await response.json();
  return cachedData;
}

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
