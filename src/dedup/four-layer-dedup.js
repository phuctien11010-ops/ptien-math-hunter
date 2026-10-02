/**
 * Four-Layer Deduplication Engine
 *
 * Layer 1: Exact hash match
 * Layer 2: Normalized text match
 * Layer 3: Near-duplicate similarity (Jaccard)
 * Layer 4: Semantic similarity (requires embeddings — not yet implemented)
 *
 * All source URLs are preserved throughout the process.
 */

const crypto = require('crypto');

class FourLayerDedup {
  constructor(db, logger, problemRepo) {
    this.db = db;
    this.logger = logger;
    this.problemRepo = problemRepo;
  }

  /**
   * Main dedup pipeline
   * @param {Object} candidateProblem - new problem to check
   * @returns {Object} { isDuplicate: bool, canonicalId: ?, layer: ?, confidence: ? }
   */
  async deduplicate(candidateProblem) {
    const { gradeId, topicId, originalText, normalizedText, textHash } = candidateProblem;

    this.logger.debug({ textHash }, 'Starting 4-layer dedup check');

    // Layer 1: Exact hash match
    const exactMatch = await this._layer1Exact(gradeId, topicId, textHash);
    if (exactMatch) {
      return {
        isDuplicate: true,
        layer: 'EXACT',
        canonicalId: exactMatch.id,
        confidence: 1.0,
      };
    }

    // Layer 2: Normalized text match
    const normalizedMatch = await this._layer2Normalized(gradeId, topicId, normalizedText);
    if (normalizedMatch) {
      return {
        isDuplicate: true,
        layer: 'NORMALIZED',
        canonicalId: normalizedMatch.id,
        confidence: 0.95,
      };
    }

    // Layer 3: Near-duplicate (Jaccard similarity)
    const nearMatch = await this._layer3Near(gradeId, topicId, normalizedText);
    if (nearMatch) {
      return {
        isDuplicate: true,
        layer: 'NEAR',
        canonicalId: nearMatch.id,
        confidence: nearMatch.similarity,
      };
    }

    // Layer 4: Semantic (requires embeddings, skipped for now)
    // TODO: Implement when AI classifier is available

    return {
      isDuplicate: false,
      layer: null,
      canonicalId: null,
      confidence: null,
    };
  }

  /**
   * Layer 1: Exact hash match (section 18)
   * @private
   */
  async _layer1Exact(gradeId, topicId, textHash) {
    const existing = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('text_hash', textHash)
      .where('status', '!=', 'REJECTED')
      .first();

    if (existing) {
      this.logger.info({ textHash }, 'Exact duplicate found (Layer 1)');
    }

    return existing || null;
  }

  /**
   * Layer 2: Normalized duplicate (section 19)
   * @private
   */
  async _layer2Normalized(gradeId, topicId, normalizedText) {
    const normalizedHash = crypto
      .createHash('sha256')
      .update(normalizedText)
      .digest('hex');

    const existing = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('normalized_text', normalizedText)
      .where('status', '!=', 'REJECTED')
      .first();

    if (existing) {
      this.logger.info({ normalizedHash }, 'Normalized duplicate found (Layer 2)');
    }

    return existing || null;
  }

  /**
   * Layer 3: Near-duplicate using Jaccard similarity (section 20)
   * @private
   */
  async _layer3Near(gradeId, topicId, normalizedText, threshold = 0.85) {
    // Get all problems in this grade/topic (sampling for performance)
    const candidates = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('status', '!=', 'REJECTED')
      .limit(500); // Avoid full table scan

    const candidateShingles = this._textToShingles(normalizedText);

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidate of candidates) {
      const existingShingles = this._textToShingles(candidate.normalized_text);
      const similarity = this._jaccardSimilarity(candidateShingles, existingShingles);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = candidate;
      }
    }

    if (bestSimilarity >= threshold) {
      this.logger.info(
        { similarity: bestSimilarity, threshold },
        'Near-duplicate found (Layer 3)'
      );
      return { ...bestMatch, similarity: bestSimilarity };
    }

    return null;
  }

  /**
   * Convert text to shingles (n-grams for similarity)
   * @private
   */
  _textToShingles(text, n = 3) {
    const words = text.toLowerCase().split(/\s+/);
    const shingles = new Set();

    for (let i = 0; i <= words.length - n; i++) {
      shingles.add(words.slice(i, i + n).join(' '));
    }

    return shingles;
  }

  /**
   * Compute Jaccard similarity between two sets
   * @private
   */
  _jaccardSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Handle duplicate resolution
   * If a duplicate is detected:
   * 1. Keep the canonical problem
   * 2. Add the new source URL to the canonical
   * 3. Record the duplicate group
   */
  async resolveDuplicate(newProblem, dedupResult) {
    const { canonicalId, layer, confidence } = dedupResult;

    this.logger.info(
      { canonicalId, layer, confidence },
      'Resolving duplicate: adding source to canonical'
    );

    // Add new source to canonical problem
    await this.problemRepo.addSourceToProblem(
      canonicalId,
      newProblem.sourceUrl,
      newProblem.sourceDomain,
      newProblem.sourceName,
      newProblem.publishedDate
    );

    // Record the duplicate relationship
    await this.problemRepo.recordDuplicateGroup(canonicalId, [newProblem.id], layer, confidence);

    return { deduplicated: true, canonicalId };
  }
}

module.exports = FourLayerDedup;
