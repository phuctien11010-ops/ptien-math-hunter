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
  constructor(db, logger = console, problemRepo) {
    this.db = db;
    this.logger = logger;
    this.problemRepo = problemRepo;
  }

  async deduplicate(candidateProblem) {
    if (!candidateProblem) {
      return {
        isDuplicate: false,
        layer: null,
        canonicalId: null,
        confidence: null,
      };
    }

    const normalizedText =
      candidateProblem.normalizedText ||
      candidateProblem.normalized_text ||
      '';
    const textHash =
      candidateProblem.textHash ||
      candidateProblem.text_hash ||
      FourLayerDedup.computeHash(normalizedText);
    const gradeId = candidateProblem.gradeId || candidateProblem.grade_id;
    const topicId = candidateProblem.topicId || candidateProblem.topic_id;

    this.logger?.debug?.({ textHash }, 'Starting 4-layer dedup check');

    const exactMatch = await this._layer1Exact(gradeId, topicId, textHash);
    if (exactMatch) {
      return {
        isDuplicate: true,
        layer: 'EXACT',
        canonicalId: exactMatch.id,
        confidence: 1.0,
      };
    }

    const normalizedMatch = await this._layer2Normalized(gradeId, topicId, normalizedText);
    if (normalizedMatch) {
      return {
        isDuplicate: true,
        layer: 'NORMALIZED',
        canonicalId: normalizedMatch.id,
        confidence: 0.95,
      };
    }

    const nearMatch = await this._layer3Near(gradeId, topicId, normalizedText);
    if (nearMatch) {
      return {
        isDuplicate: true,
        layer: 'NEAR',
        canonicalId: nearMatch.id,
        confidence: nearMatch.similarity,
      };
    }

    return {
      isDuplicate: false,
      layer: null,
      canonicalId: null,
      confidence: null,
    };
  }

  async _layer1Exact(gradeId, topicId, textHash) {
    if (!this.db || !gradeId || !topicId || !textHash) return null;

    const existing = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('text_hash', textHash)
      .where('status', '!=', 'REJECTED')
      .first();

    if (existing) {
      this.logger?.info?.({ textHash }, 'Exact duplicate found (Layer 1)');
    }

    return existing || null;
  }

  async _layer2Normalized(gradeId, topicId, normalizedText) {
    if (!this.db || !gradeId || !topicId || !normalizedText) return null;

    const existing = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('normalized_text', normalizedText)
      .where('status', '!=', 'REJECTED')
      .first();

    if (existing) {
      this.logger?.info?.({ normalizedText }, 'Normalized duplicate found (Layer 2)');
    }

    return existing || null;
  }

  async _layer3Near(gradeId, topicId, normalizedText, threshold = 0.85) {
    if (!this.db || !gradeId || !topicId || !normalizedText) return null;

    const candidates = await this.db('problems')
      .where('grade_id', gradeId)
      .where('topic_id', topicId)
      .where('status', '!=', 'REJECTED')
      .limit(500);

    const candidateShingles = this._textToShingles(normalizedText);
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidate of candidates) {
      const existingShingles = this._textToShingles(candidate.normalized_text || '');
      const similarity = this._jaccardSimilarity(candidateShingles, existingShingles);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = candidate;
      }
    }

    if (bestSimilarity >= threshold) {
      this.logger?.info?.(
        { similarity: bestSimilarity, threshold },
        'Near-duplicate found (Layer 3)'
      );
      return { ...bestMatch, similarity: bestSimilarity };
    }

    return null;
  }

  _textToShingles(text, n = 3) {
    const safeText = String(text || '').toLowerCase().trim();
    if (!safeText) return new Set();

    const words = safeText.split(/\s+/);
    const shingles = new Set();

    for (let i = 0; i <= words.length - n; i++) {
      if (i + n <= words.length) {
        shingles.add(words.slice(i, i + n).join(' '));
      }
    }

    return shingles;
  }

  _jaccardSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  async resolveDuplicate(newProblem, dedupResult) {
    if (!this.problemRepo) {
      return { deduplicated: false, canonicalId: null };
    }

    const { canonicalId, layer, confidence } = dedupResult;

    this.logger?.info?.(
      { canonicalId, layer, confidence },
      'Resolving duplicate: adding source to canonical'
    );

    await this.problemRepo.addSourceToProblem(
      canonicalId,
      newProblem.sourceUrl,
      newProblem.sourceDomain,
      newProblem.sourceName,
      newProblem.publishedDate
    );

    await this.problemRepo.recordDuplicateGroup(canonicalId, [newProblem.id], layer, confidence);

    return { deduplicated: true, canonicalId };
  }

  static computeHash(text) {
    return crypto.createHash('sha256').update(String(text || '')).digest('hex');
  }
}

module.exports = FourLayerDedup;


