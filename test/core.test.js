const test = require('node:test');
const assert = require('node:assert/strict');

const { DeterministicClassifier, FourLayerDedup, ProblemRepository } = require('../src');

test('normalizeProblemText lowercases and strips punctuation', () => {
  const normalized = DeterministicClassifier.normalizeProblemText('Prove that 3 + 5 = 8!');
  assert.equal(normalized, 'prove that 3  5  8');
});

test('classifier identifies easy/basic problems from keywords', async () => {
  const classifier = new DeterministicClassifier({
    async query() {
      return [];
    },
  }, console);

  const result = await classifier.classifyProblem(
    {
      original_text: 'Easy calculate the sum of 2 and 3.',
      normalized_text: 'easy calculate the sum of 2 and 3',
    },
    1,
    1
  );

  assert.equal(result.difficulty, 'Basic');
  assert.ok(result.overallConfidence > 0.5);
});

test('classifier flags low-confidence type detection if no matching types', async () => {
  const classifier = new DeterministicClassifier({
    async query() {
      return [];
    },
  }, console);

  const result = await classifier.classifyProblem(
    {
      original_text: 'A generic statement appears without an obvious math pattern.',
      normalized_text: 'a generic statement appears without an obvious math pattern',
    },
    1,
    1
  );

  assert.ok(result.flagsForReview.includes('TYPE_LOW_CONFIDENCE'));
});

test('dedup engine returns null for missing data', async () => {
  const dedup = new FourLayerDedup(null, console, null);
  const result = await dedup.deduplicate(null);

  assert.equal(result.isDuplicate, false);
  assert.equal(result.layer, null);
});

test('dedup shingles create measurable token groups', () => {
  const dedup = new FourLayerDedup(null, console, null);
  const shingles = dedup._textToShingles('solve equation x plus y');

  assert.equal(shingles.size > 0, true);
  assert.ok(shingles.has('solve equation x'));
});

test('ProblemRepository rejects missing source URL invariant', async () => {
  const repo = new ProblemRepository({
    async insert() {
      return true;
    },
  }, console);

  await assert.rejects(
    () => repo.createProblem({ gradeId: 1, topicId: 1, originalText: 'abc' }),
    /INVARIANT_VIOLATION/
  );
});
