// src/core/db/db.ts
// Modo híbrido: PGlite local (desarrollo) o Backend API remoto (producción)

import { PGlite } from '@electric-sql/pglite';
import type { DbApi, Row } from './types';

let _db: any = null;
let _initPromise: Promise<any> | null = null;

// ── Detectar modo ──────────────────────────────────────
function getDbMode(): 'local' | 'remote' {
  const mode = import.meta.env.VITE_DB_MODE || 'local';
  return mode as 'local' | 'remote';
}

function getApiUrl(): string {
  // En dev, Vite proxy redirige /api/* a http://localhost:3001/api/*
  // En prod, el frontend y backend están en el mismo host
  return '/api';
}

// ── PGlite Local (Desarrollo) ──────────────────────────
async function initPGliteLocal(): Promise<PGlite> {
  const db = new PGlite('idb://modular-workspace');

  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      module_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (module_id, version)
    );
  `);

  console.info('[db] ✓ PGlite ready (PostgreSQL WASM, local mode)');
  return db;
}

// ── Backend API Remote (Producción) ──────────────────
function initBackendRemote() {
  // Devuelve un objeto que actúa como el backend
  return { type: 'backend' };
}

// ── Inicializar BD ─────────────────────────────────────
async function initDb(): Promise<any> {
  const config = getDbMode();
  
  if (config === 'local') {
    return initPGliteLocal();
  } else {
    return initBackendRemote();
  }
}

async function getRaw(): Promise<any> {
  if (_db) return _db;
  if (!_initPromise) _initPromise = initDb();
  _db = await _initPromise;
  return _db;
}

// ── API pública ────────────────────────────────────────
export async function getDb(): Promise<DbApi> {
  const db = await getRaw();
  const mode = getDbMode();
  return wrap(db, mode);
}

function wrap(db: any, mode: 'local' | 'remote'): DbApi {
  if (mode === 'local') {
    return wrapPGlite(db);
  } else {
    return wrapBackend();
  }
}

// ── Wrapper PGlite ─────────────────────────────────────
function wrapPGlite(pgDb: PGlite): DbApi {
  return {
    async run(sql: string, params: unknown[] = []): Promise<number> {
      try {
        await pgDb.query(sql, params);
        console.debug('[db:pglite:run]', sql.slice(0, 50), params);
        return 0;
      } catch (e) {
        console.error('[db:pglite:run] error:', e, sql, params);
        throw e;
      }
    },

    async all<T extends Row>(sql: string, params: unknown[] = []): Promise<T[]> {
      try {
        const result = await pgDb.query<T>(sql, params);
        return result?.rows ?? [];
      } catch (e) {
        console.error('[db:pglite:all] error:', e, sql, params);
        return [];
      }
    },

    async get<T extends Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      try {
        const result = await pgDb.query<T>(sql, params);
        return result?.rows?.[0];
      } catch (e) {
        console.error('[db:pglite:get] error:', e, sql, params);
        return undefined;
      }
    },
  };
}

// ── Wrapper Backend API ────────────────────────────────
function wrapBackend(): DbApi {
  const apiUrl = getApiUrl();

  return {
    async run(sql: string, params: unknown[] = []): Promise<number> {
      try {
        const res = await fetch(`${apiUrl}/db/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        console.debug('[db:backend:run]', sql.slice(0, 50), params);
        return data.rowCount || 0;
      } catch (e) {
        console.error('[db:backend:run] error:', e, sql, params);
        throw e;
      }
    },

    async all<T extends Row>(sql: string, params: unknown[] = []): Promise<T[]> {
      try {
        const res = await fetch(`${apiUrl}/db/all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.error('[db:backend:all] error:', e, sql, params);
        return [];
      }
    },

    async get<T extends Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      try {
        const res = await fetch(`${apiUrl}/db/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql, params }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data || undefined;
      } catch (e) {
        console.error('[db:backend:get] error:', e, sql, params);
        return undefined;
      }
    },
  };
}