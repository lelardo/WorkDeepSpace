// src/core/db/migrations.ts
import type { Migration } from './types';
import { getDb, pauseSnapshot, resumeSnapshot, restoreSnapshot } from './db';

export async function runMigrations(moduleId: string, migrations: Migration[]) {
  const db = await getDb();
  const ran = db.all<{ version: number }>(
    'SELECT version FROM _migrations WHERE module_id = ? ORDER BY version', [moduleId]
  ).map(r => r.version);

  const pending = migrations
    .filter(m => !ran.includes(m.version))
    .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    console.info(`[db] ${moduleId} v${m.version}`);
    db.run(m.sql);
    db.run('INSERT INTO _migrations (module_id, version) VALUES (?, ?)', [moduleId, m.version]);
  }
}

/**
 * Llama esto UNA VEZ después de TODAS las migraciones.
 * Pausa el snapshot durante las migraciones para evitar
 * que un snapshot vacío sobreescriba datos previos.
 */
export async function initDb(allMigrations: { moduleId: string; migrations: Migration[] }[]) {
  pauseSnapshot();  // ← congela el guardado

  for (const { moduleId, migrations } of allMigrations) {
    if (migrations.length) await runMigrations(moduleId, migrations);
  }

  await restoreSnapshot(); // ← restaura datos en tablas ya creadas

  resumeSnapshot(); // ← activa guardado normal
  console.info('[db] ready');
}