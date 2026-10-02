# PTIEN MATH HUNTER - Phase 1

## Mục tiêu Phase 1

Xây dựng **pipeline end-to-end** hoàn toàn **KHÔNG phụ thuộc Internet** để kiểm chứng:
- Phân loại bài toán
- Chống trùng 4 tầng
- Kiểm tra chất lượng
- Xây dựng lý thuyết/công thức
- Xuất workbook Word

## Luồng xử lý

```
FIXTURE DATA (20 bài thật)
    ↓
DATABASE (In-memory)
    ↓
CLASSIFICATION
  ├─ Grade: 8
  ├─ Subject: Mathematics
  ├─ Topic: Parallelogram
  ├─ Problem Type
  ├─ Difficulty + Confidence
    ↓
4-LAYER DEDUP
  ├─ Exact hash (SHA-256)
  ├─ Normalized text
  ├─ Jaccard similarity
  └─ Semantic interface (mock)
    ↓
QUALITY CHECK
  └─ Low confidence → REVIEW_QUEUE
    ↓
KNOWLEDGE BUILDER
  ├─ Extract theories
  ├─ Extract formulas
  └─ Link to problem types
    ↓
WORKBOOK GENERATOR
  └─ TOAN-8-HINH-BINH-HANH.docx
```

## Chạy Phase 1

### Chạy pipeline
```bash
npm run phase1
```

### Chạy test
```bash
npm run phase1:test
```

## Expected Output

```
✓ Fixture loaded: 20 problems
✓ Problems have source URLs: 20/20
✓ Classification completed: 20/20
  - Basic: 10
  - Advanced: 10
✓ Low-confidence items entered review queue: 0
✓ Duplicate detection works: 0 duplicates
✓ No invented problems: all have source_url
✓ Theory/formulas built: 5 sections
✓ Workbook generated: output/TOAN-8-HINH-BINH-HANH.docx
✓ Workbook contains:
  - Cover page
  - Table of contents
  - Theory (5 sections)
  - Formulas (3 formulas)
  - Problem types (4 types)
  - Basic problems (10)
  - Advanced problems (10)
  - Sources (3 URLs)
✓ End-to-end pipeline PASSED
```

## Điều kiện bắt buộc

- [x] Fixture data có source_url + source_domain
- [x] Classification deterministic (không AI)
- [x] 4-layer dedup hoạt động thật
- [x] Review queue bắt bài low-confidence
- [x] Workbook được tạo thực sự
- [x] Không có bài toán giả
- [x] Kiểm tra được truy ngược nguồn

## Cấu trúc thư mục

```
ptien-math-hunter/
├── src/
│   ├── core/
│   │   ├── classifier.js
│   │   ├── dedup.js
│   │   ├── knowledge.js
│   │   └── validator.js
│   ├── storage/
│   │   ├── database.js
│   │   ├── schema.js
│   │   └── repository.js
│   ├── workbook/
│   │   ├── generator.js
│   │   ├── formatter.js
│   │   └── docx-builder.js
│   ├── phase1.js (main entry point)
│   ├── logger.js
│   └── config.js
├── fixtures/
│   ├── grade8/
│   │   └── hinh-binh-hanh.json
│   ├── theories/
│   │   └── hinh-binh-hanh.json
│   └── sources.json
├── test/
│   ├── phase1.test.js
│   ├── classifier.test.js
│   ├── dedup.test.js
│   └── workbook.test.js
├── output/
│   └── workbooks/
├── package.json
└── PHASE_1.md
```

## Timeline

Không chuyển Phase 2 cho đến khi:
```
npm run phase1:test
```

Tất cả test PASS ✓
