// src/core/auth/migrations.ts
// Migraciones del sistema de usuarios — se corren antes que los módulos

import type { Migration } from '../db/types';

export const AUTH_MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        username     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT    NOT NULL,
        password_hash TEXT   NOT NULL,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];