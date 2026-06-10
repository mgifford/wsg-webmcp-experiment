// src/wsg-data.js

const GUIDELINES_URL = './data/guidelines.json';

let cachedData = null;
let cachedIndex = null;

export async function loadGuidelines() {
  if (cachedData) {
    return cachedData;
  }

  const response = await fetch(GUIDELINES_URL);

  if (!response.ok) {
    throw new Error(`Failed to load ${GUIDELINES_URL}`);
  }

  cachedData = await response.json();
  return cachedData;
}

export async function getIndex() {
  if (cachedIndex) {
    return cachedIndex;
  }

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
        const criterionId = makeCriterionId(guideline.id, criterion.title);

        criteria.push({
          id: criterionId,
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

export async function getCriterion(idOrTitle) {
  const index = await getIndex();
  const search = normalizeText(idOrTitle);

  return index.criteria.find((criterion) => {
    return (
      normalizeText(criterion.id) === search ||
      normalizeText(criterion.title) === search
    );
  }) || null;
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
  limit = 50
} = {}) {
  const matchingGuidelines = await searchGuidelines({
    query,
    tag,
    limit: 100
  });

  const resources = [];

  for (const guideline of matchingGuidelines) {
    for (const criterion of guideline.criteria || []) {
      for (const resource of normalizeResources(criterion.resources || [])) {
        resources.push({
          ...resource,
          criterionTitle: criterion.title,
          guidelineId: guideline.id,
          guideline: guideline.guideline,
          guidelineUrl: guideline.url,
          categoryName: guideline.categoryName
        });
      }
    }
  }

  return resources.slice(0, limit);
}

export async function generateConformanceClaimDraft({
  criteria = [],
  evaluator = '',
  project = '',
  notes = ''
} = {}) {
  const index = await getIndex();

  const selectedCriteria = criteria
    .map((criterion) => {
      const search = normalizeText(criterion);
      return index.criteria.find((item) =>
        normalizeText(item.id) === search ||
        normalizeText(item.title) === search
      );
    })
    .filter(Boolean);

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
      guideline: criterion.guideline,
      guidelineUrl: criterion.guidelineUrl,
      categoryName: criterion.categoryName
    })),
    notes
  };
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
  return String(value || '')
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
