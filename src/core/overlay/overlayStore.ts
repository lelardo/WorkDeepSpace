// src/core/overlay/overlayStore.ts
// Estado de qué overlays están activos — persiste en localStorage.

import { useSyncExternalStore } from 'react';

const LS_KEY = 'workspace_overlay_state';

function save(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
}

function load(): string[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Estado como array inmutable — useSyncExternalStore detecta cambios por referencia
let _active: string[] = (() => {
  const saved = load();
  return saved ?? []; // vacío hasta que initDefaults lo llene
})();

const _listeners = new Set<() => void>();
const emit        = () => _listeners.forEach(fn => fn());
const subscribe   = (cb: () => void) => { _listeners.add(cb); return () => _listeners.delete(cb); };
const getSnapshot = () => _active; // nueva referencia en cada mutación → React detecta el cambio

function set(next: string[]) {
  _active = next;          // nueva referencia
  save(next);
  emit();
}

export const overlayActions = {
  enable(id: string) {
    if (_active.includes(id)) return;
    set([..._active, id]);
  },
  disable(id: string) {
    set(_active.filter(x => x !== id));
  },
  toggle(id: string) {
    if (_active.includes(id)) overlayActions.disable(id);
    else overlayActions.enable(id);
  },
  isActive(id: string): boolean {
    return _active.includes(id);
  },
  initDefaults(defaultIds: string[]) {
    if (load() === null) {
      set(defaultIds);
    }
  },
};

export function useOverlayStore() {
  const active = useSyncExternalStore(subscribe, getSnapshot);
  return {
    activeIds: active,
    ...overlayActions,
  };
}