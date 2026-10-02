class KnowledgeAggregator {
  constructor({
    grade = 8,
    subject = 'Toán',
    topic = 'Hình bình hành',
  } = {}) {
    this.grade = grade;
    this.subject = subject;
    this.topic = topic;
  }

  aggregateFromSearchResults(crawled = []) {
    const theory = [];
    const formulas = [];
    const problemTypes = {};
    const problems = [];

    for (const page of crawled) {
      const text = String(page.text || '');
      const pageTitle = String(page.title || page.url || 'unknown');

      const sections = this._extractTheorySections(text, pageTitle);
      theory.push(...sections);

      const formulaMatches = this._extractFormulas(text, pageTitle);
      formulas.push(...formulaMatches);

      const typeGroups = this._extractProblemTypes(text, pageTitle);
      for (const [type, items] of Object.entries(typeGroups)) {
        problemTypes[type] = [...(problemTypes[type] || []), ...items];
      }

      const problemCandidates = this._extractProblemCandidates(text, pageTitle, page.url);
      problems.push(...problemCandidates);
    }

    return {
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
      theory,
      formulas,
      problemTypes,
      problems,
      stats: {
        theoryCount: theory.length,
        formulaCount: formulas.length,
        problemCount: problems.length,
      },
    };
  }

  _extractTheorySections(text, title) {
    const sections = [];
    const markerList = [
      'định nghĩa',
      'tính chất',
      'dấu hiệu',
      'đường chéo',
      'góc',
      'diện tích',
      'chu vi',
      'tổng hợp',
    ];

    const matches = markerList.filter((marker) => text.toLowerCase().includes(marker));
    for (const marker of matches) {
      sections.push({
        title: `${title} - ${marker}`,
        content: marker,
        source: title,
      });
    }

    return sections.length ? sections : [{ title: 'Kiến thức tổng quát', content: title, source: title }];
  }

  _extractFormulas(text, title) {
    const patterns = [
      /S\s*=\s*.*(?:diện tích|area)/gi,
      /C\s*=\s*.*(?:chu vi|perimeter)/gi,
      /\b[a-zA-Z0-9]+\s*=\s*.*\+\s*.*\b/gi,
    ];

    const formulas = [];
    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        formulas.push({
          formula: match.trim(),
          source: title,
        });
      }
    }

    return formulas.slice(0, 20);
  }

  _extractProblemTypes(text, title) {
    const map = {};
    const keywords = {
      'Cơ bản': ['bài tập cơ bản', 'bài 1', 'tính chu vi', 'tính diện tích', 'đơn giản'],
      'Nâng cao': ['nâng cao', 'chứng minh', 'giải thích', 'đề khó', 'bài tổng hợp'],
      'Tính chất': ['tính chất', 'dấu hiệu', 'đường chéo'],
      'Góc': ['góc', 'angle'],
      'Diện tích': ['diện tích', 'area'],
      'Chứng minh': ['chứng minh'],
    };

    for (const [type, phrases] of Object.entries(keywords)) {
      if (phrases.some((phrase) => text.toLowerCase().includes(phrase))) {
        map[type] = [...(map[type] || []), title];
      }
    }

    return map;
  }

  _extractProblemCandidates(text, title, url) {
    const raw = String(text || '').split(/[.!?\n]+/);
    return raw
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .filter((sentence) => /(tính|chứng minh|xác định|bài tập|điền|so sánh|vẽ)/i.test(sentence))
      .slice(0, 15)
      .map((sentence, index) => ({
        id: `${this.grade}-${this.topic}-${index + 1}`,
        original_text: sentence,
        source_url: url,
        source_title: title,
        source_domain: this._domainOf(url),
        difficulty: /nâng cao|chứng minh|tổng hợp|phức hợp/i.test(sentence) ? 'Advanced' : 'Basic',
      }));
  }

  _domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }
}

module.exports = KnowledgeAggregator;
