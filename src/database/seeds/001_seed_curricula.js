const { v4: uuid } = require('uuid');

exports.seed = async function (knex) {
  // Truncate existing data
  await knex('formula_sources').del();
  await knex('formulas').del();
  await knex('theory_sources').del();
  await knex('theories').del();
  await knex('problem_types').del();
  await knex('subtopics').del();
  await knex('topics').del();
  await knex('chapters').del();
  await knex('subjects').del();
  await knex('grades').del();

  // Seed Grades
  const gradesData = [
    { grade_number: 6, name: 'Grade 6', description: 'Elementary Mathematics Level 6' },
    { grade_number: 7, name: 'Grade 7', description: 'Elementary Mathematics Level 7' },
    { grade_number: 8, name: 'Grade 8', description: 'Secondary Mathematics Level 8' },
    { grade_number: 9, name: 'Grade 9', description: 'Secondary Mathematics Level 9' },
  ];

  const grades = await knex('grades').insert(gradesData).returning('*');
  const gradeMap = Object.fromEntries(grades.map((g) => [g.grade_number, g.id]));

  // Seed Subjects
  const subjectsData = [
    { name: 'Mathematics', description: 'Core Mathematics' },
  ];

  const subjects = await knex('subjects').insert(subjectsData).returning('*');
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.name, s.id]));

  // Seed Chapters for Grade 8 Mathematics
  const grade8Id = gradeMap[8];
  const mathId = subjectMap['Mathematics'];

  const chaptersData = [
    {
      grade_id: grade8Id,
      subject_id: mathId,
      name: 'Geometry',
      order: 1,
      description: 'Geometric shapes and properties',
    },
  ];

  const chapters = await knex('chapters').insert(chaptersData).returning('*');
  const chapterMap = Object.fromEntries(chapters.map((c) => [c.name, c.id]));

  // Seed Topics for Grade 8 Geometry
  const geometryChapterId = chapterMap['Geometry'];

  const topicsData = [
    {
      chapter_id: geometryChapterId,
      name: 'Parallelogram',
      order: 1,
      description: 'Properties and problems related to parallelograms',
    },
  ];

  const topics = await knex('topics').insert(topicsData).returning('*');
  const topicMap = Object.fromEntries(topics.map((t) => [t.name, t.id]));

  // Seed Subtopics for Parallelogram
  const parallelogramTopicId = topicMap['Parallelogram'];

  const subtopicsData = [
    {
      topic_id: parallelogramTopicId,
      name: 'Angles',
      order: 1,
      description: 'Angle properties and calculations',
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Sides and Diagonals',
      order: 2,
      description: 'Side lengths and diagonal properties',
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Properties and Proofs',
      order: 3,
      description: 'Recognition criteria and proof methods',
    },
  ];

  const subtopics = await knex('subtopics').insert(subtopicsData).returning('*');
  const subtopicMap = Object.fromEntries(subtopics.map((st) => [st.name, st.id]));

  // Seed Problem Types for Parallelogram
  const problemTypesData = [
    {
      topic_id: parallelogramTopicId,
      name: 'Angle Calculation',
      description: 'Calculate angles using parallelogram properties',
      order: 1,
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Side Length Calculation',
      description: 'Calculate side lengths and perimeter',
      order: 2,
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Proof',
      description: 'Prove properties or relationships',
      order: 3,
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Recognition',
      description: 'Identify or verify parallelogram properties',
      order: 4,
    },
    {
      topic_id: parallelogramTopicId,
      name: 'Diagonal Properties',
      description: 'Problems involving diagonals',
      order: 5,
    },
  ];

  await knex('problem_types').insert(problemTypesData);

  console.log('✓ Curricula seeded: Grade 8 Mathematics - Parallelogram');
};
