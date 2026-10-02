exports.up = function (knex) {
  return knex.schema
    // Grades
    .createTable('grades', (table) => {
      table.increments('id').primary();
      table.integer('grade_number').notNullable().unique();
      table.string('name', 100).notNullable();
      table.text('description').nullable();
      table.timestamps(true, true);
    })

    // Subjects
    .createTable('subjects', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.text('description').nullable();
      table.timestamps(true, true);
    })

    // Chapters
    .createTable('chapters', (table) => {
      table.increments('id').primary();
      table.integer('grade_id').notNullable().references('id').inTable('grades');
      table.integer('subject_id').notNullable().references('id').inTable('subjects');
      table.string('name', 200).notNullable();
      table.integer('order').notNullable();
      table.text('description').nullable();
      table.timestamps(true, true);
      table.unique(['grade_id', 'subject_id', 'name']);
    })

    // Topics
    .createTable('topics', (table) => {
      table.increments('id').primary();
      table.integer('chapter_id').notNullable().references('id').inTable('chapters');
      table.string('name', 200).notNullable();
      table.integer('order').notNullable();
      table.text('description').nullable();
      table.timestamps(true, true);
      table.unique(['chapter_id', 'name']);
    })

    // Subtopics
    .createTable('subtopics', (table) => {
      table.increments('id').primary();
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.string('name', 200).notNullable();
      table.integer('order').notNullable();
      table.text('description').nullable();
      table.timestamps(true, true);
      table.unique(['topic_id', 'name']);
    })

    // Problem Types
    .createTable('problem_types', (table) => {
      table.increments('id').primary();
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.string('name', 200).notNullable();
      table.text('description').nullable();
      table.integer('order').notNullable();
      table.timestamps(true, true);
      table.unique(['topic_id', 'name']);
    })

    // Problems - Core table
    .createTable('problems', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('grade_id').notNullable().references('id').inTable('grades');
      table.integer('subject_id').notNullable().references('id').inTable('subjects');
      table.integer('chapter_id').notNullable().references('id').inTable('chapters');
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.integer('subtopic_id').nullable().references('id').inTable('subtopics');

      // Core problem content
      table.text('title').nullable();
      table.text('original_text').notNullable();
      table.text('normalized_text').notNullable();
      table.string('text_hash', 64).notNullable().unique(); // SHA-256

      // Classification
      table.json('problem_types_json').notNullable(); // Array of problem_type IDs
      table.enum('difficulty', ['Basic', 'Intermediate', 'Advanced', 'Very Advanced']).notNullable().defaultTo('Intermediate');

      // Confidence scores (0.0 to 1.0)
      table.decimal('confidence_grade', 3, 2).notNullable().defaultTo(0.5);
      table.decimal('confidence_topic', 3, 2).notNullable().defaultTo(0.5);
      table.decimal('confidence_type', 3, 2).notNullable().defaultTo(0.5);
      table.decimal('confidence_difficulty', 3, 2).notNullable().defaultTo(0.5);

      // Status lifecycle
      table.enum('status', [
        'DISCOVERED',
        'EXTRACTED',
        'CLASSIFIED',
        'VALIDATED',
        'APPROVED',
        'REVIEW_REQUIRED',
        'REJECTED',
        'DUPLICATE',
      ]).notNullable().defaultTo('DISCOVERED');

      // Source traceability (always has at least one source)
      table.timestamp('discovered_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('extracted_at').nullable();
      table.timestamp('classified_at').nullable();

      // Metadata
      table.text('notes').nullable();
      table.timestamps(true, true);

      // Indexes
      table.index(['grade_id', 'topic_id']);
      table.index(['status']);
      table.index(['difficulty']);
      table.index(['created_at']);
      table.index('text_hash');
    })

    // Problem Sources - Many-to-many: one problem can have multiple sources
    .createTable('problem_sources', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('problem_id').notNullable().references('id').inTable('problems').onDelete('CASCADE');
      table.string('source_url', 2048).notNullable();
      table.string('source_domain', 255).notNullable();
      table.string('source_name', 255).nullable();
      table.date('published_date').nullable();
      table.timestamp('discovered_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('extracted_at').nullable();
      table.boolean('is_canonical').defaultTo(false); // Primary source for this problem
      table.text('source_content').nullable(); // Full page/document content if needed

      // Deduplication reference
      table.uuid('canonical_problem_id').nullable().references('id').inTable('problems');

      table.timestamps(true, true);
      table.unique(['problem_id', 'source_url']);
      table.index(['source_domain']);
      table.index(['discovered_at']);
    })

    // Duplicate Groups - Track which problems are duplicates
    .createTable('duplicate_groups', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('canonical_problem_id').notNullable().references('id').inTable('problems');
      table.json('duplicate_problem_ids').notNullable(); // Array of UUIDs
      table.enum('dedup_layer', ['EXACT', 'NORMALIZED', 'NEAR', 'SEMANTIC']).notNullable();
      table.decimal('similarity_score', 3, 2).nullable(); // For near/semantic matches
      table.enum('status', ['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED']).notNullable().defaultTo('PENDING');
      table.text('review_notes').nullable();
      table.timestamp('reviewed_at').nullable();
      table.timestamps(true, true);
      table.index(['canonical_problem_id']);
      table.index(['status']);
    })

    // Theories
    .createTable('theories', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.integer('problem_type_id').nullable().references('id').inTable('problem_types');
      table.string('title', 255).notNullable();
      table.text('statement').notNullable();
      table.text('explanation').nullable();
      table.json('related_topics_json').nullable(); // Array of topic IDs
      table.enum('status', ['DRAFT', 'VALIDATED', 'APPROVED']).notNullable().defaultTo('DRAFT');
      table.timestamps(true, true);
      table.unique(['topic_id', 'problem_type_id', 'title']);
    })

    // Theory Sources
    .createTable('theory_sources', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('theory_id').notNullable().references('id').inTable('theories').onDelete('CASCADE');
      table.string('source_url', 2048).notNullable();
      table.string('source_name', 255).nullable();
      table.timestamp('discovered_at').notNullable().defaultTo(knex.fn.now());
      table.timestamps(true, true);
      table.unique(['theory_id', 'source_url']);
    })

    // Formulas
    .createTable('formulas', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.integer('problem_type_id').nullable().references('id').inTable('problem_types');
      table.string('name', 255).notNullable();
      table.text('formula_text').notNullable(); // LaTeX or plain text
      table.text('definition').nullable();
      table.text('conditions').nullable(); // When/how to use
      table.text('usage').nullable();
      table.json('variables_json').nullable(); // Array of {name, definition}
      table.enum('status', ['DRAFT', 'VALIDATED', 'APPROVED']).notNullable().defaultTo('DRAFT');
      table.timestamps(true, true);
      table.unique(['topic_id', 'problem_type_id', 'name']);
    })

    // Formula Sources
    .createTable('formula_sources', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('formula_id').notNullable().references('id').inTable('formulas').onDelete('CASCADE');
      table.string('source_url', 2048).notNullable();
      table.string('source_name', 255).nullable();
      table.timestamp('discovered_at').notNullable().defaultTo(knex.fn.now());
      table.timestamps(true, true);
      table.unique(['formula_id', 'source_url']);
    })

    // Crawl Jobs - Track search and crawl operations
    .createTable('crawl_jobs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('grade_id').notNullable().references('id').inTable('grades');
      table.integer('topic_id').notNullable().references('id').inTable('topics');
      table.enum('status', ['QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']).notNullable().defaultTo('QUEUED');
      table.timestamp('started_at').nullable();
      table.timestamp('paused_at').nullable();
      table.timestamp('completed_at').nullable();
      table.integer('queries_total').defaultTo(0);
      table.integer('queries_completed').defaultTo(0);
      table.integer('urls_discovered').defaultTo(0);
      table.integer('pages_crawled').defaultTo(0);
      table.integer('problems_found').defaultTo(0);
      table.integer('problems_valid').defaultTo(0);
      table.integer('duplicates_detected').defaultTo(0);
      table.text('error_message').nullable();
      table.timestamps(true, true);
      table.index(['status']);
      table.index(['grade_id', 'topic_id']);
    })

    // Review Queue - Low confidence items for human review
    .createTable('review_queue', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('problem_id').notNullable().references('id').inTable('problems');
      table.enum('review_type', ['LOW_CONFIDENCE', 'DUPLICATE', 'QUALITY', 'CLASSIFICATION']).notNullable();
      table.text('reason').nullable();
      table.json('suggested_values_json').nullable(); // Alternative classification values
      table.enum('status', ['PENDING', 'APPROVED', 'REJECTED', 'MODIFIED']).notNullable().defaultTo('PENDING');
      table.timestamp('reviewed_at').nullable();
      table.text('review_notes').nullable();
      table.timestamps(true, true);
      table.index(['status']);
      table.index(['review_type']);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('review_queue')
    .dropTableIfExists('crawl_jobs')
    .dropTableIfExists('formula_sources')
    .dropTableIfExists('formulas')
    .dropTableIfExists('theory_sources')
    .dropTableIfExists('theories')
    .dropTableIfExists('duplicate_groups')
    .dropTableIfExists('problem_sources')
    .dropTableIfExists('problems')
    .dropTableIfExists('problem_types')
    .dropTableIfExists('subtopics')
    .dropTableIfExists('topics')
    .dropTableIfExists('chapters')
    .dropTableIfExists('subjects')
    .dropTableIfExists('grades');
};
