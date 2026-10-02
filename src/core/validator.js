const config = require('../config');

class Validator {
  /**
   * Validate problem has required fields
   */
  static validateProblem(problem) {
    const errors = [];

    if (!problem.id) errors.push('Missing: id');
    if (!problem.original_text) errors.push('Missing: original_text');

    if (config.REQUIRE_SOURCE_URL) {
      if (!problem.source_url) errors.push('Missing: source_url (REQUIRED)');
      if (!problem.source_domain) errors.push('Missing: source_domain');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate classification result
   */
  static validateClassification(classification) {
    const errors = [];

    if (!classification.grade) errors.push('Missing: grade');
    if (!classification.topic) errors.push('Missing: topic');
    if (!classification.difficulty) errors.push('Missing: difficulty');
    if (typeof classification.overall_confidence !== 'number') {
      errors.push('Missing: overall_confidence');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if should go to review queue
   */
  static shouldReview(classification) {
    return classification.overall_confidence < config.CONFIDENCE_THRESHOLD;
  }

  /**
   * Check if all problems have sources
   */
  static checkAllHaveSources(problems) {
    const withoutSource = problems.filter((p) => !p.source_url);
    return {
      allHaveSources: withoutSource.length === 0,
      withoutSourceCount: withoutSource.length,
      problemsWithoutSource: withoutSource,
    };
  }
}

module.exports = Validator;
