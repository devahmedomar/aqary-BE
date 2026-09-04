import { app } from './app';
import { env } from './config/env';
import { pool } from './config/db';

async function start() {
  try {
    // Verify DB connection at startup (fail fast)
    await pool.query('SELECT 1');
    console.log('Postgres connection OK');

    app.listen(env.PORT, () => {
      console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();