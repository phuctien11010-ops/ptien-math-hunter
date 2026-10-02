class QueryBuilder {
  static build(grade, topic, subject = 'Toán', options = {}) {
    const baseTopic = String(topic || 'Hình bình hành').trim();
    const baseSubject = String(subject || 'Toán').trim();
    const gradeLabel = `Lớp ${grade || 8}`;

    const templates = [
      `${baseSubject} ${gradeLabel} ${baseTopic}`,
      `${baseSubject} ${gradeLabel} ${baseTopic} bài tập`,
      `${baseSubject} ${gradeLabel} ${baseTopic} cơ bản`,
      `${baseSubject} ${gradeLabel} ${baseTopic} nâng cao`,
      `${baseSubject} ${gradeLabel} ${baseTopic} lý thuyết`,
      `${baseSubject} ${gradeLabel} ${baseTopic} công thức`,
      `${baseSubject} ${gradeLabel} ${baseTopic} chứng minh`,
      `${baseSubject} ${gradeLabel} ${baseTopic} tính chất`,
      `${baseSubject} ${gradeLabel} ${baseTopic} đề kiểm tra`,
      `${baseSubject} ${gradeLabel} ${baseTopic} bài tập có đáp án`,
      `${baseSubject} ${gradeLabel} ${baseTopic} pdf`,
      `${baseSubject} ${gradeLabel} ${baseTopic} online`,
      `${baseSubject} ${gradeLabel} ${baseTopic} luyện tập`,
      `${baseSubject} ${gradeLabel} ${baseTopic} trắc nghiệm`,
      `${baseSubject} ${gradeLabel} ${baseTopic} tự luận`,
      `${baseSubject} ${grade} ${baseTopic} dạng bài`,
      `${baseSubject} ${grade} ${baseTopic} hệ thống bài tập`,
      `${baseSubject} ${gradeLabel} ${baseTopic} chuyên đề`,
      `${baseSubject} ${grade} ${baseTopic} nâng cao có lời giải`,
      `${baseSubject} ${grade} ${baseTopic} cơ bản nâng cao`,
      `${baseSubject} ${gradeLabel} ${baseTopic} dạng 1`,
      `${baseSubject} ${gradeLabel} ${baseTopic} dạng 2`,
      `${baseSubject} ${gradeLabel} ${baseTopic} dạng 3`,
      `${baseSubject} ${gradeLabel} ${baseTopic} cách giải`,
      `${baseSubject} ${gradeLabel} ${baseTopic} ôn tập`,
      `${baseSubject} ${gradeLabel} ${baseTopic} kiến thức`,
      `${baseSubject} ${gradeLabel} ${baseTopic} bài tập tổng hợp`,
      `${baseSubject} ${gradeLabel} ${baseTopic} lớp 8`,
      `${baseSubject} ${gradeLabel} ${baseTopic} từ cơ bản đến nâng cao`,
      `${baseSubject} ${gradeLabel} ${baseTopic} website`,
      `${baseSubject} ${grade} ${baseTopic} giải nhanh`,
      `${baseSubject} ${gradeLabel} ${baseTopic} hình học`,
      `${baseSubject} ${gradeLabel} ${baseTopic} luyện thi`,
      `toán ${grade} ${baseTopic}`,
      `toán ${grade} ${baseTopic} bài tập`,
      `toán ${grade} ${baseTopic} lý thuyết`,
      `toán ${grade} ${baseTopic} công thức`,
      `toán ${grade} ${baseTopic} dạng bài`,
      `toán ${grade} ${baseTopic} nâng cao`,
      `toán ${grade} ${baseTopic} cơ bản`,
      `toán ${grade} ${baseTopic} chứng minh`,
      `toán ${grade} ${baseTopic} tính chất`,
      `toán ${grade} ${baseTopic} hoàn toàn`,
      `toán ${grade} ${baseTopic} chuyên đề`,
      `toán ${grade} ${baseTopic} đề kiểm tra`,
      `toán ${grade} ${baseTopic} giảng dạy`,
      `toán ${grade} ${baseTopic} worksheet`,
      `toán ${grade} ${baseTopic} pdf`,
      `toán ${grade} ${baseTopic} word`,
      `toán ${grade} ${baseTopic} cho học sinh`,
      `toán ${grade} ${baseTopic} mẫu bài tập`,
      `toán ${grade} ${baseTopic} tìm hiểu`,
      `toán ${grade} ${baseTopic} vẽ hình`,
      `toán ${grade} ${baseTopic} và ví dụ`,
      `toán ${grade} ${baseTopic} luyện tập online`,
    ];

    const deduped = [...new Set(templates.map((v) => v.trim().replace(/\s+/g, ' ')))];
    return options.limit ? deduped.slice(0, Number(options.limit)) : deduped;
  }
}

module.exports = QueryBuilder;
