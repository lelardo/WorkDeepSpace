// src/core/store/useModuleStore.ts
import { useSyncExternalStore } from 'react';

export type ModuleState = 'active' | 'minimized';

interface ModuleEntry {
  id:           string;
  state:        ModuleState;
  taskbarOrder: number;
}

let _entries: ModuleEntry[] = [];
const _listeners = new Set<() => void>();
const emit        = () => _listeners.forEach(fn => fn());
const subscribe   = (cb: () => void) => { _listeners.add(cb); return () => _listeners.delete(cb); };
const getSnapshot = () => _entries;

export const moduleActions = {
  open(id: string) {
    if (_entries.find(e => e.id === id)) return;
    _entries = [..._entries, { id, state: 'active', taskbarOrder: _entries.length }];
    emit();
  },
  close(id: string) {
    _entries = _entries.filter(e => e.id !== id);
    emit();
  },
  minimize(id: string) {
    _entries = _entries.map(e => e.id === id ? { ...e, state: 'minimized' } : e);
    emit();
  },
  restore(id: string) {
    _entries = _entries.map(e => e.id === id ? { ...e, state: 'active' } : e);
    emit();
  },
  reorderTaskbar(fromId: string, toId: string) {
    const mins = _entries.filter(e => e.state === 'minimized').sort((a,b) => a.taskbarOrder - b.taskbarOrder);
    const fi = mins.findIndex(e => e.id === fromId);
    const ti = mins.findIndex(e => e.id === toId);
    if (fi === -1 || ti === -1) return;
    const arr = [...mins];
    const [m] = arr.splice(fi, 1);
    arr.splice(ti, 0, m);
    _entries = _entries.map(e => { const i = arr.findIndex(u => u.id === e.id); return i >= 0 ? { ...e, taskbarOrder: i } : e; });
    emit();
  },
};

export function useModuleStore() {
  const entries = useSyncExternalStore(subscribe, getSnapshot);
  return {
    entries,
    activeIds:    entries.filter(e => e.state === 'active').map(e => e.id),
    minimizedIds: entries.filter(e => e.state === 'minimized').sort((a,b) => a.taskbarOrder - b.taskbarOrder).map(e => e.id),
    ...moduleActions,
  };
}