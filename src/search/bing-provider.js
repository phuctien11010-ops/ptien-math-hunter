class BingSearchProvider {
  constructor({
    apiKey = process.env.BING_SEARCH_API_KEY,
    endpoint = 'https://api.bing.microsoft.com/v7.0/search',
    logger = console,
  } = {}) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.logger = logger;
  }

  async search(query, limit = 10) {
    if (!this.apiKey) {
      this.logger.warn('BING_SEARCH_API_KEY not set; using demo fallback results.');
      return this._demoResults(query, limit);
    }

    const url = new URL(this.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(Math.min(limit, 10)));
    url.searchParams.set('mkt', 'en-US');

    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'User-Agent': 'PTIEN-Math-Hunter/1.0',
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`Bing Search failed (${response.status}): ${raw}`);
    }

    const payload = await response.json();
    const results = (payload.webPages?.value || []).map((item) => ({
      title: item.name || 'Untitled page',
      url: item.url,
      snippet: item.snippet || '',
      source: 'bing',
      displayUrl: item.displayUrl || item.url,
    }));

    return results.slice(0, limit);
  }

  _demoResults(query, limit = 10) {
    const fallback = [
      {
        title: `Tài liệu ${query} 1`,
        url: 'https://vietjack.com/toan-8/hinh-binh-hanh-bai-tap.jsp',
        snippet: 'Lý thuyết, tính chất, bài tập hình bình hành cho học sinh lớp 8.',
        source: 'demo',
        displayUrl: 'vietjack.com',
      },
      {
        title: `Tài liệu ${query} 2`,
        url: 'https://toanhoc.org/hinh-binh-hanh-lop-8',
        snippet: 'Bài tập và giải thích kỹ về hình bình hành, các định lý và ví dụ.',
        source: 'demo',
        displayUrl: 'toanhoc.org',
      },
      {
        title: `Tài liệu ${query} 3`,
        url: 'https://sachgiaibaitap.com/bai-tap-hinh-binh-hanh-lop-8.html',
        snippet: 'Hệ thống bài tập hình bình hành cơ bản và nâng cao.',
        source: 'demo',
        displayUrl: 'sachgiaibaitap.com',
      },
      {
        title: `Tài liệu ${query} 4`,
        url: 'https://toanhocthpt.com/hinh-binh-hanh-bai-tap',
        snippet: 'Phân dạng bài, ví dụ, và bài tập tự luyện về hình bình hành.',
        source: 'demo',
        displayUrl: 'toanhocthpt.com',
      },
      {
        title: `Tài liệu ${query} 5`,
        url: 'https://khan-academy.vn/hinh-binh-hanh-lop-8',
        snippet: 'Bài giảng và bài tập theo dạng của hình bình hành.',
        source: 'demo',
        displayUrl: 'khan-academy.vn',
      },
    ];

    return fallback.slice(0, Math.min(limit, fallback.length));
  }
}

module.exports = BingSearchProvider;
