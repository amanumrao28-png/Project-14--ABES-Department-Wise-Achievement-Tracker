/**
 * Adds privacy control flag for shareable Faculty/Student Achievement Passports.
 * Defaults to false (private) so user profiles are never exposed without explicit opt-in.
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_portfolio_public').notNullable().defaultTo(false);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_portfolio_public');
  });
}
