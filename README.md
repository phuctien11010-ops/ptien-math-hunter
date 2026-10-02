# ptien-math-hunter

Intelligent Internet-Based Mathematics Research, Collection, Classification & Self-Study Workbook System.

## Overview
This project is a JavaScript-based pipeline for:
- collecting mathematical problems from the web,
- normalizing and deduplicating them,
- classifying difficulty and problem type,
- storing canonical records and source references,
- sending ambiguous items to a review queue.

## Architecture
- `src/classifier/` – deterministic rule-based classification
- `src/dedup/` – 4-layer deduplication pipeline
- `src/repositories/` – data access and canonical problem management

## Quick start
```bash
npm install
node src/index.js
```

## Example usage
```javascript
const { DeterministicClassifier } = require('./src');

const classifier = new DeterministicClassifier(null, console);

const result = await classifier.classifyProblem(
  {
    original_text: 'Prove that the sum of two adjacent angles in a triangle is 180°.',
  },
  8,
  2
);

console.log(result);
```

## Upgrade notes
This version adds:
- safer handling for missing database objects,
- more robust normalization and keyword matching,
- better difficulty heuristics,
- a simpler project entry point for future expansion.
