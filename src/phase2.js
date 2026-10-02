const fs = require('fs');
const path = require('path');
const QueryBuilder = require('../search/query-builder');
const BingSearchProvider = require('../search/bing-provider');
const WebCrawler = require('../crawler/crawler');

class Phase2SearchPipeline {
  constructor({
    grade = 8,
    subject = 'Toán',
    topic = 'Hình bình hành',
    targetCount = 20,
    searchProvider = new BingSearchProvider(),
    crawler = new WebCrawler(),
    outputDir = path.join(process.cwd(), 'output', 'phase2'),
  } = {}) {
    this.grade = grade;
    this.subject = subject;
    this.topic = topic;
    this.targetCount = targetCount;
    this.searchProvider = searchProvider;
    this.crawler = crawler;
    this.outputDir = outputDir;
  }

  async run() {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const queries = QueryBuilder.build(this.grade, this.topic, this.subject, { limit: 20 });
    const discovered = [];

    for (const query of queries) {
      const results = await this.searchProvider.search(query, 5);
      for (const item of results) {
        if (!item || !item.url) continue;

        const exists = discovered.some((row) => row.url === item.url);
        if (!exists) {
          discovered.push({ ...item, query });
        }
      }

      if (discovered.length >= this.targetCount) break;
    }

    const crawled = await this.crawler.crawlUrls(
      discovered.map((item) => item.url),
      { max: this.targetCount }
    );

    const payload = {
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
      targetCount: this.targetCount,
      queries,
      discovered,
      crawled,
      generated_at: new Date().toISOString(),
    };

    const safeTopic = String(this.topic).trim().replace(/\s+/g, '-');
    const outputPath = path.join(this.outputDir, `phase2-results-${this.grade}-${safeTopic}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');

    return payload;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const grade = Number(args.find((arg) => arg.startsWith('--grade='))?.split('=')[1] || 8);
  const topic = args.find((arg) => arg.startsWith('--topic='))?.split('=')[1] || 'Hình bình hành';
  const subject = args.find((arg) => arg.startsWith('--subject='))?.split('=')[1] || 'Toán';
  const target = Number(args.find((arg) => arg.startsWith('--count='))?.split('=')[1] || 20);

  const runner = new Phase2SearchPipeline({ grade, subject, topic, targetCount: target });
  runner.run()
    .then((result) => {
      console.log(`Discovered ${result.discovered.length} URLs`);
      console.log(`Crawled ${result.crawled.length} pages`);
      console.log(`Saved to ${path.join(process.cwd(), 'output', 'phase2')}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = Phase2SearchPipeline;
