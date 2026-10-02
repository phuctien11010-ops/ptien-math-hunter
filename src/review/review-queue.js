class ReviewQueue {
  constructor() {
    this.items = [];
  }

  add({ problemId, reason, confidence, status = 'PENDING', source = 'auto' }) {
    this.items.push({
      id: `review-${this.items.length + 1}`,
      problemId,
      reason,
      confidence,
      status,
      source,
      createdAt: new Date().toISOString(),
    });
  }

  addLowConfidence(problemId, confidence, reason = 'Low confidence') {
    this.add({
      problemId,
      reason: `${reason}: ${confidence}`,
      confidence,
      status: 'PENDING',
      source: 'low-confidence',
    });
  }

  addUncertain(problemId, confidence, reason = 'Uncertain duplicate or classification') {
    this.add({
      problemId,
      reason,
      confidence,
      status: 'PENDING',
      source: 'uncertain',
    });
  }

  list() {
    return [...this.items];
  }
}

module.exports = ReviewQueue;
