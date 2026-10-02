const crypto = require('crypto');

class Classifier {
  /**
   * Classify a problem deterministically
   * NO AI in Phase 1
   */
  static classify(problem) {
    const {
      original_text,
      problem_type_hint,
      difficulty_hint,
    } = problem;

    const text = String(original_text || '').toLowerCase();

    // Deterministic classification
    const classification = {
      grade: 8,
      subject: 'Mathematics',
      chapter: 'Geometry',
      topic: 'Parallelogram',
      problem_type: problem_type_hint || this._detectType(text),
      difficulty: difficulty_hint || this._detectDifficulty(text),
      confidences: {
        grade: 1.0,
        subject: 1.0,
        topic: 0.99,
        type: this._typeConfidence(text, problem_type_hint),
        difficulty: this._difficultyConfidence(text, difficulty_hint),
      },
    };

    classification.overall_confidence = 
      Object.values(classification.confidences).reduce((a, b) => a + b, 0) /
      Object.keys(classification.confidences).length;

    return classification;
  }

  static _detectType(text) {
    const indicators = {
      'Angle Calculation': ['angle', 'tính góc', 'find angle', 'degree'],
      'Side Length': ['side', 'length', 'perimeter', 'tính cạnh', 'độ dài'],
      'Proof': ['prove', 'chứng minh', 'demonstrate', 'show that'],
      'Recognition': ['identify', 'recognize', 'xác định', 'nhận biết'],
      'Diagonal': ['diagonal', 'đường chéo', 'midpoint', 'trung điểm'],
    };

    for (const [type, keywords] of Object.entries(indicators)) {
      if (keywords.some((kw) => text.includes(kw))) {
        return type;
      }
    }

    return 'General';
  }

  static _detectDifficulty(text) {
    const basicKeywords = ['basic', 'easy', 'cơ bản', 'đơn giản', 'calculate', 'tính'];
    const advancedKeywords = ['prove', 'chứng minh', 'advanced', 'nâng cao', 'complex', 'phức tạp'];

    const basicCount = basicKeywords.filter((kw) => text.includes(kw)).length;
    const advCount = advancedKeywords.filter((kw) => text.includes(kw)).length;

    return advCount >= 1 ? 'Advanced' : 'Basic';
  }

  static _typeConfidence(text, hint) {
    return hint ? 0.99 : 0.75;
  }

  static _difficultyConfidence(text, hint) {
    return hint ? 0.98 : 0.85;
  }
}

module.exports = Classifier;
