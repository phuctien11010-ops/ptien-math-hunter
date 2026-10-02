const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class ProblemStore {
  constructor(baseDir = path.join(process.cwd(), 'data')) {
    this.baseDir = baseDir;
    this.problemsFile = path.join(baseDir, 'problems.json');
    this.reviewQueueFile = path.join(baseDir, 'review-queue.json');
    this.ensureStorage();
  }

  ensureStorage() {
    fs.mkdirSync(this.baseDir, { recursive: true });

    if (!fs.existsSync(this.problemsFile)) {
      fs.writeFileSync(this.problemsFile, '[]', 'utf8');
    }

    if (!fs.existsSync(this.reviewQueueFile)) {
      fs.writeFileSync(this.reviewQueueFile, '[]', 'utf8');
    }
  }

  readJson(filePath) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
  }

  async listProblems() {
    return this.readJson(this.problemsFile);
  }

  async saveProblem(problem) {
    const all = this.readJson(this.problemsFile);
    const next = { ...problem, id: problem.id || randomUUID(), created_at: new Date().toISOString() };
    all.push(next);
    this.writeJson(this.problemsFile, all);
    return next;
  }

  async findByHash(textHash) {
    const all = this.readJson(this.problemsFile);
    return all.find((item) => item.text_hash === textHash) || null;
  }

  async addSource(problemId, sourceUrl, sourceDomain, sourceName, publishedDate) {
    const all = this.readJson(this.problemsFile);
    const index = all.findIndex((item) => item.id === problemId);

    if (index === -1) {
      return null;
    }

    const sources = Array.isArray(all[index].sources) ? all[index].sources : [];
    const exists = sources.some((source) => source.source_url === sourceUrl);

    if (!exists) {
      sources.push({
        id: randomUUID(),
        source_url: sourceUrl,
        source_domain: sourceDomain || null,
        source_name: sourceName || null,
        published_date: publishedDate || null,
        discovered_at: new Date().toISOString(),
      });
      all[index].sources = sources;
      this.writeJson(this.problemsFile, all);
    }

    return all[index];
  }

  async saveReview(review) {
    const list = this.readJson(this.reviewQueueFile);
    const next = { ...review, id: review.id || randomUUID(), created_at: new Date().toISOString() };
    list.push(next);
    this.writeJson(this.reviewQueueFile, list);
    return next;
  }
}

module.exports = { ProblemStore };
