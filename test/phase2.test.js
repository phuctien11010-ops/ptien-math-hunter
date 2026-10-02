const test = require('node:test');
const assert = require('node:assert/strict');
const QueryBuilder = require('../src/search/query-builder');
const BingSearchProvider = require('../src/search/bing-provider');
const Phase2SearchPipeline = require('../src/phase2');

test('QueryBuilder generates many variations for a topic', () => {
  const queries = QueryBuilder.build(8, 'Hình bình hành', 'Toán', { limit: 10 });
  assert.ok(queries.length >= 10);
  assert.ok(queries[0].includes('Toán'));
});

test('BingSearchProvider returns demo results without API key', async () => {
  const provider = new BingSearchProvider({ apiKey: undefined });
  const results = await provider.search('Toán 8 hình bình hành', 3);
  assert.equal(results.length, 3);
  assert.ok(results[0].url);
});

test('Phase2SearchPipeline returns crawled and discovered data', async () => {
  const pipeline = new Phase2SearchPipeline({
    grade: 8,
    subject: 'Toán',
    topic: 'Hình bình hành',
    targetCount: 5,
  });

  const result = await pipeline.run();
  assert.ok(result.queries.length >= 10);
  assert.ok(result.discovered.length >= 1);
  assert.ok(Array.isArray(result.crawled));
});
