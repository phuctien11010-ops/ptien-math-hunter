const HtmlExtractor = require('./extractor');

class WebCrawler {
  constructor({ timeout = 15000, logger = console, userAgent = 'PTIEN-Math-Hunter/1.0' } = {}) {
    this.timeout = timeout;
    this.logger = logger;
    this.userAgent = userAgent;
  }

  async fetchHtml(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  async crawlUrl(url) {
    if (!url) return null;

    try {
      const html = await this.fetchHtml(url);
      return {
        url,
        title: HtmlExtractor.extractTitle(html, url),
        text: HtmlExtractor.extractText(html),
        candidates: HtmlExtractor.extractCandidateProblems(HtmlExtractor.extractText(html)),
      };
    } catch (error) {
      this.logger.warn(`Unable to crawl ${url}: ${error.message}`);
      return null;
    }
  }

  async crawlUrls(urls, options = {}) {
    const max = Number(options.max ?? 20);
    const unique = [...new Set((urls || []).filter(Boolean))].slice(0, max);
    const payload = [];

    for (const url of unique) {
      const result = await this.crawlUrl(url);
      if (result) payload.push(result);
    }

    return payload;
  }
}

module.exports = WebCrawler;
