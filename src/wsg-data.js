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

function buildStarTechniquesByGuidelineHash(techniques) {
  const mapping = new Map();

  for (const technique of techniques || []) {
    for (const link of technique.wsgLinks || []) {
      const hash = getUrlHash(link.url);

      if (!hash) {
        continue;
      }

      const current = mapping.get(hash) || [];
      current.push(technique);
      mapping.set(hash, current);
    }
  }

  return mapping;
}

function buildGuidelineSearchText(guideline, relatedStarTechniques) {
  return normalizeText([
    guideline.id,
    guideline.guideline,
    guideline.subheading,
    guideline.categoryName,
    guideline.categoryShortName,
    guideline.tags.join(' '),
    guideline.benefits.join(' '),
    guideline.criteria.map((criterion) => `${criterion.title} ${criterion.description || ''}`).join(' '),
    buildStarTechniqueSearchText(relatedStarTechniques)
  ].join(' '));
}

function buildStarTechniqueSearchText(techniques) {
  return normalizeText((techniques || []).map((technique) => [
    technique.title,
    technique.applicability,
    technique.description.join(' '),
    technique.examples.join(' '),
    technique.tests.join(' '),
    technique.testSuite
  ].join(' ')).join(' '));
}

function buildRelevanceReason({ criterionMatches, guidelineMatches, starMatches }) {
  const reasons = [];

  if (criterionMatches.length) {
    reasons.push(`Matched ${formatKeywordList(criterionMatches)} in criterion text.`);
  }

  if (guidelineMatches.length) {
    reasons.push(`Matched ${formatKeywordList(guidelineMatches)} in guideline title, subheading, tags, or benefits.`);
  }

  if (starMatches.length) {
    reasons.push(`Matched ${formatKeywordList(starMatches)} in related STAR techniques.`);
  }

  return reasons.join(' ');
}

function collectSearchTerms(value) {
  const terms = new Set();

  for (const term of normalizeText(value).split(/[^a-z0-9]+/g)) {
    if (term.length < 3) {
      continue;
    }

    terms.add(term);

    for (const variant of expandSearchTerm(term)) {
      terms.add(variant);
    }
  }

  return Array.from(terms);
}

function expandSearchTerm(term) {
  const variants = [];

  if (term.length > 5 && term.endsWith('ing')) {
    variants.push(term.slice(0, -3));
  }

  if (term.length > 4 && term.endsWith('ed')) {
    variants.push(term.slice(0, -2));
  }

  if (term.length > 4 && term.endsWith('es')) {
    variants.push(term.slice(0, -2));
  }

  if (term.length > 3 && term.endsWith('s')) {
    variants.push(term.slice(0, -1));
  }

  return variants.filter(Boolean);
}

function matchSearchTerms(text, terms) {
  const normalizedText = normalizeText(text);

  return terms.filter((term) => normalizedText.includes(term));
}

function formatKeywordList(terms) {
  return terms.map((term) => `"${term}"`).join(', ');
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

export async function findRelevantGuidance({
  description = '',
  limit = 10
} = {}) {
  const index = await getIndex();
  const star = await getStarIndex();
  const searchTerms = collectSearchTerms(description);
  const starTechniquesByGuidelineHash = buildStarTechniquesByGuidelineHash(star.techniques);
  const matches = [];

  for (const guideline of index.guidelines) {
    const relatedStarTechniques = starTechniquesByGuidelineHash.get(getUrlHash(guideline.url)) || [];
    const guidelineText = buildGuidelineSearchText(guideline, relatedStarTechniques);
    const guidelineMatches = matchSearchTerms(guidelineText, searchTerms);

    for (const criterion of guideline.criteria || []) {
      const criterionText = `${criterion.title} ${criterion.description || ''}`;
      const criterionMatches = matchSearchTerms(criterionText, searchTerms);
      const starMatches = matchSearchTerms(buildStarTechniqueSearchText(relatedStarTechniques), searchTerms);
      const matchedTerms = Array.from(new Set([
        ...criterionMatches,
        ...guidelineMatches,
        ...starMatches
      ]));

      if (!matchedTerms.length) {
        continue;
      }

      const score = (criterionMatches.length * 4) + (guidelineMatches.length * 2) + (starMatches.length * 2);

      matches.push({
        score,
        guidelineId: guideline.id,
        guideline: guideline.guideline,
        criterion: criterion.title,
        reason: buildRelevanceReason({
          criterionMatches,
          guidelineMatches,
          starMatches
        }),
        tags: guideline.tags || [],
        sourceUrl: guideline.url
      });
    }
  }

  matches.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.guidelineId !== right.guidelineId) return left.guidelineId.localeCompare(right.guidelineId);
    return left.criterion.localeCompare(right.criterion);
  });

  return {
    status: 'Draft relevance results. Human review required.',
    description,
    matches: matches.slice(0, limit).map(({ score, ...match }) => match)
  };
}

export async function reviewDesignDecision({
  description = '',
  limit = 10
} = {}) {
  const relevantGuidanceResults = await findRelevantGuidance({ description, limit });
  const normalizedDescription = normalizeText(description);
  const potentialConcerns = findPotentialConcerns(normalizedDescription);
  const relevantGuidance = relevantGuidanceResults.matches.map((match) => ({
    guidelineId: match.guidelineId,
    guideline: match.guideline,
    criterion: match.criterion,
    reason: match.reason,
    tags: match.tags,
    sourceUrl: match.sourceUrl
  }));
  const starTechniques = await getRelatedStarTechniques(relevantGuidance, limit);
  const suggestedQuestions = buildDesignReviewQuestions({
    potentialConcerns,
    relevantGuidance,
    starTechniques
  });

  return {
    status: 'Draft design review only. Human review required.',
    description,
    potentialConcerns,
    relevantGuidance,
    starTechniques,
    suggestedQuestions,
    humanReviewRequired: true
  };
}

export async function reviewProcurementRequirement({
  requirement = '',
  limit = 10
} = {}) {
  const relevantGuidanceResults = await findRelevantGuidance({
    description: requirement,
    limit
  });
  const normalizedRequirement = normalizeText(requirement);
  const potentialConcerns = findProcurementConcerns(normalizedRequirement);
  const relevantGuidance = relevantGuidanceResults.matches.map((match) => ({
    guidelineId: match.guidelineId,
    guideline: match.guideline,
    criterion: match.criterion,
    reason: match.reason,
    tags: match.tags,
    sourceUrl: match.sourceUrl
  }));
  const suggestedLanguage = buildProcurementLanguageSuggestions({
    requirement,
    potentialConcerns,
    relevantGuidance
  });

  return {
    status: 'Draft procurement review only. Human review required.',
    requirement,
    potentialConcerns,
    relevantGuidance,
    suggestedLanguage,
    humanReviewRequired: true
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

function findPotentialConcerns(normalizedDescription) {
  const concernMappings = [
    {
      keywords: ['autoplay', 'video', 'animation'],
      concerns: ['performance', 'accessibility', 'attention', 'assets']
    },
    {
      keywords: ['tracking', 'analytics', 'personalization'],
      concerns: ['privacy', 'analytics', 'data minimization']
    },
    {
      keywords: ['ai', 'generated', 'summary'],
      concerns: ['AI', 'content', 'governance', 'transparency']
    },
    {
      keywords: ['third party', 'widget', 'embed'],
      concerns: ['performance', 'privacy', 'external factors']
    },
    {
      keywords: ['font', 'image', 'media'],
      concerns: ['assets', 'performance', 'bandwidth']
    },
    {
      keywords: ['infinite scroll', 'notification', 'modal'],
      concerns: ['attention', 'distraction', 'patterns']
    }
  ];

  const concerns = new Set();

  for (const mapping of concernMappings) {
    const matched = mapping.keywords.some((keyword) => normalizedDescription.includes(keyword));

    if (!matched) {
      continue;
    }

    for (const concern of mapping.concerns) {
      concerns.add(concern);
    }
  }

  return Array.from(concerns);
}

async function getRelatedStarTechniques(relevantGuidance, limit) {
  if (!relevantGuidance.length) {
    return [];
  }

  const star = await getStarIndex();
  const guidelineHashes = new Set();

  for (const item of relevantGuidance) {
    const guideline = await getGuideline(item.guidelineId);

    if (!guideline) {
      continue;
    }

    const hash = getUrlHash(guideline.url);

    if (hash) {
      guidelineHashes.add(hash);
    }
  }

  const techniques = [];

  for (const technique of star.techniques) {
    const matchesGuidance = technique.wsgLinks.some((link) => guidelineHashes.has(getUrlHash(link.url)));

    if (!matchesGuidance) {
      continue;
    }

    techniques.push({
      id: technique.id,
      title: technique.title,
      tests: technique.tests,
      testSuite: technique.testSuite
    });

    if (techniques.length >= limit) {
      break;
    }
  }

  return techniques;
}

function buildDesignReviewQuestions({ potentialConcerns, relevantGuidance, starTechniques }) {
  const questions = [];

  for (const concern of potentialConcerns.slice(0, 6)) {
    questions.push(`How does this design choice address ${concern}?`);
  }

  for (const item of relevantGuidance.slice(0, 4)) {
    questions.push(`Can we meet ${item.guideline} through ${item.criterion}?`);
  }

  for (const technique of starTechniques.slice(0, 4)) {
    questions.push(`Should we run STAR technique ${technique.title} during review?`);
  }

  return questions;
}

function findProcurementConcerns(normalizedRequirement) {
  const concernMappings = [
    {
      keywords: ['analytics', 'tracking', 'reporting'],
      concerns: ['privacy', 'data minimization', 'analytics']
    },
    {
      keywords: ['hosting', 'cloud', 'infrastructure'],
      concerns: ['hosting', 'energy', 'emissions']
    },
    {
      keywords: ['support', 'maintenance'],
      concerns: ['governance', 'lifecycle', 'reporting']
    },
    {
      keywords: ['accessibility'],
      concerns: ['accessibility', 'barriers', 'inclusive access']
    },
    {
      keywords: ['performance'],
      concerns: ['performance', 'assets', 'efficiency']
    },
    {
      keywords: ['ai'],
      concerns: ['AI', 'governance', 'transparency', 'privacy']
    }
  ];

  const concerns = new Set();

  for (const mapping of concernMappings) {
    const matched = mapping.keywords.some((keyword) => normalizedRequirement.includes(keyword));

    if (!matched) {
      continue;
    }

    for (const concern of mapping.concerns) {
      concerns.add(concern);
    }
  }

  return Array.from(concerns);
}

function buildProcurementLanguageSuggestions({ requirement, potentialConcerns, relevantGuidance }) {
  const suggestions = [];

  for (const concern of potentialConcerns) {
    suggestions.push(buildConcernLanguageSuggestion(concern));
  }

  for (const item of relevantGuidance.slice(0, 5)) {
    suggestions.push(`The supplier SHOULD address ${item.guideline} by meeting ${item.criterion}.`);
  }

  if (!suggestions.length) {
    suggestions.push('The supplier SHOULD state the expected outcome, reporting method, and review process.');
  }

  if (normalizeText(requirement).includes('shall')) {
    suggestions.unshift('Replace SHALL with SHOULD unless you are directly quoting source material.');
  }

  return Array.from(new Set(suggestions));
}

function buildConcernLanguageSuggestion(concern) {
  const suggestionsByConcern = {
    privacy: 'The supplier SHOULD explain what data is collected, why it is collected, and how it is protected.',
    'data minimization': 'The supplier SHOULD limit data collection to what is necessary for the service to work.',
    analytics: 'The supplier SHOULD describe how analytics are collected, stored, and reported.',
    hosting: 'The supplier SHOULD state where hosting occurs and what controls reduce resource use.',
    energy: 'The supplier SHOULD describe measures that reduce energy use during delivery and operation.',
    emissions: 'The supplier SHOULD describe measures that reduce emissions across the service life cycle.',
    governance: 'The supplier SHOULD define who owns the work, who approves changes, and how issues are escalated.',
    lifecycle: 'The supplier SHOULD cover setup, operation, maintenance, and retirement in the requirement.',
    reporting: 'The supplier SHOULD define what must be reported, how often, and in what format.',
    accessibility: 'The supplier SHOULD meet accessibility requirements and provide evidence of testing.',
    barriers: 'The supplier SHOULD identify and remove barriers that block access for users.',
    'inclusive access': 'The supplier SHOULD support inclusive access for users with different needs and devices.',
    performance: 'The supplier SHOULD set clear performance expectations and measurement criteria.',
    assets: 'The supplier SHOULD minimize asset weight and avoid unnecessary downloads.',
    efficiency: 'The supplier SHOULD define efficiency targets and how they will be measured.',
    AI: 'The supplier SHOULD disclose any AI use, review outputs for accuracy, and protect personal data.',
    transparency: 'The supplier SHOULD explain how automated or data-driven decisions are made.'
  };

  return suggestionsByConcern[concern] || `The supplier SHOULD address ${concern} in the contract language.`;
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
