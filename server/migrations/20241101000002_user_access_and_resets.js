/**
 * Additive schema migration for:
 * - Delegated HOD department user management permission (`users.can_manage_dept_users`)
 * - Self-service and admin-issued password reset tokens (`password_reset_tokens`)
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('can_manage_dept_users').notNullable().defaultTo(false);
  });

  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('token_hash', 255).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('used_at', { useTz: true }).nullable();
    table
      .uuid('created_by_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['token_hash'], 'idx_password_reset_tokens_hash');
    table.index(['user_id', 'used_at'], 'idx_password_reset_tokens_user_used');
  });
}

/**
 * Reverts user access delegation and password reset schema additions.
 *
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('can_manage_dept_users');
  });
}
