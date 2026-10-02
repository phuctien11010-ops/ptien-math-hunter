const { v4: uuid } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');

class Database {
  constructor() {
    this.problems = [];
    this.classifications = new Map();
    this.dedupResults = new Map();
    this.reviewQueue = [];
    this.theories = [];
    this.formulas = [];
  }

  /**
   * Add problem to database
   */
  addProblem(problem) {
    const id = problem.id || uuid();
    const record = {
      ...problem,
      id,
      created_at: new Date().toISOString(),
      text_hash: require('../core/dedup').computeHash(problem.original_text),
      normalized_text: require('../core/dedup').normalize(problem.original_text),
    };

    this.problems.push(record);
    return record;
  }

  /**
   * Store classification result
   */
  storeClassification(problemId, classification) {
    this.classifications.set(problemId, classification);
  }

  /**
   * Store dedup result
   */
  storeDepupResult(problemId, result) {
    this.dedupResults.set(problemId, result);
  }

  /**
   * Add to review queue
   */
  addToReviewQueue(problem, reason, classification) {
    this.reviewQueue.push({
      id: uuid(),
      problem_id: problem.id,
      reason,
      classification,
      created_at: new Date().toISOString(),
      status: 'PENDING',
    });
  }

  /**
   * Get all problems
   */
  getAllProblems() {
    return this.problems;
  }

  /**
   * Get all review items
   */
  getReviewQueue() {
    return this.reviewQueue;
  }

  /**
   * Get classification for problem
   */
  getClassification(problemId) {
    return this.classifications.get(problemId);
  }

  /**
   * Get dedup result for problem
   */
  getDepupResult(problemId) {
    return this.dedupResults.get(problemId);
  }

  /**
   * Set theories
   */
  setTheories(theories) {
    this.theories = theories;
  }

  /**
   * Set formulas
   */
  setFormulas(formulas) {
    this.formulas = formulas;
  }
}

module.exports = Database;
