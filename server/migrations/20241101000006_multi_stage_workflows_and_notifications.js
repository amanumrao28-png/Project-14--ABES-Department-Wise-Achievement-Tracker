/**
 * Multi-stage independent workflow upgrades & user notifications:
 * - Updates workflow_status check constraints on dept_achievements, faculty_achievements, student_achievements
 *   to support: draft, submitted, under_review, changes_requested, department_approved, college_approved, rejected, archived
 * - Adds reviewer_id, reviewed_at, department_approved_by_user_id, department_approved_at columns per tracker
 * - Adds actor_role to *_approval_logs
 * - Adds users.can_coordinate_student_approvals and departments.student_requires_college_approval
 * - Creates notifications table for status change alerts
 *
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('can_coordinate_student_approvals').notNullable().defaultTo(false);
  });

  await knex.schema.alterTable('departments', (table) => {
    table.boolean('student_requires_college_approval').notNullable().defaultTo(false);
  });

  const trackerConfigs = [
    {
      table: 'dept_achievements',
      constraint: 'dept_achievements_status_check',
      logsTable: 'dept_approval_logs'
    },
    {
      table: 'faculty_achievements',
      constraint: 'faculty_achievements_status_check',
      logsTable: 'faculty_approval_logs'
    },
    {
      table: 'student_achievements',
      constraint: 'student_achievements_status_check',
      logsTable: 'student_approval_logs'
    }
  ];

  for (const cfg of trackerConfigs) {
    await knex.raw(`ALTER TABLE ${cfg.table} DROP CONSTRAINT IF EXISTS ${cfg.constraint}`);
    await knex.raw(
      `UPDATE ${cfg.table} SET workflow_status = 'college_approved' WHERE workflow_status = 'approved'`
    );
    await knex.raw(
      `ALTER TABLE ${cfg.table} ADD CONSTRAINT ${cfg.constraint} CHECK (workflow_status IN ('draft', 'submitted', 'under_review', 'changes_requested', 'department_approved', 'college_approved', 'rejected', 'archived'))`
    );

    await knex.schema.alterTable(cfg.table, (table) => {
      table
        .uuid('reviewer_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('reviewed_at', { useTz: true }).nullable();
      table
        .uuid('department_approved_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('department_approved_at', { useTz: true }).nullable();
    });

    await knex.schema.alterTable(cfg.logsTable, (table) => {
      table.string('actor_role', 30).nullable();
    });
  }

  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('recipient_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('tracker_domain', 20).notNullable();
    table.uuid('achievement_id').notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.string('status', 40).notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['recipient_user_id', 'is_read', 'created_at'], 'idx_notifications_recipient');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');

  const trackerConfigs = [
    {
      table: 'dept_achievements',
      constraint: 'dept_achievements_status_check',
      logsTable: 'dept_approval_logs'
    },
    {
      table: 'faculty_achievements',
      constraint: 'faculty_achievements_status_check',
      logsTable: 'faculty_approval_logs'
    },
    {
      table: 'student_achievements',
      constraint: 'student_achievements_status_check',
      logsTable: 'student_approval_logs'
    }
  ];

  for (const cfg of trackerConfigs) {
    await knex.schema.alterTable(cfg.logsTable, (table) => {
      table.dropColumn('actor_role');
    });

    await knex.schema.alterTable(cfg.table, (table) => {
      table.dropColumn('department_approved_at');
      table.dropColumn('department_approved_by_user_id');
      table.dropColumn('reviewed_at');
      table.dropColumn('reviewer_id');
    });

    await knex.raw(`ALTER TABLE ${cfg.table} DROP CONSTRAINT IF EXISTS ${cfg.constraint}`);
    await knex.raw(
      `UPDATE ${cfg.table} SET workflow_status = 'approved' WHERE workflow_status IN ('department_approved', 'college_approved')`
    );
    await knex.raw(
      `UPDATE ${cfg.table} SET workflow_status = 'submitted' WHERE workflow_status = 'under_review'`
    );
    await knex.raw(
      `ALTER TABLE ${cfg.table} ADD CONSTRAINT ${cfg.constraint} CHECK (workflow_status IN ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'archived'))`
    );
  }

  await knex.schema.alterTable('departments', (table) => {
    table.dropColumn('student_requires_college_approval');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('can_coordinate_student_approvals');
  });
}
