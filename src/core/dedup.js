const crypto = require('crypto');

class Dedup {
  static computeHash(text) {
    return crypto.createHash('sha256').update(String(text || '')).digest('hex');
  }

  static normalize(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:!?()\[\]{}]/g, '')
      .replace(/\.$/, '');
  }

  /**
   * Layer 1: Exact hash match
   */
  static layer1Exact(candidate, existing) {
    const candHash = this.computeHash(candidate.normalized_text);
    for (const item of existing) {
      if (item.text_hash === candHash) {
        return { isDuplicate: true, layer: 'EXACT', confidence: 1.0, canonicalId: item.id };
      }
    }
    return null;
  }

  /**
   * Layer 2: Normalized text match
   */
  static layer2Normalized(candidate, existing) {
    const candNorm = this.normalize(candidate.normalized_text);
    for (const item of existing) {
      const itemNorm = this.normalize(item.normalized_text);
      if (candNorm === itemNorm) {
        return { isDuplicate: true, layer: 'NORMALIZED', confidence: 0.95, canonicalId: item.id };
      }
    }
    return null;
  }

  /**
   * Layer 3: Jaccard similarity
   */
  static layer3Jaccard(candidate, existing, threshold = 0.85) {
    const candShingles = this._toShingles(candidate.normalized_text);
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const item of existing) {
      const itemShingles = this._toShingles(item.normalized_text);
      const similarity = this._jaccardSimilarity(candShingles, itemShingles);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = item;
      }
    }

    if (bestSimilarity >= threshold) {
      return { isDuplicate: true, layer: 'JACCARD', confidence: bestSimilarity, canonicalId: bestMatch.id };
    }

    return null;
  }

  /**
   * Layer 4: Semantic interface (mock for Phase 1)
   * In Phase 2/3, replace with real embedding provider
   */
  static layer4Semantic(candidate, existing, threshold = 0.90) {
    // Phase 1: Mock - always return null
    // Phase 2+: Integrate embedding provider (OpenAI, HuggingFace, etc.)
    return null;
  }

  /**
   * Main dedup pipeline
   */
  static deduplicate(candidate, existingProblems) {
    // Layer 1
    let result = this.layer1Exact(candidate, existingProblems);
    if (result) return result;

    // Layer 2
    result = this.layer2Normalized(candidate, existingProblems);
    if (result) return result;

    // Layer 3
    result = this.layer3Jaccard(candidate, existingProblems);
    if (result) return result;

    // Layer 4
    result = this.layer4Semantic(candidate, existingProblems);
    if (result) return result;

    return { isDuplicate: false, layer: null, confidence: null, canonicalId: null };
  }

  static _toShingles(text, n = 3) {
    const words = String(text || '').toLowerCase().split(/\s+/);
    const shingles = new Set();

    for (let i = 0; i <= words.length - n; i++) {
      if (i + n <= words.length) {
        shingles.add(words.slice(i, i + n).join(' '));
      }
    }

    return shingles;
  }

  static _jaccardSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
}

module.exports = Dedup;
