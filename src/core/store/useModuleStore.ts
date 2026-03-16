// src/core/store/useModuleStore.ts
import { useSyncExternalStore } from 'react';

export type ModuleState = 'active' | 'minimized';

interface ModuleEntry {
  id:           string;
  state:        ModuleState;
  taskbarOrder: number;
  position?:    { row: number; col: number }; // grid position (optional)
}

const LS_KEY = 'workspace_module_state';

// ── Persistencia ───────────────────────────────────
function saveState(entries: ModuleEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch {}
}

function loadState(): ModuleEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Singleton ──────────────────────────────────────
let _entries: ModuleEntry[] = loadState();
const _listeners = new Set<() => void>();
const emit        = () => _listeners.forEach(fn => fn());
const subscribe   = (cb: () => void) => { _listeners.add(cb); return () => _listeners.delete(cb); };
const getSnapshot = () => _entries;

function set(next: ModuleEntry[]) {
  _entries = next;
  saveState(next);
  emit();
}

export const moduleActions = {
  open(id: string) {
    if (_entries.find(e => e.id === id)) return;
    set([..._entries, { id, state: 'active', taskbarOrder: _entries.length }]);
  },
  close(id: string) {
    set(_entries.filter(e => e.id !== id));
  },
  minimize(id: string) {
    set(_entries.map(e => e.id === id ? { ...e, state: 'minimized' } : e));
  },
  restore(id: string) {
    set(_entries.map(e => e.id === id ? { ...e, state: 'active' } : e));
  },
  reorderTaskbar(fromId: string, toId: string) {
    const mins = _entries
      .filter(e => e.state === 'minimized')
      .sort((a, b) => a.taskbarOrder - b.taskbarOrder);
    const fi = mins.findIndex(e => e.id === fromId);
    const ti = mins.findIndex(e => e.id === toId);
    if (fi === -1 || ti === -1) return;
    const arr = [...mins];
    const [m] = arr.splice(fi, 1);
    arr.splice(ti, 0, m);
    set(_entries.map(e => {
      const i = arr.findIndex(u => u.id === e.id);
      return i >= 0 ? { ...e, taskbarOrder: i } : e;
    }));
  },
  /** Intercambia dos módulos activos de posición */
  reorderModules(fromId: string, toId: string) {
    const next = [..._entries];
    const fi   = next.findIndex(e => e.id === fromId);
    const ti   = next.findIndex(e => e.id === toId);
    if (fi === -1 || ti === -1) return;
    [next[fi], next[ti]] = [next[ti], next[fi]];
    set(next);
  },
  /** Mueve un módulo a una posición específica en la grid */
  setModulePosition(id: string, row: number, col: number) {
    set(_entries.map(e => 
      e.id === id ? { ...e, position: { row, col } } : e
    ));
  },
  /** Intercambia las posiciones de dos módulos en la grid */
  swapModulePositions(idA: string, idB: string) {
    const entryA = _entries.find(e => e.id === idA);
    const entryB = _entries.find(e => e.id === idB);
    if (!entryA || !entryB) return;
    
    const posA = entryA.position;
    const posB = entryB.position;
    
    set(_entries.map(e => {
      if (e.id === idA) return { ...e, position: posB };
      if (e.id === idB) return { ...e, position: posA };
      return e;
    }));
  },
  /** Obtiene la posición de un módulo */
  getModulePosition(id: string) {
    return _entries.find(e => e.id === id)?.position ?? null;
  },
  /** true si hay estado guardado (no abrir defaults) */
  hasSavedState(): boolean {
    return loadState().length > 0;
  },
};

export function useModuleStore() {
  const entries = useSyncExternalStore(subscribe, getSnapshot);
  return {
    entries,
    activeIds:    entries.filter(e => e.state === 'active').map(e => e.id),
    minimizedIds: entries.filter(e => e.state === 'minimized')
      .sort((a, b) => a.taskbarOrder - b.taskbarOrder).map(e => e.id),
    ...moduleActions,
  };
}