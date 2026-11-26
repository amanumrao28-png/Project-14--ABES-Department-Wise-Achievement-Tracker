/**
 * Initial core schema migration:
 * - uuid-ossp PostgreSQL extension
 * - departments
 * - users
 * - refresh_tokens
 * - audit_logs
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('departments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('department_id')
      .notNullable()
      .references('id')
      .inTable('departments')
      .onDelete('RESTRICT');
    table.string('email', 255).notNullable().unique();
    table.string('employee_or_roll_no', 100).notNullable().unique();
    table.string('full_name', 255).notNullable();
    table.string('role', 20).notNullable();
    table.string('password_hash', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(
      "role IN ('super_admin', 'hod', 'faculty', 'student')",
      [],
      'users_role_check'
    );
    table.index(['department_id', 'role'], 'idx_users_department_role');
    table.index(['email'], 'idx_users_email');
  });

  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash', 255).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id', 'is_revoked'], 'idx_refresh_tokens_user_revoked');
    table.index(['token_hash'], 'idx_refresh_tokens_token_hash');
  });

  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('actor_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('actor_role', 20).nullable();
    table.uuid('actor_department_id').nullable();
    table.string('tracker_domain', 20).nullable();
    table.string('action', 100).notNullable();
    table.string('entity_type', 100).nullable();
    table.uuid('entity_id').nullable();
    table.uuid('target_department_id').nullable();
    table.jsonb('before_state').nullable();
    table.jsonb('after_state').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.string('request_id', 100).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['actor_user_id', 'created_at'], 'idx_audit_logs_actor_created');
    table.index(['entity_type', 'entity_id'], 'idx_audit_logs_entity');
    table.index(['tracker_domain', 'created_at'], 'idx_audit_logs_domain_created');
    table.index(['target_department_id', 'created_at'], 'idx_audit_logs_dept_created');
  });
}

/**
 * Reverts the core schema migration by dropping tables in reverse dependency order.
 *
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('departments');
}
