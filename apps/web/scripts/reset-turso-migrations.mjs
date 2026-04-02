#!/usr/bin/env node
/**
 * Wipes the Turso/libSQL database (all app tables + views) and reapplies
 * every SQL file matching migrations/NNNN_*.sql in sort order.
 * Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from this package's .dev.vars.
 */
import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(WORKER_ROOT, 'migrations');
const DEV_VARS = join(WORKER_ROOT, '.dev.vars');

function loadDevVars(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function hasExecutableSql(s) {
  const noBlock = s.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.replace(/--[^\n]*/g, '');
  const t = noLine.replace(/\s+/g, ' ').trim();
  return t.length > 0 && t !== ';';
}

/**
 * Drizzle migrations use `--> statement-breakpoint`; hand-written files use semicolons.
 */
function statementsFromMigrationFile(content) {
  const trimmed = content
    .trim()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (!trimmed) return [];

  if (trimmed.includes('--> statement-breakpoint')) {
    return trimmed
      .split(/--> statement-breakpoint\s*\n?/g)
      .map((s) => s.trim())
      .filter(hasExecutableSql)
      .map((s) => (s.endsWith(';') ? s : `${s};`));
  }

  const withoutFullLineComments = trimmed
    .split('\n')
    .filter((line) => !/^\s*--\s/.test(line) && !/^\s*--$/.test(line))
    .join('\n');

  return withoutFullLineComments
    .split(';')
    .map((s) => s.trim())
    .filter(hasExecutableSql)
    .map((s) => (s.endsWith(';') ? s : `${s};`));
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function dropAllSchemaObjects(db) {
  await db.execute('PRAGMA foreign_keys = OFF');

  const views = await db.execute(
    `SELECT name FROM sqlite_master
     WHERE type = 'view'
       AND name NOT LIKE 'sqlite_%'`,
  );
  for (const row of views.rows) {
    const n = row.name ?? row[0];
    if (n) await db.execute(`DROP VIEW IF EXISTS ${quoteIdent(n)}`);
  }

  let pass = 0;
  const maxPasses = 20;
  while (pass < maxPasses) {
    const tables = await db.execute(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT LIKE 'libsql_%'`,
    );
    const names = tables.rows
      .map((row) => row.name ?? row[0])
      .filter(Boolean);
    if (names.length === 0) break;
    for (const name of names) {
      await db.execute(`DROP TABLE IF EXISTS ${quoteIdent(name)}`);
    }
    pass += 1;
  }
  if (pass >= maxPasses) {
    throw new Error('drop tables: too many passes (possible catalog loop)');
  }

  await db.execute('PRAGMA foreign_keys = ON');
}

async function main() {
  let env;
  try {
    env = loadDevVars(DEV_VARS);
  } catch {
    console.error(`reset-turso-migrations: missing or unreadable ${DEV_VARS}`);
    process.exit(1);
  }

  const url = env.TURSO_DATABASE_URL;
  const authToken = env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error(
      'reset-turso-migrations: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in apps/worker/.dev.vars',
    );
    process.exit(1);
  }

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.error(`reset-turso-migrations: no NNNN_*.sql files in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const db = createClient({ url, authToken });

  console.log('reset-turso-migrations: dropping existing schema...');
  await dropAllSchemaObjects(db);

  for (const file of files) {
    const path = join(MIGRATIONS_DIR, file);
    const sqlText = readFileSync(path, 'utf8');
    const stmts = statementsFromMigrationFile(sqlText);
    console.log(`reset-turso-migrations: applying ${file} (${stmts.length} statement(s))`);
    let i = 0;
    for (const sql of stmts) {
      i += 1;
      try {
        await db.execute(sql);
      } catch (e) {
        console.error(`reset-turso-migrations: failed in ${file} statement ${i}/${stmts.length}`);
        console.error(e);
        process.exit(1);
      }
    }
  }

  console.log('reset-turso-migrations: done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
