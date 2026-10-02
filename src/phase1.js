const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const Classifier = require('./core/classifier');
const Dedup = require('./core/dedup');
const Knowledge = require('./core/knowledge');
const Validator = require('./core/validator');
const Database = require('./storage/database');
const FixtureLoader = require('./storage/fixture-loader');
const WorkbookGenerator = require('./workbook/generator');

class Phase1Pipeline {
  constructor() {
    this.db = new Database();
    this.logger = logger;
    this.stats = {
      loaded: 0,
      validated: 0,
      classified: 0,
      duplicates: 0,
      toReview: 0,
      final: 0,
    };
  }

  async run() {
    logger.section('PHASE 1: END-TO-END PIPELINE');

    try {
      // Step 1: Load fixtures
      await this.step1LoadFixtures();

      // Step 2: Validate
      await this.step2Validate();

      // Step 3: Classify
      await this.step3Classify();

      // Step 4: Dedup
      await this.step4Dedup();

      // Step 5: Review
      await this.step5Review();

      // Step 6: Build knowledge
      await this.step6Knowledge();

      // Step 7: Generate workbook
      await this.step7Workbook();

      // Step 8: Summary
      await this.step8Summary();

      return true;
    } catch (error) {
      logger.error(`Pipeline failed: ${error.message}`);
      console.error(error);
      return false;
    }
  }

  async step1LoadFixtures() {
    logger.info('Step 1: Loading fixtures...');

    const problems = FixtureLoader.loadProblems();
    const theories = FixtureLoader.loadTheories();

    this.stats.loaded = problems.length;

    for (const problem of problems) {
      this.db.addProblem(problem);
    }

    this.db.setTheories(theories.sections || []);

    logger.success(`Loaded ${problems.length} problems from fixture`);
  }

  async step2Validate() {
    logger.info('Step 2: Validating problems...');

    const problems = this.db.getAllProblems();
    const errors = [];

    for (const problem of problems) {
      const validation = Validator.validateProblem(problem);
      if (!validation.valid) {
        errors.push({ problemId: problem.id, errors: validation.errors });
      }
    }

    if (errors.length > 0) {
      logger.warn(`Validation errors found: ${errors.length}`);
      for (const err of errors) {
        logger.error(`  Problem ${err.problemId}: ${err.errors.join(', ')}`);
      }
      throw new Error('Validation failed');
    }

    // Check all have sources
    const sourceCheck = Validator.checkAllHaveSources(problems);
    if (!sourceCheck.allHaveSources) {
      throw new Error(`${sourceCheck.withoutSourceCount} problems missing source_url`);
    }

    this.stats.validated = problems.length;
    logger.success(`All ${problems.length} problems have valid source URLs`);
  }

  async step3Classify() {
    logger.info('Step 3: Classifying problems...');

    const problems = this.db.getAllProblems();

    for (const problem of problems) {
      const classification = Classifier.classify(problem);
      this.db.storeClassification(problem.id, classification);
    }

    this.stats.classified = problems.length;
    logger.success(`Classified ${problems.length} problems`);
  }

  async step4Dedup() {
    logger.info('Step 4: Running deduplication...');

    const problems = this.db.getAllProblems();
    const dedupResults = [];

    for (let i = 0; i < problems.length; i++) {
      const candidate = problems[i];
      const existing = problems.slice(0, i); // Only check against previous items

      const result = Dedup.deduplicate(candidate, existing);
      this.db.storeDepupResult(candidate.id, result);

      if (result.isDuplicate) {
        this.stats.duplicates++;
        logger.warn(`Duplicate found: ${candidate.id} matches ${result.canonicalId} (${result.layer})`);
      }
    }

    logger.success(`Deduplication complete: ${this.stats.duplicates} duplicates detected`);
  }

  async step5Review() {
    logger.info('Step 5: Quality check and review queue...');

    const problems = this.db.getAllProblems();

    for (const problem of problems) {
      const classification = this.db.getClassification(problem.id);

      if (Validator.shouldReview(classification)) {
        this.db.addToReviewQueue(
          problem,
          `Low confidence: ${classification.overall_confidence.toFixed(2)}`,
          classification
        );
        this.stats.toReview++;
      }
    }

    const reviewQueue = this.db.getReviewQueue();
    logger.success(`Quality check complete: ${reviewQueue.length} items to review`);
  }

  async step6Knowledge() {
    logger.info('Step 6: Building knowledge base...');

    const theories = this.db.theories;
    const formulas = Knowledge.buildFormulas({ sections: theories });

    this.db.setFormulas(formulas);

    logger.success(`Theory sections: ${theories.length}`);
    logger.success(`Formulas extracted: ${formulas.length}`);
  }

  async step7Workbook() {
    logger.info('Step 7: Generating workbook...');

    const generator = new WorkbookGenerator(this.db, logger);
    const outputPath = generator.generate();

    logger.success(`Workbook generated: ${outputPath}`);
    this.workbookPath = outputPath;
  }

  async step8Summary() {
    logger.section('PHASE 1 SUMMARY');

    const problems = this.db.getAllProblems();
    const basic = problems.filter((p) => p.difficulty === 'Basic').length;
    const advanced = problems.filter((p) => p.difficulty === 'Advanced').length;
    const reviewQueue = this.db.getReviewQueue();

    console.log(`
✓ Problems loaded:        ${this.stats.loaded}`);
    console.log(`✓ Problems validated:     ${this.stats.validated}`);
    console.log(`✓ All have source URLs:   ${this.stats.validated}/\n`);
    console.log(`✓ Problems classified:    ${this.stats.classified}`);
    console.log(`  - Basic:                ${basic}`);
    console.log(`  - Advanced:             ${advanced}\n`);
    console.log(`✓ Duplicates detected:    ${this.stats.duplicates}`);
    console.log(`✓ Quality reviewed:       ${this.stats.toReview} items in queue\n`);
    console.log(`✓ Theory sections:        ${this.db.theories.length}`);
    console.log(`✓ Formulas:               ${this.db.formulas.length}\n`);
    console.log(`✓ Workbook generated:     ${path.basename(this.workbookPath)}\n`);

    logger.success('PHASE 1 PIPELINE COMPLETE');
  }
}

if (require.main === module) {
  const pipeline = new Phase1Pipeline();
  pipeline.run().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = Phase1Pipeline;
