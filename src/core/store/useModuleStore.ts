// src/core/store/useModuleStore.ts
import { useSyncExternalStore } from 'react';

export type ModuleState = 'active' | 'minimized';

interface ModuleEntry {
  id:           string;
  state:        ModuleState;
  taskbarOrder: number;
}

const LS_KEY    = 'workspace_module_state';
const LS_BREAKS = 'workspace_row_breaks';
// rowBreaks: set of module IDs that start a new row regardless of cols
let _rowBreaks: Set<string> = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_BREAKS) ?? '[]')); }
  catch { return new Set(); }
})();

function saveBreaks() {
  try { localStorage.setItem(LS_BREAKS, JSON.stringify([..._rowBreaks])); } catch {}
}

/** Rebuild rowBreaks to only contain IDs that are actually in entries */
function cleanBreaks() {
  const activeIds = new Set(_entries.filter(e => e.state === 'active').map(e => e.id));
  for (const id of [..._rowBreaks]) {
    if (!activeIds.has(id)) _rowBreaks.delete(id);
  }
}

// ── Persistencia ───────────────────────────────────
function saveState(entries: ModuleEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch {}
}

function loadState(): ModuleEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed: ModuleEntry[] = JSON.parse(raw);
    // Restore active modules as minimized — user opens them where they want
    return parsed.map(e => ({
      ...e,
      state: e.state === 'active' ? 'minimized' : e.state,
    }));
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
    _rowBreaks.delete(id);
    saveBreaks();
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

  /**
   * Mueve fromId junto a toId (izquierda o derecha).
   * Extrae fromId de donde está y lo inserta al lado de toId
   * en el array de entries — buildRows se encarga del resto.
   */
  insertModule(fromId: string, toId: string, side: 'left' | 'right') {
    const next = _entries.filter(e => e.id !== fromId);
    const ti   = next.findIndex(e => e.id === toId);
    if (ti === -1) return;
    const fromEntry = _entries.find(e => e.id === fromId)!;
    const insertAt  = side === 'left' ? ti : ti + 1;
    next.splice(insertAt, 0, fromEntry);

    // fromId is now in the same row as toId — remove any break on fromId
    _rowBreaks.delete(fromId);

    // If toId had a break and fromId is inserted to its left,
    // the break moves to fromId (it now starts that row)
    if (side === 'left' && _rowBreaks.has(toId)) {
      _rowBreaks.delete(toId);
      _rowBreaks.add(fromId);
    }

    // Remove break on toId if fromId was inserted to its left
    // and fromId did NOT inherit the break (toId didn't have one)
    // — they are now in the same row, toId should not force a new row
    if (side === 'right') {
      // fromId inserted after toId — fromId might have had a break, already deleted above
      // Nothing else needed
    }

    cleanBreaks();
    saveBreaks();
    set(next);
  },
  /**
   * Mueve fromId a su propia fila, encima o debajo de targetId.
   * Inserta fromId antes/después de targetId y añade un break entre ellos.
   */
  splitModule(fromId: string, targetId: string, position: 'above' | 'below') {
    const next = _entries.filter(e => e.id !== fromId);
    const ti   = next.findIndex(e => e.id === targetId);
    if (ti === -1) return;
    const fromEntry = _entries.find(e => e.id === fromId)!;

    if (position === 'above') {
      // Insert fromId before targetId, add break on targetId to separate rows
      next.splice(ti, 0, fromEntry);
      _rowBreaks.add(targetId);        // targetId starts new row after fromId
      // fromId inherits whatever break targetId had
      if (_rowBreaks.has(targetId)) { _rowBreaks.add(fromId); }
      // Ensure fromId itself starts a new row if targetId did
      const targetHadBreak = _rowBreaks.has(targetId);
      _rowBreaks.delete(fromId);
      if (targetHadBreak) _rowBreaks.add(fromId);
      _rowBreaks.add(targetId);
    } else {
      // Insert fromId after targetId, add break on fromId to separate rows
      next.splice(ti + 1, 0, fromEntry);
      _rowBreaks.add(fromId);          // fromId starts its own new row
    }
    saveBreaks();
    set(next);
  },
  /** Removes rowBreaks for IDs not in activeIds — call on mount to clean stale state */
  cleanRowBreaks(activeIds: string[]) {
    const active = new Set(activeIds);
    let changed = false;
    for (const id of [..._rowBreaks]) {
      if (!active.has(id)) { _rowBreaks.delete(id); changed = true; }
    }
    if (changed) saveBreaks();
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
    rowBreaks:    _rowBreaks,
    ...moduleActions,
  };
}