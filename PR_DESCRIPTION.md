# feat(backend): migration framework with rollback support

Implements a complete migration framework for the AetherMint backend with up/down migration support, transaction wrapping, locking, and status tracking.

## Changes

### New file: `backend/src/utils/migrate.ts`
Migration runner class (`Migrator`) providing:
- `up([count])` — runs pending migrations (optionally limited to N) inside individual transactions
- `down([count])` — rolls back applied migrations in reverse order
- `status()` — prints a table of all migrations with their applied/pending/failed state
- Advisory lock (`pg_try_advisory_lock`) prevents concurrent migration execution
- A `_migrations` table tracks history: id, name, executed_at, duration_ms, status, error
- Failed migrations are recorded with status `'failed'` and do not block subsequent migrations

### Modified: `backend/migrations/001_add_content_versions.js`
- Rewrote from knex API to raw PostgreSQL queries via `pg.Pool`, consistent with the rest of the project
- Preserved all existing functionality including the `helpers` object for `createInitialVersions`, `migrateExistingContent`, and `validateMigration`
- Added `IF NOT EXISTS` / `IF NOT EXISTS` guards for idempotency

### Modified: `backend/migrations/002_add_user_roles.js`
- Already uses `pg.Pool` with proper `up`/`down` exports — no changes needed

### Modified: `backend/package.json`
Added scripts:
- `npm run migrate:up` — runs all pending migrations
- `npm run migrate:down` — rolls back the last migration
- `npm run migrate:status` — shows migration status table

Both `migrate:up` and `migrate:down` accept an optional count argument (e.g. `npm run migrate:down 2`).

### Modified: `backend/src/index.ts`
Auto-runs pending migrations on startup when `AUTO_MIGRATE=true` is set in the environment (disabled by default).

## Migration Interface
Each migration file under `backend/migrations/` must export:
```js
exports.up = async function(pool) { /* apply */ };
exports.down = async function(pool) { /* revert */ };
```
where `pool` is a `pg.Pool` instance.

## Verification
```bash
cd backend
npm run migrate:status          # shows pending migrations
npm run migrate:up              # apply all
npm run migrate:status          # confirm all applied
npm run migrate:down            # roll back last
npm run migrate:down 2          # roll back last 2
AUTO_MIGRATE=true npm run dev   # auto-runs on start
```

---

closes #131
