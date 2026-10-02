class HtmlExtractor {
  static stripTags(html) {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  static extractTitle(html, fallbackUrl = '') {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (match && match[1]) {
      return this.stripTags(match[1]).trim();
    }
    return fallbackUrl || 'Untitled page';
  }

  static extractText(html) {
    return this.stripTags(html);
  }

  static extractCandidateProblems(text) {
    const raw = String(text || '');
    if (!raw) return [];

    const sentences = raw
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => /(hình bình hành|parallelogram|chứng minh|tính|xác định|bài tập|công thức|định nghĩa)/i.test(s));

    return sentences.slice(0, 25).map((sentence, index) => ({
      id: `candidate-${index + 1}`,
      text: sentence,
      source: 'page-text',
    }));
  }
}

module.exports = HtmlExtractor;
