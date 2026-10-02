/**
 * Candidate Extractor
 *
 * Extracts candidate problems from crawled web pages.
 * Candidates are DISCOVERED, not yet VERIFIED.
 *
 * Process:
 * 1. Parse page content
 * 2. Identify potential problem blocks (headers, paragraphs, lists)
 * 3. Extract with metadata (position, context, confidence)
 * 4. Mark as DISCOVERED state
 *
 * Important: A candidate is NOT a verified problem.
 */

class CandidateExtractor {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  /**
   * Extract candidates from a crawled page
   * @param {Object} page - Crawled page with { sourceUrl, sourceTitle, text }
   * @returns {Array} Candidate objects with state: DISCOVERED
   */
  extract(page) {
    if (!page || !page.text) {
      return [];
    }

    const candidates = [];

    // Strategy 1: Extract from paragraphs that look like math problems
    const paragraphs = this._extractParagraphs(page.text);
    paragraphs.forEach((para, index) => {
      if (this._looksLikeProblem(para)) {
        candidates.push({
          id: `cand_${Date.now()}_${index}`,
          text: para.trim(),
          type: 'PROBLEM',
          confidence: 0.6,
          extractedFrom: {
            sourceUrl: page.sourceUrl,
            sourceTitle: page.sourceTitle,
            position: 'paragraph',
          },
        });
      }
    });

    // Strategy 2: Extract from list items
    const listItems = this._extractListItems(page.text);
    listItems.forEach((item, index) => {
      if (this._looksLikeProblem(item) && item.length > 10) {
        candidates.push({
          id: `cand_list_${Date.now()}_${index}`,
          text: item.trim(),
          type: 'PROBLEM',
          confidence: 0.55,
          extractedFrom: {
            sourceUrl: page.sourceUrl,
            sourceTitle: page.sourceTitle,
            position: 'list',
          },
        });
      }
    });

    // Strategy 3: Extract theory/formula sections
    const theorySections = this._extractTheorySections(page.text);
    theorySections.forEach((section, index) => {
      if (section.content.length > 20) {
        candidates.push({
          id: `cand_theory_${Date.now()}_${index}`,
          text: section.content.trim(),
          type: 'THEORY',
          title: section.title,
          confidence: 0.7,
          extractedFrom: {
            sourceUrl: page.sourceUrl,
            sourceTitle: page.sourceTitle,
            position: 'theory',
          },
        });
      }
    });

    this.logger?.debug?.(
      { sourceUrl: page.sourceUrl, candidatesFound: candidates.length },
      'Extraction complete'
    );

    return candidates;
  }

  /**
   * Extract paragraphs separated by 2+ newlines
   * @private
   */
  _extractParagraphs(text) {
    if (!text) return [];

    return text
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20 && p.length < 1000);
  }

  /**
   * Extract list items (- or * or numbered)
   * @private
   */
  _extractListItems(text) {
    if (!text) return [];

    const lines = text.split('\n');
    const items = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match: "- item", "* item", "1. item", "a) item"
      const match = trimmed.match(/^(?:[-*]|\d+\.|\w\))\s+(.+)$/);
      if (match && match[1]) {
        items.push(match[1]);
      }
    }

    return items.filter((item) => item.length > 10);
  }

  /**
   * Extract sections that look like theory/formula
   * @private
   */
  _extractTheorySections(text) {
    if (!text) return [];

    const sections = [];
    const lines = text.split('\n');

    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect section headers (uppercase, short, with certain keywords)
      const isHeader =
        line.length < 80 &&
        (line.includes('Định lý') ||
          line.includes('Tính chất') ||
          line.includes('Công thức') ||
          line.includes('Lý thuyết') ||
          line.includes('Definition') ||
          line.includes('Theorem') ||
          line.includes('Formula') ||
          (line.toUpperCase() === line && line.length > 3 && line.length < 50));

      if (isHeader) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line,
          content: '',
        };
      } else if (currentSection && line) {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    }

    if (currentSection && currentSection.content.length > 20) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Heuristic: does text look like a math problem?
   * @private
   */
  _looksLikeProblem(text) {
    if (!text || text.length < 10) return false;

    // Keywords that suggest a problem or exercise
    const keywords = [
      'bài toán',
      'bài tập',
      'bài tập',
      'Bài',
      'Hãy',
      'Tính',
      'Chứng minh',
      'Giải',
      'Cho',
      'Cho biết',
      'problem',
      'exercise',
      'solve',
      'prove',
      'find',
      'calculate',
    ];

    const hasKeyword = keywords.some(
      (kw) => text.toLowerCase().includes(kw.toLowerCase())
    );

    // Heuristic: contains numbers or symbols typical of math
    const hasMathSymbols = /[\d\+\-\*\/=\(\)\[\]∆°√π]/.test(text);

    // Heuristic: appears to be a question or instruction
    const isInstructive = /[?!]$/.test(text.trim());

    return hasKeyword || (hasMathSymbols && (hasKeyword || isInstructive));
  }
}

module.exports = CandidateExtractor;
