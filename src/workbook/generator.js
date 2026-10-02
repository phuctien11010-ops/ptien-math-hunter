const fs = require('fs');
const path = require('path');
const config = require('../config');

class WorkbookGenerator {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  generate() {
    const problems = this.db.getAllProblems();
    const theories = this.db.theories;
    const formulas = this.db.formulas;

    let docContent = this._buildContent(problems, theories, formulas);

    // For Phase 1, we'll save as a structured JSON that can be converted to DOCX
    // In production, use docx library to generate real .docx files
    const outputPath = path.join(
      config.OUTPUT_DIR,
      'workbooks',
      config.WORKBOOK_FILENAME.replace('.docx', '.json')
    );

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(docContent, null, 2), 'utf8');

    return outputPath;
  }

  _buildContent(problems, theories, formulas) {
    const basic = problems.filter((p) => p.difficulty === 'Basic');
    const advanced = problems.filter((p) => p.difficulty === 'Advanced');

    const groupedByType = {};
    for (const problem of problems) {
      const type = problem.problem_type || 'General';
      if (!groupedByType[type]) groupedByType[type] = [];
      groupedByType[type].push(problem);
    }

    return {
      metadata: {
        title: 'TOÁN 8 - HÌNH BÌNH HÀNH',
        grade: 8,
        subject: 'Mathematics',
        topic: 'Parallelogram',
        generated_at: new Date().toISOString(),
      },
      sections: [
        {
          type: 'cover',
          title: 'TOÁN 8 - HÌNH BÌNH HÀNH',
          subtitle: 'Tài liệu tự học và tự luyện',
        },
        {
          type: 'toc',
          title: 'MỤC LỤC',
        },
        {
          type: 'theory',
          title: 'I. LÝ THUYẾT',
          subsections: theories,
        },
        {
          type: 'formulas',
          title: 'II. CÔNG THỨC',
          formulas: formulas,
        },
        {
          type: 'problem_types',
          title: 'III. CÁC DẠNG BÀI',
          groups: groupedByType,
        },
        {
          type: 'problems_basic',
          title: 'IV. BÀI TẬP CƠ BẢN',
          problems: basic,
        },
        {
          type: 'problems_advanced',
          title: 'V. BÀI TẬP NÂNG CAO',
          problems: advanced,
        },
        {
          type: 'sources',
          title: 'VI. NGUỒN THAM KHẢO',
          sources: this._extractSources(problems),
        },
      ],
    };
  }

  _extractSources(problems) {
    const sources = new Map();

    for (const problem of problems) {
      if (problem.source_url) {
        if (!sources.has(problem.source_url)) {
          sources.set(problem.source_url, {
            url: problem.source_url,
            name: problem.source_name || 'Unknown',
            domain: problem.source_domain || 'unknown',
          });
        }
      }
    }

    return Array.from(sources.values());
  }
}

module.exports = WorkbookGenerator;
