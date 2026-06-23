import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const MIGRATIONS_TABLE = '_migrations';
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const ADVISORY_LOCK_ID = 123456789;

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
  duration_ms: number;
  status: 'applied' | 'failed';
  error?: string;
}

interface MigrationModule {
  up: (pool: Pool) => Promise<void>;
  down: (pool: Pool) => Promise<void>;
}

interface MigFile {
  id: string;
  name: string;
  module: MigrationModule;
}

export class Migrator {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aethermint',
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'applied',
        error TEXT
      )
    `);
  }

  private async acquireLock(): Promise<boolean> {
    const result = await this.pool.query('SELECT pg_try_advisory_lock($1) as locked', [ADVISORY_LOCK_ID]);
    return result.rows[0].locked;
  }

  private async releaseLock(): Promise<void> {
    await this.pool.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]);
  }

  private loadMigrations(): MigFile[] {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files.map(file => {
      const mod = require(path.join(MIGRATIONS_DIR, file)) as MigrationModule;
      const id = path.basename(file, '.js');
      return { id, name: file, module: mod };
    });
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`
    );
    return result.rows;
  }

  async up(count?: number): Promise<void> {
    if (!await this.acquireLock()) {
      logger.error('Failed to acquire migration lock. Another migration may be in progress.');
      throw new Error('Migration lock could not be acquired');
    }

    try {
      await this.init();
      const allMigrations = this.loadMigrations();
      const applied = await this.getAppliedMigrations();
      const appliedIds = new Set(applied.filter(r => r.status === 'applied').map(r => r.id));

      const pending = allMigrations.filter(m => !appliedIds.has(m.id));
      const target = count ? pending.slice(0, count) : pending;

      if (target.length === 0) {
        logger.info('No pending migrations to run');
        return;
      }

      logger.info(`Running ${target.length} migration(s)...`);

      for (const migration of target) {
        const start = Date.now();
        try {
          await this.pool.query('BEGIN');
          await migration.module.up(this.pool);
          await this.pool.query('COMMIT');

          const duration = Date.now() - start;
          await this.pool.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (id, name, duration_ms, status) VALUES ($1, $2, $3, 'applied')`,
            [migration.id, migration.name, duration]
          );
          logger.info(`Applied migration: ${migration.name} (${duration}ms)`);
        } catch (err: any) {
          await this.pool.query('ROLLBACK');
          const duration = Date.now() - start;
          const errorMsg = err.message || String(err);

          try {
            await this.pool.query(
              `INSERT INTO ${MIGRATIONS_TABLE} (id, name, duration_ms, status, error) VALUES ($1, $2, $3, 'failed', $4)
               ON CONFLICT (id) DO UPDATE SET status = 'failed', error = $4`,
              [migration.id, migration.name, duration, errorMsg]
            );
          } catch (_) {}

          logger.error(`Migration failed: ${migration.name} - ${errorMsg}`);
          throw err;
        }
      }
    } finally {
      await this.releaseLock();
    }
  }

  async down(count: number = 1): Promise<void> {
    if (!await this.acquireLock()) {
      logger.error('Failed to acquire migration lock. Another migration may be in progress.');
      throw new Error('Migration lock could not be acquired');
    }

    try {
      await this.init();
      const allMigrations = this.loadMigrations();
      const applied = await this.getAppliedMigrations();
      const appliedList = applied
        .filter(r => r.status === 'applied')
        .sort((a, b) => b.id.localeCompare(a.id));

      if (appliedList.length === 0) {
        logger.info('No applied migrations to roll back');
        return;
      }

      const toRollback = appliedList.slice(0, count);

      for (const record of toRollback) {
        const migration = allMigrations.find(m => m.id === record.id);
        if (!migration) {
          logger.error(`Migration file not found: ${record.name}`);
          continue;
        }

        const start = Date.now();
        try {
          await this.pool.query('BEGIN');
          await migration.module.down(this.pool);
          await this.pool.query('COMMIT');

          const duration = Date.now() - start;
          await this.pool.query(
            `DELETE FROM ${MIGRATIONS_TABLE} WHERE id = $1`,
            [migration.id]
          );
          logger.info(`Rolled back migration: ${migration.name} (${duration}ms)`);
        } catch (err: any) {
          await this.pool.query('ROLLBACK');
          logger.error(`Rollback failed: ${migration.name} - ${err.message}`);
          throw err;
        }
      }
    } finally {
      await this.releaseLock();
    }
  }

  async status(): Promise<void> {
    await this.init();
    const allMigrations = this.loadMigrations();
    const records = await this.getAppliedMigrations();
    const appliedMap = new Map(records.map(r => [r.id, r]));

    console.log('\nMigration Status:');
    console.log('─'.repeat(90));
    console.log('  ID'.padEnd(8), 'Name'.padEnd(35), 'Status'.padEnd(14), 'Duration'.padEnd(10), 'Executed At');
    console.log('─'.repeat(90));

    for (const m of allMigrations) {
      const record = appliedMap.get(m.id);
      const status = record ? record.status : 'pending';
      const duration = record ? `${record.duration_ms}ms` : '-';
      const executedAt = record ? new Date(record.executed_at).toISOString().replace('T', ' ').substring(0, 19) : '-';
      const statusStr = status === 'applied' ? 'APPLIED' : status === 'failed' ? 'FAILED' : 'PENDING';
      console.log(
        `  ${m.id.padEnd(6)} ${m.name.padEnd(33)} ${statusStr.padEnd(14)} ${duration.padEnd(10)} ${executedAt}`
      );
    }

    console.log('─'.repeat(90));
    const pending = allMigrations.filter(m => {
      const r = appliedMap.get(m.id);
      return !r || r.status !== 'applied';
    });
    const failed = allMigrations.filter(m => {
      const r = appliedMap.get(m.id);
      return r && r.status === 'failed';
    });
    console.log(`\nSummary: ${allMigrations.length} total, ${allMigrations.length - pending.length} applied, ${pending.length} pending, ${failed.length} failed\n`);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

async function main() {
  const command = process.argv[2];
  const count = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

  const migrator = new Migrator();

  try {
    switch (command) {
      case 'up':
        await migrator.up(count);
        break;
      case 'down':
        await migrator.down(count || 1);
        break;
      case 'status':
        await migrator.status();
        break;
      default:
        console.log('Usage: ts-node src/utils/migrate.ts <up|down|status> [count]');
        console.log('');
        console.log('Commands:');
        console.log('  up              Run all pending migrations');
        console.log('  up <N>          Run next N pending migrations');
        console.log('  down            Roll back the last migration');
        console.log('  down <N>        Roll back the last N migrations');
        console.log('  status          Show migration status');
        process.exit(1);
    }
  } catch (err: any) {
    logger.error(`Migration command failed: ${err.message}`);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

if (require.main === module) {
  main();
}

export default Migrator;
