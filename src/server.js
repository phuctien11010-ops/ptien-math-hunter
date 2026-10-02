const { randomUUID } = require('crypto');
const DeterministicClassifier = require('./classifier/determinist-classifier');
const FourLayerDedup = require('./dedup/four-layer-dedup');

class MathProblemPipeline {
  constructor({ store, logger = console, classifier = null, dedup = null } = {}) {
    this.store = store;
    this.logger = logger;
    this.classifier = classifier || new DeterministicClassifier(null, logger);
    this.dedup = dedup || new FourLayerDedup(null, logger);
  }

  async ingest(rawProblem) {
    const originalText = rawProblem.original_text || rawProblem.originalText || '';
    const normalizedText =
      rawProblem.normalized_text ||
      rawProblem.normalizedText ||
      DeterministicClassifier.normalizeProblemText(originalText);

    const gradeId = rawProblem.gradeId || rawProblem.grade_id || 1;
    const topicId = rawProblem.topicId || rawProblem.topic_id || 1;
    const sourceUrl = rawProblem.sourceUrl || rawProblem.source_url || 'unknown';
    const sourceDomain = rawProblem.sourceDomain || rawProblem.source_domain || null;
    const sourceName = rawProblem.sourceName || rawProblem.source_name || null;
    const publishedDate = rawProblem.publishedDate || rawProblem.published_date || null;
    const textHash = DeterministicClassifier.computeTextHash(normalizedText);

    const classification = await this.classifier.classifyProblem(
      { original_text: originalText, normalized_text: normalizedText },
      gradeId,
      topicId
    );

    const dedupResult = await this.dedup.deduplicate({
      gradeId,
      topicId,
      originalText,
      normalizedText,
      textHash,
    });

    const existingCanonical = dedupResult.isDuplicate ? dedupResult.canonicalId : null;

    const problem = {
      id: randomUUID(),
      grade_id: gradeId,
      topic_id: topicId,
      original_text: originalText,
      normalized_text: normalizedText,
      text_hash: textHash,
      difficulty: classification.difficulty,
      problem_types_json: JSON.stringify(classification.problemTypeIds || []),
      confidence_grade: classification.confidences?.grade || 0.5,
      confidence_topic: classification.confidences?.topic || 0.5,
      confidence_type: classification.confidences?.type || 0.5,
      confidence_difficulty: classification.confidences?.difficulty || 0.5,
      status: dedupResult.isDuplicate ? 'DUPLICATE' : 'CLASSIFIED',
      flags_for_review: classification.flagsForReview || [],
      sources: [
        {
          id: randomUUID(),
          source_url: sourceUrl,
          source_domain: sourceDomain,
          source_name: sourceName,
          published_date: publishedDate,
          discovered_at: new Date().toISOString(),
        },
      ],
      canonical_problem_id: existingCanonical,
      created_at: new Date().toISOString(),
    };

    if (this.store) {
      const saved = await this.store.saveProblem(problem);
      if (dedupResult.isDuplicate && existingCanonical) {
        await this.store.addSource(existingCanonical, sourceUrl, sourceDomain, sourceName, publishedDate);
      }

      return {
        savedProblem: saved,
        classification,
        dedup: dedupResult,
      };
    }

    return { savedProblem: problem, classification, dedup: dedupResult };
  }
}

module.exports = { MathProblemPipeline };
