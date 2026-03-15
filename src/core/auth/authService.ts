// src/core/auth/authService.ts
//
// Lógica de negocio: registro, login, restaurar sesión.
// Usa una función hash muy simple (no usar en producción real —
// para un workspace local es suficiente).

import type { DbApi } from '../db/types';
import type { User } from './types';
import { sessionActions } from './authStore';

// Hash simple con Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const data   = new TextEncoder().encode(password);
  const buf    = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function generateToken(): string {
  return crypto.randomUUID();
}

export type AuthResult =
  | { ok: true;  user: User }
  | { ok: false; error: string };

// ── Registro ───────────────────────────────────────────
export async function register(
  db: DbApi,
  username: string,
  displayName: string,
  password: string
): Promise<AuthResult> {
  username = username.trim();
  displayName = displayName.trim();

  if (!username || !displayName || !password)
    return { ok: false, error: 'Todos los campos son requeridos.' };
  if (username.length < 3)
    return { ok: false, error: 'El usuario debe tener al menos 3 caracteres.' };
  if (password.length < 4)
    return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };

  const exists = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return { ok: false, error: 'Ese nombre de usuario ya está en uso.' };

  const hash = await hashPassword(password);
  const id   = db.run(
    'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
    [username, displayName, hash]
  );

  const user: User = {
    id, username, display_name: displayName,
    created_at: new Date().toISOString(),
  };
  const token = generateToken();
  db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, id]);
  sessionActions.login(user, token);
  return { ok: true, user };
}

// ── Login ──────────────────────────────────────────────
export async function login(
  db: DbApi,
  username: string,
  password: string
): Promise<AuthResult> {
  username = username.trim();
  if (!username || !password)
    return { ok: false, error: 'Completa todos los campos.' };

  const row = db.get<{ id: number; username: string; display_name: string; password_hash: string; created_at: string }>(
    'SELECT * FROM users WHERE username = ?', [username]
  );
  if (!row) return { ok: false, error: 'Usuario no encontrado.' };

  const hash = await hashPassword(password);
  if (hash !== row.password_hash)
    return { ok: false, error: 'Contraseña incorrecta.' };

  const user: User = { id: row.id, username: row.username, display_name: row.display_name, created_at: row.created_at };
  const token = generateToken();
  db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);
  sessionActions.login(user, token);
  return { ok: true, user };
}

// ── Restaurar sesión desde token guardado ──────────────
export function restoreSession(db: DbApi): void {
  const token = sessionActions.getSavedToken();
  if (!token) return;

  const row = db.get<{ id: number; username: string; display_name: string; created_at: string }>(
    `SELECT u.id, u.username, u.display_name, u.created_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [token]
  );
  if (!row) { sessionActions.logout(); return; }

  sessionActions.login(
    { id: row.id, username: row.username, display_name: row.display_name, created_at: row.created_at },
    token
  );
}