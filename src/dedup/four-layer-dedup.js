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
  constructor(db, logger = console) {
    this.db = db;
    this.logger = logger;
  }

  async classifyProblem(problem, gradeId, topicId) {
    const normalizedText =
      problem?.normalized_text ||
      problem?.normalizedText ||
      DeterministicClassifier.normalizeProblemText(
        problem?.original_text || problem?.originalText || ''
      );

    const classification = {
      gradeId,
      topicId,
      difficulty: 'Intermediate',
      confidences: {
        grade: 0.95,
        topic: 0.95,
        type: 0.5,
        difficulty: 0.5,
      },
      problemTypeIds: [],
      flagsForReview: [],
    };

    const difficultyResult = this._extractDifficulty(normalizedText);
    classification.difficulty = difficultyResult.difficulty;
    classification.confidences.difficulty = difficultyResult.confidence;

    const typeResult = await this._extractProblemTypes(normalizedText, topicId);
    classification.problemTypeIds = typeResult.typeIds;
    classification.confidences.type = typeResult.confidence;

    const confThreshold = 0.75;
    if (classification.confidences.difficulty < confThreshold) {
      classification.flagsForReview.push('DIFFICULTY_LOW_CONFIDENCE');
    }
    if (classification.confidences.type < confThreshold) {
      classification.flagsForReview.push('TYPE_LOW_CONFIDENCE');
    }

    const averages = Object.values(classification.confidences);
    classification.overallConfidence = Number(
      (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(3)
    );

    return classification;
  }

  _extractDifficulty(normalizedText) {
    const text = String(normalizedText || '').toLowerCase();

    const basicKeywords = [
      'basic',
      'simple',
      'beginner',
      'easy',
      'calculate',
      'find',
      'evaluate',
      'solve',
    ];
    const advancedKeywords = [
      'advanced',
      'prove',
      'demonstrate',
      'generalize',
      'complex',
      'multi-step',
      'challenge',
      'show that',
      'derive',
    ];
    const veryAdvancedKeywords = [
      'olympiad',
      'complex proof',
      'research',
      'theorem',
      'nontrivial',
      'rigorous',
    ];

    let difficulty = 'Intermediate';
    let confidence = 0.5;

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
      const sentenceCount = (text.match(/[.!?]/g) || []).length;
      const hasVariables = /[a-z]\s*=|\$[a-z]\$/i.test(text);
      const hasProofCue = /(prove|show that|demonstrate|derive)/.test(text);

      if (sentenceCount > 5 || (hasVariables && hasProofCue)) {
        difficulty = 'Advanced';
        confidence = 0.45;
      }
    }

    return { difficulty, confidence: Math.min(Number(confidence.toFixed(3)), 0.95) };
  }

  async _extractProblemTypes(normalizedText, topicId) {
    const text = String(normalizedText || '').toLowerCase();

    const fallbackTypeKeywords = {
      'Angle Calculation': ['angle', '∠', 'degree', 'degrees', 'measure', 'find angle'],
      'Side Length Calculation': ['side', 'length', 'perimeter', 'distance', 'cm', 'segment'],
      Proof: ['prove', 'demonstrate', 'show that', 'verify', 'establish', 'explain why'],
      Recognition: ['identify', 'which', 'recognize', 'what type', 'is it', 'determine'],
      'Diagonal Properties': ['diagonal', 'bisect', 'intersect', 'midpoint'],
      'Equation Solving': ['solve', 'equation', 'x =', 'find x', 'unknown'],
      'Functions & Graphs': ['function', 'graph', 'slope', 'plot', 'intercept'],
    };

    let problemTypes = [];
    if (this.db && typeof this.db === 'function') {
      try {
        problemTypes = await this.db('problem_types')
          .select('*')
          .where('topic_id', topicId);
      } catch (error) {
        this.logger?.warn?.({ error }, 'Falling back to static keyword matching for problem types');
      }
    }

    const matched = [];
    const typeScores = {};
    const typeKeywords = problemTypes.length
      ? Object.fromEntries(problemTypes.map((type) => [type.name, type.keywords || []]))
      : fallbackTypeKeywords;

    for (const [typeName, keywords] of Object.entries(typeKeywords)) {
      const score = this._scoreKeywordMatches(text, keywords);
      if (score > 0) {
        const typeId = problemTypes.find((type) => type.name === typeName)?.id || typeName;
        typeScores[typeId] = score;
        matched.push(typeId);
      }
    }

    let confidence = 0.5;
    if (matched.length > 0) {
      const matchCount = Math.max(...Object.values(typeScores));
      confidence = Math.min(0.3 + matchCount * 0.2, 0.9);
    }

    matched.sort((a, b) => (typeScores[b] || 0) - (typeScores[a] || 0));

    return {
      typeIds: matched,
      confidence: Number(confidence.toFixed(3)),
    };
  }

  _scoreKeywordMatches(text, keywords = []) {
    if (!Array.isArray(keywords) || keywords.length === 0) return 0;
    return keywords.filter((keyword) => typeof keyword === 'string' && text.includes(keyword.toLowerCase())).length;
  }

  static computeTextHash(text) {
    return crypto.createHash('sha256').update(String(text || '')).digest('hex');
  }

  static normalizeProblemText(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:!?()\[\]{}]/g, '')
      .replace(/\.$/, '');
  }
}

module.exports = DeterministicClassifier;
