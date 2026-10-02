class Knowledge {
  /**
   * Extract theory sections from fixture
   */
  static buildTheory(theoryData) {
    if (!theoryData || !theoryData.sections) {
      return [];
    }

    return theoryData.sections.map((section) => ({
      title: section.title,
      content: section.content || '',
      items: section.items || [],
      sources: section.source_urls || [],
    }));
  }

  /**
   * Extract formulas from fixture
   */
  static buildFormulas(theoryData) {
    if (!theoryData || !theoryData.sections) {
      return [];
    }

    const formulas = [];
    for (const section of theoryData.sections) {
      if (section.formulas) {
        formulas.push(...section.formulas);
      }
    }

    return formulas;
  }

  /**
   * Group problems by type
   */
  static groupByType(problems) {
    const groups = {};

    for (const problem of problems) {
      const type = problem.problem_type || 'General';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(problem);
    }

    return groups;
  }

  /**
   * Separate by difficulty
   */
  static separateByDifficulty(problems) {
    return {
      basic: problems.filter((p) => p.difficulty === 'Basic'),
      advanced: problems.filter((p) => p.difficulty === 'Advanced'),
    };
  }
}

module.exports = Knowledge;
