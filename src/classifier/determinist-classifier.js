/**
 * Deterministic Classifier
 *
 * This is a rule-based classifier that uses exact matching and simple heuristics.
 * It does NOT depend on AI/embeddings.
 *
 * It assigns confidence scores based on the specificity of the match:
 * - Exact keyword match: high confidence
 * - Partial/fuzzy match: medium confidence
 * - Uncertain: low confidence → review queue
 *
 * The classifier interface is designed to accept an AI classifier later
 * without changing the core pipeline.
 */

const crypto = require('crypto');

class DeterministicClassifier {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Classify a single problem
   * @param {Object} problem - { title, original_text, normalized_text }
   * @param {number} gradeId
   * @param {number} topicId
   * @returns {Object} Classification result with confidence scores
   */
  async classifyProblem(problem, gradeId, topicId) {
    const classification = {
      gradeId,
      topicId,
      difficulty: 'Intermediate',
      confidences: {
        grade: 0.95, // If explicitly provided, grade is high confidence
        topic: 0.95, // If explicitly provided, topic is high confidence
        type: 0.50, // Problem type requires text analysis
        difficulty: 0.50, // Difficulty requires deeper understanding
      },
      problemTypeIds: [],
      flagsForReview: [],
    };

    // Extract difficulty from text patterns
    const difficultyResult = this._extractDifficulty(problem.normalized_text);
    classification.difficulty = difficultyResult.difficulty;
    classification.confidences.difficulty = difficultyResult.confidence;

    // Extract problem types
    const typeResult = await this._extractProblemTypes(problem.normalized_text, topicId);
    classification.problemTypeIds = typeResult.typeIds;
    classification.confidences.type = typeResult.confidence;

    // Determine if low-confidence classifications need review
    const confThreshold = 0.75;
    if (classification.confidences.difficulty < confThreshold) {
      classification.flagsForReview.push('DIFFICULTY_LOW_CONFIDENCE');
    }
    if (classification.confidences.type < confThreshold) {
      classification.flagsForReview.push('TYPE_LOW_CONFIDENCE');
    }

    // Compute overall confidence (average)
    const avgConfidence =
      Object.values(classification.confidences).reduce((a, b) => a + b, 0) /
      Object.values(classification.confidences).length;
    classification.overallConfidence = avgConfidence;

    return classification;
  }

  /**
   * Extract difficulty from problem text
   * @private
   */
  _extractDifficulty(normalizedText) {
    const text = normalizedText.toLowerCase();

    // Keywords for different difficulty levels
    const basicKeywords = ['basic', 'simple', 'beginner', 'easy', 'calculate'];
    const advancedKeywords = [
      'advanced',
      'prove',
      'demonstrate',
      'generalize',
      'complex',
      'multi-step',
      'challenge',
    ];
    const veryAdvancedKeywords = ['olympiad', 'complex proof', 'research', 'theorem'];

    let difficulty = 'Intermediate';
    let confidence = 0.5;

    // Count keyword matches
    const basicMatches = basicKeywords.filter((kw) => text.includes(kw)).length;
    const advancedMatches = advancedKeywords.filter((kw) => text.includes(kw)).length;
    const veryAdvancedMatches = veryAdvancedKeywords.filter((kw) => text.includes(kw)).length;

    if (veryAdvancedMatches > 0) {
      difficulty = 'Very Advanced';
      confidence = 0.7 + Math.min(veryAdvancedMatches * 0.1, 0.25);
    } else if (advancedMatches >= 2) {
      difficulty = 'Advanced';
      confidence = 0.6 + Math.min(advancedMatches * 0.1, 0.3);
    } else if (basicMatches >= 2) {
      difficulty = 'Basic';
      confidence = 0.6 + Math.min(basicMatches * 0.1, 0.3);
    } else {
      // Heuristic: number of sentences, presence of variables
      const sentenceCount = (normalizedText.match(/[.!?]/g) || []).length;
      const hasVariables = /[a-z]\s*=|\$[a-z]\$/i.test(normalizedText);

      if (sentenceCount > 5 || (hasVariables && text.includes('prove'))) {
        difficulty = 'Advanced';
        confidence = 0.45;
      }
    }

    return { difficulty, confidence: Math.min(confidence, 0.95) };
  }

  /**
   * Extract problem types by matching keywords in the text
   * @private
   */
  async _extractProblemTypes(normalizedText, topicId) {
    const text = normalizedText.toLowerCase();

    // Get all problem types for this topic
    const problemTypes = await this.db('problem_types')
      .select('*')
      .where('topic_id', topicId);

    const matched = [];
    const typeScores = {};

    // Define keywords for each type (can be expanded)
    const typeKeywords = {
      'Angle Calculation': ['angle', 'calculate', 'find angle', '∠', 'degree', '°'],
      'Side Length Calculation': ['side', 'length', 'perimeter', 'distance', 'cm', 'calculate side'],
      Proof: ['prove', 'demonstration', 'show that', 'verify', 'establish', 'why'],
      Recognition: ['identify', 'which', 'recognize', 'what type', 'is it', 'determine'],
      'Diagonal Properties': ['diagonal', 'diagonal bisect', 'intersect', 'midpoint'],
    };

    // Score each type
    for (const type of problemTypes) {
      const keywords = typeKeywords[type.name] || [];
      const matches = keywords.filter((kw) => text.includes(kw)).length;

      if (matches > 0) {
        typeScores[type.id] = matches;
        matched.push(type.id);
      }
    }

    // If no matches found, use low confidence indicator
    let confidence = 0.5;
    if (matched.length > 0) {
      const matchCount = Math.max(...Object.values(typeScores));
      confidence = Math.min(0.3 + matchCount * 0.2, 0.9);
    }

    // Sort by score (most confident matches first)
    matched.sort((a, b) => (typeScores[b] || 0) - (typeScores[a] || 0));

    return {
      typeIds: matched,
      confidence: confidence,
    };
  }

  /**
   * Compute SHA-256 hash of problem text for exact deduplication
   * @static
   */
  static computeTextHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Normalize problem text for comparison
   * @static
   */
  static normalizeProblemText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/[^\w\s\-.,;:!?()\[\]{}]/g, '') // Remove special chars except punctuation
      .replace(/\.$/, ''); // Remove trailing period
  }
}

module.exports = DeterministicClassifier;
