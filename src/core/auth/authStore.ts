// src/core/auth/authStore.ts
//
// Store singleton de sesión — sin React, usable desde cualquier lado.
// La sesión se persiste en localStorage como token, y el user se
// recarga desde la BD al arrancar.

import { useSyncExternalStore } from 'react';
import type { Session, User } from './types';

const LS_TOKEN_KEY = 'workspace_session_token';

// ── Singleton ──────────────────────────────────────────
let _session: Session | null = null;
const _listeners = new Set<() => void>();
const emit        = () => _listeners.forEach(fn => fn());
const subscribe   = (cb: () => void) => { _listeners.add(cb); return () => _listeners.delete(cb); };
const getSnapshot = () => _session;

export const sessionActions = {
  login(user: User, token: string) {
    _session = { user, token };
    localStorage.setItem(LS_TOKEN_KEY, token);
    emit();
  },
  logout() {
    _session = null;
    localStorage.removeItem(LS_TOKEN_KEY);
    emit();
  },
  getSavedToken(): string | null {
    return localStorage.getItem(LS_TOKEN_KEY);
  },
};

export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot);
}