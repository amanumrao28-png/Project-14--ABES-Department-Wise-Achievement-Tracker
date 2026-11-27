import app from './app.js';
import env from './config/env.js';
import db from './config/database.js';

let server;
let isShuttingDown = false;

/**
 * Gracefully stops the HTTP server and closes the PostgreSQL connection pool.
 *
 * @param {string} signal - Termination signal or failure reason.
 * @param {number} [exitCode=0] - Process exit code after cleanup.
 */
async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`[server] Received ${signal}. Initiating graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    if (server && server.listening) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('[server] HTTP server closed.');
    }

    await db.destroy();
    console.log('[server] Database connection pool closed.');

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  } catch (error) {
    console.error('[server] Error during graceful shutdown:', error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

/**
 * Verifies database connectivity and starts the HTTP server.
 */
async function startServer() {
  try {
    await db.raw('SELECT 1');
    console.log('[server] PostgreSQL connection verified.');

    server = app.listen(env.PORT, () => {
      console.log(
        `[server] ABES Achievement Tracker API running on port ${env.PORT} (${env.NODE_ENV})`
      );
    });

    server.on('error', (error) => {
      console.error('[server] HTTP server error:', error);
      shutdown('SERVER_ERROR', 1);
    });
  } catch (error) {
    console.error('[server] Startup failed — unable to connect to PostgreSQL:', error);
    await db.destroy().catch(() => {});
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Promise Rejection:', reason);
  shutdown('UNHANDLED_REJECTION', 1);
});

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION', 1);
});

startServer();
