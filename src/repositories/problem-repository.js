/**
 * ProblemRepository
 *
 * Data access layer for problems and their sources.
 * Enforces the invariant: every problem has at least one source URL.
 */

const { v4: uuid } = require('uuid');

class ProblemRepository {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Create a new problem with its primary source
   * @param {Object} data
   * @returns {Object} Created problem with sources
   */
  async createProblem(data) {
    const {
      gradeId,
      subjectId,
      chapterId,
      topicId,
      subtopicId,
      title,
      originalText,
      normalizedText,
      textHash,
      problemTypeIds,
      difficulty,
      confidences,
      sourceUrl,
      sourceDomain,
      sourceName,
      publishedDate,
    } = data;

    // Validate invariant: must have source URL
    if (!sourceUrl) {
      throw new Error('INVARIANT_VIOLATION: Problem must have at least one source URL');
    }

    const problemId = uuid();

    const problem = {
      id: problemId,
      grade_id: gradeId,
      subject_id: subjectId,
      chapter_id: chapterId,
      topic_id: topicId,
      subtopic_id: subtopicId,
      title: title || null,
      original_text: originalText,
      normalized_text: normalizedText,
      text_hash: textHash,
      problem_types_json: JSON.stringify(problemTypeIds || []),
      difficulty: difficulty || 'Intermediate',
      confidence_grade: confidences?.grade || 0.5,
      confidence_topic: confidences?.topic || 0.5,
      confidence_type: confidences?.type || 0.5,
      confidence_difficulty: confidences?.difficulty || 0.5,
      status: 'CLASSIFIED',
      discovered_at: new Date(),
    };

    // Insert problem
    await this.db('problems').insert(problem);

    // Insert primary source
    const source = {
      id: uuid(),
      problem_id: problemId,
      source_url: sourceUrl,
      source_domain: sourceDomain,
      source_name: sourceName || null,
      published_date: publishedDate || null,
      is_canonical: true,
      discovered_at: new Date(),
    };

    await this.db('problem_sources').insert(source);

    this.logger.info(
      { problemId, sourceUrl },
      'Problem created with canonical source'
    );

    return this.getProblem(problemId);
  }

  /**
   * Get a problem with all its sources
   */
  async getProblem(problemId) {
    const problem = await this.db('problems').where('id', problemId).first();

    if (!problem) return null;

    const sources = await this.db('problem_sources').where('problem_id', problemId);

    // Deserialize JSON fields
    problem.problem_types_json = JSON.parse(problem.problem_types_json || '[]');

    return {
      ...problem,
      sources,
    };
  }

  /**
   * Find problem by exact text hash (Layer 1 dedup)
   */
  async findByExactHash(textHash) {
    return this.db('problems').where('text_hash', textHash).first();
  }

  /**
   * Add a source to an existing problem
   * Used when the same problem is found on multiple websites
   */
  async addSourceToProblem(problemId, sourceUrl, sourceDomain, sourceName, publishedDate) {
    // Check source doesn't already exist for this problem
    const existing = await this.db('problem_sources')
      .where('problem_id', problemId)
      .where('source_url', sourceUrl)
      .first();

    if (existing) {
      return existing;
    }

    const source = {
      id: uuid(),
      problem_id: problemId,
      source_url: sourceUrl,
      source_domain: sourceDomain,
      source_name: sourceName || null,
      published_date: publishedDate || null,
      is_canonical: false,
      discovered_at: new Date(),
    };

    await this.db('problem_sources').insert(source);
    this.logger.info({ problemId, sourceUrl }, 'Source added to existing problem');
    return source;
  }

  /**
   * Mark problem status for review queue
   */
  async moveToReviewQueue(problemId, reviewType, reason, suggestedValues) {
    const problem = await this.getProblem(problemId);
    if (!problem) throw new Error(`Problem ${problemId} not found`);

    const reviewId = uuid();
    await this.db('review_queue').insert({
      id: reviewId,
      problem_id: problemId,
      review_type: reviewType,
      reason: reason || null,
      suggested_values_json: JSON.stringify(suggestedValues || {}),
      status: 'PENDING',
    });

    // Update problem status
    await this.db('problems').where('id', problemId).update({
      status: 'REVIEW_REQUIRED',
    });

    this.logger.info({ problemId, reviewType }, 'Problem moved to review queue');
    return reviewId;
  }

  /**
   * Mark problems as duplicates
   */
  async recordDuplicateGroup(canonicalProblemId, duplicateIds, dedupLayer, similarityScore) {
    const groupId = uuid();

    await this.db('duplicate_groups').insert({
      id: groupId,
      canonical_problem_id: canonicalProblemId,
      duplicate_problem_ids: JSON.stringify(duplicateIds),
      dedup_layer: dedupLayer,
      similarity_score: similarityScore || null,
      status: 'PENDING',
    });

    // Mark duplicates with status
    await this.db('problems')
      .whereIn('id', duplicateIds)
      .update({ status: 'DUPLICATE' });

    this.logger.info(
      { canonicalProblemId, dedupLayer, count: duplicateIds.length },
      'Duplicate group recorded'
    );

    return groupId;
  }

  /**
   * Get all problems pending review
   */
  async getReviewQueueItems(limit = 50) {
    return this.db('review_queue')
      .join('problems', 'review_queue.problem_id', 'problems.id')
      .select('review_queue.*', 'problems.original_text', 'problems.normalized_text')
      .where('review_queue.status', 'PENDING')
      .limit(limit);
  }

  /**
   * Get problems by grade and topic
   */
  async getProblemsByGradeTopic(gradeId, topicId, options = {}) {
    const { status = 'APPROVED', limit = 100, offset = 0 } = options;

    let query = this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId);

    if (status) {
      query = query.where('status', status);
    }

    const total = await query.clone().count('* as count').first();
    const problems = await query
      .offset(offset)
      .limit(limit)
      .orderBy('created_at', 'desc');

    return {
      problems,
      total: total.count,
      offset,
      limit,
    };
  }

  /**
   * Get statistics for a given scope
   */
  async getStatistics(gradeId, topicId) {
    const problems = this.db('problems').where('grade_id', gradeId).where('topic_id', topicId);

    const stats = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .select(
        this.db.raw('COUNT(*) as total'),
        this.db.raw("COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved"),
        this.db.raw("COUNT(CASE WHEN status = 'DUPLICATE' THEN 1 END) as duplicates"),
        this.db.raw("COUNT(CASE WHEN status = 'REVIEW_REQUIRED' THEN 1 END) as review_required"),
        this.db.raw(
          "COUNT(CASE WHEN difficulty = 'Basic' THEN 1 END) as difficulty_basic"
        ),
        this.db.raw(
          "COUNT(CASE WHEN difficulty = 'Intermediate' THEN 1 END) as difficulty_intermediate"
        ),
        this.db.raw(
          "COUNT(CASE WHEN difficulty = 'Advanced' THEN 1 END) as difficulty_advanced"
        )
      )
      .first();

    return stats;
  }
}

module.exports = ProblemRepository;
