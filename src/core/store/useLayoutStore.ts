// src/core/store/useLayoutStore.ts
import { useSyncExternalStore } from 'react';

export type LayoutMode = 'grid' | 'canvas';

export interface CanvasSlot {
  id: string;
  x: number; y: number;
  w: number; h: number;
  z: number;
}

const LS_MODE  = 'workspace_layout_mode';
const LS_SLOTS = 'workspace_canvas_slots';

const DEFAULT_W = 560;
const DEFAULT_H = 420;
const CASCADE   = 32;

let _mode:  LayoutMode   = (localStorage.getItem(LS_MODE) as LayoutMode) ?? 'grid';
let _slots: CanvasSlot[] = (() => { try { return JSON.parse(localStorage.getItem(LS_SLOTS) ?? '[]'); } catch { return []; } })();
let _maxZ = _slots.reduce((m, s) => Math.max(m, s.z), 0);

function save() {
  try { localStorage.setItem(LS_MODE, _mode); localStorage.setItem(LS_SLOTS, JSON.stringify(_slots)); } catch {}
}

let _snap = { mode: _mode, slots: _slots };
const _listeners = new Set<() => void>();
const emit = () => _listeners.forEach(fn => fn());
const subscribe = (cb: () => void) => { _listeners.add(cb); return () => _listeners.delete(cb); };
function commit() { _snap = { mode: _mode, slots: [..._slots] }; save(); emit(); }

export const layoutActions = {
  toggleMode() { _mode = _mode === 'grid' ? 'canvas' : 'grid'; commit(); },

  ensureSlot(id: string) {
    if (_slots.find(s => s.id === id)) return;
    const idx = _slots.length % 8;
    _slots = [..._slots, { id, x: 40 + idx * CASCADE, y: 40 + idx * CASCADE, w: DEFAULT_W, h: DEFAULT_H, z: ++_maxZ }];
    commit();
  },

  removeSlot(id: string) { _slots = _slots.filter(s => s.id !== id); commit(); },

  moveSlot(id: string, x: number, y: number) {
    _slots = _slots.map(s => s.id === id ? { ...s, x, y } : s);
    commit();
  },

  resizeSlot(id: string, x: number, y: number, w: number, h: number) {
    _slots = _slots.map(s => s.id === id ? { ...s, x, y, w, h } : s);
    commit();
  },

  bringToFront(id: string) {
    _slots = _slots.map(s => s.id === id ? { ...s, z: ++_maxZ } : s);
    _snap = { mode: _mode, slots: [..._slots] }; emit(); // no save — z is transient
  },
};

export function useLayoutStore() {
  const snap = useSyncExternalStore(subscribe, () => _snap);
  return { ...snap, ...layoutActions };
}