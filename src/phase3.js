const SearchOrchestrator = require('./search/search-orchestrator');
const KnowledgeAggregator = require('./knowledge/knowledge-aggregator');
const ReviewQueue = require('./review/review-queue');
const DocxWorkbookGenerator = require('./workbook/docx-generator');
const fs = require('fs');
const path = require('path');

class Phase3KnowledgePipeline {
  constructor({
    grade = 8,
    subject = 'Toán',
    topic = 'Hình bình hành',
    targetCount = 100,
  } = {}) {
    this.grade = grade;
    this.subject = subject;
    this.topic = topic;
    this.targetCount = targetCount;
    this.reviewQueue = new ReviewQueue();
  }

  async run() {
    const search = new SearchOrchestrator({
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
      targetCount: this.targetCount,
      maxQueries: 80,
    });

    const results = await search.run();
    const knowledge = new KnowledgeAggregator({
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
    }).aggregateFromSearchResults(results.crawled || []);

    for (const problem of (knowledge.problems || [])) {
      if (!problem.original_text || !problem.source_url) {
        this.reviewQueue.addLowConfidence(problem.id || 'unknown', 0.4, 'Missing source or text');
      }
    }

    const workbook = new DocxWorkbookGenerator();
    const workbookPath = await workbook.generateWorkbook({
      grade: this.grade,
      topic: this.topic,
      theory: knowledge.theory,
      formulas: knowledge.formulas,
      problems: knowledge.problems,
      sources: (results.discovered || []).map((item) => ({
        title: item.title,
        url: item.url,
        source_url: item.url,
      })),
    });

    return {
      searchResults: results,
      knowledge,
      reviewQueue: this.reviewQueue.list(),
      workbookPath,
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const grade = Number(args.find((arg) => arg.startsWith('--grade='))?.split('=')[1] || 8);
  const topic = args.find((arg) => arg.startsWith('--topic='))?.split('=')[1] || 'Hình bình hành';
  const subject = args.find((arg) => arg.startsWith('--subject='))?.split('=')[1] || 'Toán';
  const count = Number(args.find((arg) => arg.startsWith('--count='))?.split('=')[1] || 100);

  const pipeline = new Phase3KnowledgePipeline({ grade, subject, topic, targetCount: count });
  pipeline.run().then((result) => {
    console.log(`Found ${result.knowledge.stats.problemCount} problem candidates`);
    console.log(`Workbook saved: ${result.workbookPath}`);
    console.log(`Review queue entries: ${result.reviewQueue.length}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = Phase3KnowledgePipeline;
