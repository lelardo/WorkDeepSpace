// src/core/db/db.ts
import type { DbApi, Row } from './types';

const LS_KEY = 'workspace_db_snapshot';

// ── localStorage helpers ───────────────────────────────
function lsSave(db: any): void {
  try {
    const tableNames: string[] = [];
    db.exec({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'`,
      rowMode: 'object',
      callback: (r: any) => tableNames.push(r.name),
    });
    const tables: Record<string, Row[]> = {};
    for (const name of tableNames) {
      const rows: Row[] = [];
      db.exec({ sql: `SELECT * FROM "${name}"`, rowMode: 'object', callback: (r: any) => rows.push(r) });
      tables[name] = rows;
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ tables, savedAt: Date.now() }));
  } catch (e) { console.warn('[db] save error', e); }
}

function lsRestore(db: any): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const { tables } = JSON.parse(raw) as { tables: Record<string, Row[]> };
    for (const [table, rows] of Object.entries(tables)) {
      if (!rows.length) continue;
      // Verifica que la tabla existe
      let exists = false;
      db.exec({ sql: `SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`, bind: [table], rowMode: 'object', callback: () => { exists = true; } });
      if (!exists) { console.warn(`[db] tabla ${table} no existe todavía`); continue; }
      for (const row of rows) {
        const cols = Object.keys(row);
        const vals = Object.values(row);
        db.exec({ sql: `INSERT OR IGNORE INTO "${table}" (${cols.map(c=>`"${c}"`).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`, bind: vals });
      }
    }
    console.info('[db] datos restaurados desde localStorage');
  } catch (e) { console.warn('[db] restore error', e); }
}

// ── Singleton ──────────────────────────────────────────
let _raw:         any     = null;   // instancia sqlite3 oo1.DB
let _initPromise: any     = null;
let _pauseSave            = false;  // ← pausa el snapshot durante migraciones

async function initDb(): Promise<any> {
  const mod = (await import('@sqlite.org/sqlite-wasm')).default;
  const sqlite3 = await mod({ print: () => {}, printErr: console.error });

  if (sqlite3.opfs) {
    const db = new sqlite3.oo1.OpfsDb('/workspace.sqlite3');
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    console.info('[db] OPFS activo');
    return db;
  }

  const db = new sqlite3.oo1.DB(':memory:', 'ct');
  db.exec('PRAGMA foreign_keys=ON;');
  console.info('[db] localStorage snapshot mode');
  return db;
}

async function getRaw(): Promise<any> {
  if (_raw) return _raw;
  if (!_initPromise) _initPromise = initDb();
  _raw = await _initPromise;
  _raw.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    module_id TEXT NOT NULL, version INTEGER NOT NULL,
    ran_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (module_id, version)
  );`);
  return _raw;
}

// ── API pública ────────────────────────────────────────
export async function getDb(): Promise<DbApi> {
  const db = await getRaw();
  return wrap(db);
}

/** Llama esto ANTES de correr migraciones para no contaminar el snapshot */
export function pauseSnapshot()  { _pauseSave = true;  }
/** Llama esto DESPUÉS de migraciones + restore para reactivar el guardado */
export function resumeSnapshot() { _pauseSave = false; }

/** Restaura datos desde localStorage (llamar tras migraciones) */
export async function restoreSnapshot() {
  const db = await getRaw();
  lsRestore(db);
}

function wrap(db: any): DbApi {
  return {
    run(sql: string, params: unknown[] = []): number {
      db.exec({ sql, bind: params });
      let id = 0;
      db.exec({ sql: 'SELECT last_insert_rowid() as id', rowMode: 'object', callback: (r: any) => { id = r.id; } });
      if (!_pauseSave) lsSave(db);
      return id;
    },
    all<T extends Row>(sql: string, params: unknown[] = []): T[] {
      const rows: T[] = [];
      db.exec({ sql, bind: params, rowMode: 'object', callback: (r: any) => rows.push(r as T) });
      return rows;
    },
    get<T extends Row>(sql: string, params: unknown[] = []): T | undefined {
      let result: T | undefined;
      db.exec({ sql, bind: params, rowMode: 'object', callback: (r: any) => { if (!result) result = r as T; } });
      return result;
    },
  };
}