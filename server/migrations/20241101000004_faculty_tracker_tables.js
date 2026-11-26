/**
 * Independent Faculty Achievement Tracker schema:
 * - faculty_categories
 * - faculty_scoring_rules
 * - faculty_achievements
 * - faculty_approval_logs
 * - faculty_evidence_documents
 *
 * Strictly isolated from Department and Student achievement tables.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('faculty_categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('code', 60).notNullable().unique();
    table.string('name', 150).notNullable();
    table.text('description').nullable();
    table.jsonb('field_schema').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('faculty_scoring_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('faculty_categories')
      .onDelete('CASCADE');
    table.string('academic_year', 20).notNullable().defaultTo('*');
    table.string('achievement_level', 40).notNullable();
    table.decimal('base_points', 10, 2).notNullable();
    table.jsonb('multiplier_config').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.integer('rule_version').notNullable().defaultTo(1);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['category_id', 'achievement_level', 'is_active'], 'idx_faculty_scoring_lookup');
  });

  await knex.schema.createTable('faculty_achievements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('department_id')
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('RESTRICT');
    table
      .uuid('owner_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table
      .uuid('category_id')
      .notNullable()
      .references('id')
      .inTable('faculty_categories')
      .onDelete('RESTRICT');
    table
      .uuid('approved_by_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.date('achieved_on').notNullable();
    table.string('achievement_level', 40).notNullable();
    table.string('organization', 255).notNullable();
    table.string('academic_year', 20).notNullable();
    table.jsonb('details_json').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.jsonb('collaborators_json').notNullable().defaultTo(knex.raw("'[]'::jsonb"));

    table.string('workflow_status', 30).notNullable().defaultTo('draft');
    table.decimal('computed_score', 10, 2).nullable();
    table.integer('scoring_rule_version').nullable();
    table.text('review_remarks').nullable();

    table.timestamp('submitted_at', { useTz: true }).nullable();
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(
      "workflow_status IN ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'archived')",
      [],
      'faculty_achievements_status_check'
    );
    table.check(
      "achievement_level IN ('international', 'national', 'state', 'university', 'institutional')",
      [],
      'faculty_achievements_level_check'
    );
    table.index(
      ['department_id', 'academic_year', 'workflow_status', 'category_id'],
      'idx_faculty_achievements_scope'
    );
    table.index(['owner_user_id', 'academic_year'], 'idx_faculty_achievements_owner');
  });

  await knex.schema.createTable('faculty_approval_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('faculty_achievements')
      .onDelete('CASCADE');
    table
      .uuid('actor_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('from_status', 30).nullable();
    table.string('to_status', 30).notNullable();
    table.text('remarks').nullable();
    table.timestamp('acted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['achievement_id', 'acted_at'], 'idx_faculty_approval_logs_ach');
  });

  await knex.schema.createTable('faculty_evidence_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('achievement_id')
      .notNullable()
      .references('id')
      .inTable('faculty_achievements')
      .onDelete('CASCADE');
    table
      .uuid('department_id')
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('RESTRICT');
    table
      .uuid('uploaded_by_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('original_filename', 255).notNullable();
    table.string('mime_type', 120).notNullable();
    table.bigInteger('file_size_bytes').notNullable();
    table.string('sha256_hash', 64).notNullable();
    table.string('storage_object_key', 500).notNullable();
    table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['achievement_id'], 'idx_faculty_evidence_ach');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('faculty_evidence_documents');
  await knex.schema.dropTableIfExists('faculty_approval_logs');
  await knex.schema.dropTableIfExists('faculty_achievements');
  await knex.schema.dropTableIfExists('faculty_scoring_rules');
  await knex.schema.dropTableIfExists('faculty_categories');
}
