import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 10;

/**
 * Seeds initial departments and test users for each role in the CS department.
 * Safe to run multiple times using conflict-ignoring inserts.
 *
 * @param {import('knex').Knex} knex
 */
export async function seed(knex) {
  const departments = [
    {
      id: uuidv4(),
      code: 'CS',
      name: 'Computer Science & Engineering',
      is_active: true,
    },
    {
      id: uuidv4(),
      code: 'IT',
      name: 'Information Technology',
      is_active: true,
    },
    {
      id: uuidv4(),
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      is_active: true,
    },
    {
      id: uuidv4(),
      code: 'ME',
      name: 'Mechanical Engineering',
      is_active: true,
    },
  ];

  await knex('departments').insert(departments).onConflict('code').ignore();

  // Fetch the persisted CS department so user inserts remain idempotent across re-seeds.
  const csDepartment = await knex('departments').where({ code: 'CS' }).first();

  if (!csDepartment) {
    throw new Error('Failed to locate CS department after seeding.');
  }

  const users = [
    {
      id: uuidv4(),
      department_id: csDepartment.id,
      email: 'admin@abes.ac.in',
      employee_or_roll_no: 'ABES-ADMIN-001',
      full_name: 'System Super Admin',
      role: 'super_admin',
      password_hash: bcrypt.hashSync('Admin@123', BCRYPT_ROUNDS),
      is_active: true,
    },
    {
      id: uuidv4(),
      department_id: csDepartment.id,
      email: 'hod.cs@abes.ac.in',
      employee_or_roll_no: 'ABES-CS-HOD-001',
      full_name: 'Dr. CS Head of Department',
      role: 'hod',
      password_hash: bcrypt.hashSync('Hod@1234', BCRYPT_ROUNDS),
      is_active: true,
    },
    {
      id: uuidv4(),
      department_id: csDepartment.id,
      email: 'faculty.cs@abes.ac.in',
      employee_or_roll_no: 'ABES-CS-FAC-001',
      full_name: 'Prof. CS Faculty Member',
      role: 'faculty',
      password_hash: bcrypt.hashSync('Faculty@123', BCRYPT_ROUNDS),
      is_active: true,
    },
    {
      id: uuidv4(),
      department_id: csDepartment.id,
      email: 'student.cs@abes.ac.in',
      employee_or_roll_no: '2100320100001',
      full_name: 'Aarav Sharma',
      role: 'student',
      password_hash: bcrypt.hashSync('Student@123', BCRYPT_ROUNDS),
      is_active: true,
    },
  ];

  await knex('users').insert(users).onConflict('email').ignore();
}
