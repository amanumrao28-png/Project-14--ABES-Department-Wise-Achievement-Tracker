import knex from 'knex';
import env from './env.js';

/**
 * Shared PostgreSQL Knex instance configured with connection pooling.
 */
export const db = knex({
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ...(env.NODE_ENV === 'production' && process.env.DB_SSL === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  acquireConnectionTimeout: 10000,
});

export default db;
