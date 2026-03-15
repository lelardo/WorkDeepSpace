// src/core/components/Taskbar.tsx
import { useRef } from 'react';
import { useModuleStore } from '../store/useModuleStore';
import { Registry } from '../registry/index';

export function Taskbar() {
  const store = useModuleStore();
  const { minimizedIds } = store;
  const dragId = useRef<string | null>(null);

  if (minimizedIds.length === 0) return null;

  return (
    <div className="taskbar">
      {minimizedIds.map(id => {
        const mod = Registry.get(id);
        if (!mod) return null;
        return (
          <button
            key={id}
            className="taskbar-chip"
            title={`${mod.name} — click to restore`}
            onClick={() => store.restore(id)}
            draggable
            onDragStart={() => { dragId.current = id; }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragId.current && dragId.current !== id) {
                store.reorderTaskbar(dragId.current, id);
              }
              dragId.current = null;
            }}
          >
            <span className="taskbar-chip-icon">{mod.icon}</span>
            <span className="taskbar-chip-name">{mod.name}</span>
          </button>
        );
      })}
    </div>
  );
}