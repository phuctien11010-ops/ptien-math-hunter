const fs = require('fs');
const path = require('path');
const QueryBuilder = require('./query-builder');
const BingSearchProvider = require('./bing-provider');
const WebCrawler = require('../crawler/crawler');

class SearchOrchestrator {
  constructor({
    grade = 8,
    subject = 'Toán',
    topic = 'Hình bình hành',
    targetCount = 100,
    maxQueries = 80,
    providers = [],
    crawler = new WebCrawler(),
    outputDir = path.join(process.cwd(), 'output', 'search'),
  } = {}) {
    this.grade = grade;
    this.subject = subject;
    this.topic = topic;
    this.targetCount = targetCount;
    this.maxQueries = maxQueries;
    this.providers = providers.length ? providers : [new BingSearchProvider()];
    this.crawler = crawler;
    this.outputDir = outputDir;
  }

  async run() {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const queryList = QueryBuilder.build(this.grade, this.topic, this.subject, {
      limit: this.maxQueries,
    });

    const discovered = [];
    const pages = [];

    for (const query of queryList) {
      for (const provider of this.providers) {
        if (discovered.length >= this.targetCount) break;
        const results = await provider.search(query, 8).catch(() => []);

        for (const item of results) {
          if (!item || !item.url) continue;
          const key = item.url.trim();
          if (!discovered.some((row) => row.url === key)) {
            discovered.push({ ...item, query, domain: this._domainOf(key) });
          }
        }
      }

      if (discovered.length >= this.targetCount) break;
    }

    for (const item of discovered.slice(0, this.targetCount)) {
      const page = await this.crawler.crawlUrl(item.url);
      if (page) {
        pages.push({
          ...item,
          title: page.title || item.title,
          text: page.text,
          candidates: page.candidates,
        });
      }
    }

    const stats = {
      queries: queryList.length,
      urls: discovered.length,
      crawledPages: pages.length,
      uniqueDomains: [...new Set(pages.map((page) => page.domain))].length,
      targetCount: this.targetCount,
    };

    const output = {
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
      generated_at: new Date().toISOString(),
      statistics: stats,
      queries: queryList,
      discovered,
      crawled: pages,
    };

    const fileName = `search-${this.grade}-${String(this.topic).trim().replace(/\s+/g, '-')}.json`;
    const outputPath = path.join(this.outputDir, fileName);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    return output;
  }

  _domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }
}

module.exports = SearchOrchestrator;
