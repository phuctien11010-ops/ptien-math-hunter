const path = require('path');

const config = {
  // Paths
  FIXTURES_DIR: path.join(__dirname, '../fixtures'),
  OUTPUT_DIR: path.join(__dirname, '../output'),
  WORKBOOKS_DIR: path.join(__dirname, '../output/workbooks'),
  
  // Grade 8 - Parallelogram config
  PHASE1_GRADE: 8,
  PHASE1_SUBJECT: 'Mathematics',
  PHASE1_TOPIC: 'Parallelogram',
  PHASE1_FIXTURE: 'hinh-binh-hanh.json',
  
  // Classification
  CONFIDENCE_THRESHOLD: 0.75,
  
  // Dedup
  DEDUP_NORMALIZED_THRESHOLD: 0.95,
  DEDUP_JACCARD_THRESHOLD: 0.85,
  DEDUP_SEMANTIC_THRESHOLD: 0.90,
  
  // Workbook
  WORKBOOK_FILENAME: 'TOAN-8-HINH-BINH-HANH.docx',
  
  // Features
  REQUIRE_SOURCE_URL: true,
  VALIDATE_ALL_DATA: true,
};

module.exports = config;
