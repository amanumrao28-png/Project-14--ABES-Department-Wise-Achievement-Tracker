import dotenv from 'dotenv';

dotenv.config();

/**
 * Builds a Knex configuration object for a given runtime environment.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowSsl=false] - Whether to enable optional SSL via DB_SSL.
 * @returns {import('knex').Knex.Config} Knex environment configuration.
 */
function buildKnexConfig({ allowSsl = false } = {}) {
  const useSsl =
    allowSsl &&
    (process.env.DB_SSL === 'true' ||
      (process.env.DATABASE_URL &&
        (process.env.DATABASE_URL.includes('.render.com') ||
          process.env.DATABASE_URL.includes('sslmode=require'))));

  return {
    client: 'pg',
    connection: process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: Number.parseInt(process.env.DB_PORT || '5432', 10) || 5432,
          database: process.env.DB_NAME || 'abes_achievement_tracker',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD ?? '',
          ...(allowSsl && process.env.DB_SSL === 'true'
            ? { ssl: { rejectUnauthorized: false } }
            : {}),
        },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  };
}

const knexConfig = {
  development: buildKnexConfig({ allowSsl: false }),
  staging: buildKnexConfig({ allowSsl: true }),
  production: buildKnexConfig({ allowSsl: true }),
};

export default knexConfig;
