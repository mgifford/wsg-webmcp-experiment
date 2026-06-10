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
