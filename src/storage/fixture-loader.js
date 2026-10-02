const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

class FixtureLoader {
  static loadProblems() {
    const filepath = path.join(
      config.FIXTURES_DIR,
      'grade8',
      config.PHASE1_FIXTURE
    );

    try {
      const raw = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(raw);
      return data.problems || [];
    } catch (error) {
      logger.error(`Failed to load fixture: ${error.message}`);
      return [];
    }
  }

  static loadTheories() {
    const filepath = path.join(
      config.FIXTURES_DIR,
      'theories',
      config.PHASE1_FIXTURE
    );

    try {
      const raw = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      logger.error(`Failed to load theory fixture: ${error.message}`);
      return { sections: [] };
    }
  }
}

module.exports = FixtureLoader;
