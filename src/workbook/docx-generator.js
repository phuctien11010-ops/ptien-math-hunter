const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');

class DocxWorkbookGenerator {
  constructor({
    outputDir = path.join(process.cwd(), 'output', 'workbooks'),
    logger = console,
  } = {}) {
    this.outputDir = outputDir;
    this.logger = logger;
  }

  async generateWorkbook({ grade, topic, theory = [], formulas = [], problems = [], sources = [] }) {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: `TOÁN ${grade} - ${topic}`,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              text: 'Workbook được xây dựng từ nguồn thật trên Internet',
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: 'I. LÝ THUYẾT',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this._chunksToParagraphs(theory, 'theory'),
            new Paragraph({
              text: 'II. CÔNG THỨC',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this._chunksToParagraphs(formulas, 'formula'),
            new Paragraph({
              text: 'III. BÀI TẬP',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this._chunksToParagraphs(problems, 'problem'),
            new Paragraph({
              text: 'IV. NGUỒN THAM KHẢO',
              heading: HeadingLevel.HEADING_1,
            }),
            ...this._sourceParagraphs(sources),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `TOAN-${grade}-${String(topic).trim().replace(/\s+/g, '-')}.docx`;
    const outputPath = path.join(this.outputDir, fileName);
    fs.writeFileSync(outputPath, buffer);

    this.logger.info(`Workbook generated: ${outputPath}`);
    return outputPath;
  }

  _chunksToParagraphs(items, kind) {
    if (!Array.isArray(items) || !items.length) {
      return [new Paragraph({ text: 'Không có dữ liệu.' })];
    }

    return items.slice(0, 30).map((item) => {
      const text = kind === 'theory'
        ? `${item.title || 'Kiến thức'}: ${item.content || item.source || ''}`
        : kind === 'formula'
          ? `${item.formula || item.name || 'Công thức'} - ${item.source || ''}`
          : `${item.original_text || item.id || 'Bài tập'}${item.source_url ? ` (${item.source_url})` : ''}`;

      return new Paragraph({ children: [new TextRun(text)] });
    });
  }

  _sourceParagraphs(sources) {
    if (!Array.isArray(sources) || !sources.length) {
      return [new Paragraph({ text: 'Không có nguồn.' })];
    }

    return sources.slice(0, 25).map((source) => new Paragraph({
      children: [new TextRun(`${source.title || source.source_title || source.url || 'Nguồn'}: ${source.url || source.source_url || ''}`)],
    }));
  }
}

module.exports = DocxWorkbookGenerator;
