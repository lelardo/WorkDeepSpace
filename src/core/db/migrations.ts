// src/core/db/migrations.ts
import type { Migration } from './types';
import { getDb } from './db';

function getDbMode(): 'local' | 'remote' {
  const mode = import.meta.env.VITE_DB_MODE || 'local';
  return mode as 'local' | 'remote';
}

export async function runMigrations(moduleId: string, migrations: Migration[]) {
  const db = await getDb();
  
  // In remote mode, use the API endpoint instead of executing locally
  if (getDbMode() === 'remote') {
    try {
      const res = await fetch('/api/migrations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, migrations }),
      });
      const data = await res.json();
      if (res.ok) {
        console.info(`[db] ${moduleId}: ran ${data.ran}/${data.total} migrations`);
      } else {
        console.error(`[db] migration failed for ${moduleId}:`, data.error);
      }
      return;
    } catch (e) {
      console.error(`[db] migration API error for ${moduleId}:`, e);
      return;
    }
  }

  // Local mode: execute migrations directly
  const ran = (await db.all<{ version: number }>(
    'SELECT version FROM _migrations WHERE module_id = $1 ORDER BY version', 
    [moduleId]
  )).map(r => r.version);

  const pending = migrations
    .filter(m => !ran.includes(m.version))
    .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    console.info(`[db] ${moduleId} v${m.version}`);
    
    // Split multi-statement SQL by semicolon and execute each separately
    // PGlite prepared statements can't handle multiple statements at once
    const statements = m.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const stmt of statements) {
      await db.run(stmt, []);
    }
    
    await db.run(
      'INSERT INTO _migrations (module_id, version) VALUES ($1, $2)', 
      [moduleId, m.version]
    );
  }
}

/**
 * Ejecuta todas las migraciones de módulos
 */
export async function initDb(allMigrations: { moduleId: string; migrations: Migration[] }[]) {
  for (const { moduleId, migrations } of allMigrations) {
    if (migrations.length) {
      await runMigrations(moduleId, migrations);
    }
  }

  console.info('[db] all migrations complete');
}