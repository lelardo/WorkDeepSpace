// src/core/components/Dashboard.tsx
//
// Layout de filas con divisores arrastrables (split panes).
// - Los módulos activos se distribuyen en filas
// - Dentro de cada fila, paneles separados por divisores arrastrables
// - Arrastrar el divisor redistribuye el ancho entre vecinos
// - Entre filas hay un divisor horizontal para cambiar alturas

import { useRef, useState, useCallback, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useModuleStore } from '../store/useModuleStore';
import { useTheme } from '../context/ThemeContext';
import { Registry } from '../registry/index';
import { useDb } from '../db/useDb';

const DIVIDER_SIZE = 5; // px

// Agrupa ids en filas según defaultCols (máx 12 por fila)
function buildRows(ids: string[]): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cols = 0;
  for (const id of ids) {
    const mod = Registry.get(id);
    const w = mod?.layout.defaultCols ?? 6;
    if (cols + w > 12 && cur.length > 0) { rows.push(cur); cur = []; cols = 0; }
    cur.push(id); cols += w;
  }
  if (cur.length) rows.push(cur);
  return rows;
}

// Cada panel tiene un flex "basis" en porcentaje
type PanelSizes = Record<string, number>; // id → flex %

export function Dashboard() {
  const store = useModuleStore();
  const { dark } = useTheme();
  const { db, loading } = useDb();
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = buildRows(store.activeIds);

  // Tamaños: col % por módulo, row % por fila
  const [colSizes, setColSizes] = useState<PanelSizes>({});
  const [rowSizes, setRowSizes] = useState<number[]>([]); // % por fila

  // Inicializa tamaños cuando cambian los módulos activos
  useEffect(() => {
    setColSizes(prev => {
      const next = { ...prev };
      for (const row of rows) {
        const share = 100 / row.length;
        for (const id of row) {
          if (!(id in next)) next[id] = share;
        }
      }
      return next;
    });
    setRowSizes(prev => {
      if (prev.length === rows.length) return prev;
      const share = 100 / (rows.length || 1);
      return rows.map((_, i) => prev[i] ?? share);
    });
  }, [store.activeIds.join(','), rows.length]);

  // ── Drag horizontal (entre columnas) ────────────────
  const dragColRef = useRef<{ leftId: string; rightId: string; startX: number; leftPct: number; rightPct: number } | null>(null);

  const onColDividerDown = useCallback((leftId: string, rightId: string, e: React.MouseEvent) => {
    e.preventDefault();
    dragColRef.current = {
      leftId, rightId, startX: e.clientX,
      leftPct:  colSizes[leftId]  ?? 50,
      rightPct: colSizes[rightId] ?? 50,
    };
    const container = (e.currentTarget as HTMLElement).closest('.dashboard-row') as HTMLElement;
    const totalW = container?.offsetWidth ?? 1;

    const onMove = (mv: MouseEvent) => {
      if (!dragColRef.current) return;
      const dx  = mv.clientX - dragColRef.current.startX;
      const dpct = (dx / totalW) * 100;
      const minPct = 10;
      const newLeft  = Math.max(minPct, dragColRef.current.leftPct  + dpct);
      const newRight = Math.max(minPct, dragColRef.current.rightPct - dpct);
      // renormaliza para que sumen igual
      setColSizes(prev => ({ ...prev, [dragColRef.current!.leftId]: newLeft, [dragColRef.current!.rightId]: newRight }));
    };
    const onUp = () => { dragColRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colSizes]);

  // ── Drag vertical (entre filas) ──────────────────────
  const dragRowRef = useRef<{ topIdx: number; botIdx: number; startY: number; topPct: number; botPct: number } | null>(null);

  const onRowDividerDown = useCallback((topIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const botIdx = topIdx + 1;
    const container = (e.currentTarget as HTMLElement).closest('.dashboard-layout') as HTMLElement;
    const totalH = container?.offsetHeight ?? 1;
    dragRowRef.current = {
      topIdx, botIdx, startY: e.clientY,
      topPct: rowSizes[topIdx] ?? 50,
      botPct: rowSizes[botIdx] ?? 50,
    };
    const onMove = (mv: MouseEvent) => {
      if (!dragRowRef.current) return;
      const dy   = mv.clientY - dragRowRef.current.startY;
      const dpct = (dy / totalH) * 100;
      const minPct = 8;
      const newTop = Math.max(minPct, dragRowRef.current.topPct + dpct);
      const newBot = Math.max(minPct, dragRowRef.current.botPct - dpct);
      setRowSizes(prev => { const n = [...prev]; n[dragRowRef.current!.topIdx] = newTop; n[dragRowRef.current!.botIdx] = newBot; return n; });
    };
    const onUp = () => { dragRowRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rowSizes]);

  // ── Estados de carga ──────────────────────────────────
  if (store.activeIds.length === 0) return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon">⬡</span>
      <p>No active modules</p>
      <small>Hover the left edge to open the sidebar</small>
    </div>
  );
  if (loading || !db) return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon" style={{ opacity: 0.3 }}>⬡</span>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Initializing…</p>
    </div>
  );

  // ── Módulo expandido ──────────────────────────────────
  if (expanded) {
    const mod = Registry.get(expanded);
    if (mod) {
      const C = mod.component;
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.625rem', minHeight: 0 }}>
          <div className="module-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <ModHeader mod={mod} isExpanded
              onExpand={() => setExpanded(null)}
              onMinimize={() => { store.minimize(mod.id); setExpanded(null); }}
              onClose={() => { store.close(mod.id); setExpanded(null); }}
            />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <C dark={dark} db={db} />
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="dashboard-layout">
      {rows.map((rowIds, ri) => (
        <>
          {/* ── Fila ── */}
          <div key={`row-${ri}`} className="dashboard-row" style={{ flex: rowSizes[ri] ?? 1 }}>
            {rowIds.map((id, ci) => {
              const mod = Registry.get(id);
              if (!mod) return null;
              const C = mod.component;
              return (
                <>
                  {/* Panel */}
                  <div
                    key={id}
                    className="module-card"
                    style={{ flex: colSizes[id] ?? 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
                  >
                    <ModHeader mod={mod} isExpanded={false}
                      onExpand={() => setExpanded(id)}
                      onMinimize={() => store.minimize(id)}
                      onClose={() => store.close(id)}
                    />
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <C dark={dark} db={db} />
                    </div>
                  </div>

                  {/* Divisor vertical entre columnas */}
                  {ci < rowIds.length - 1 && (
                    <div
                      key={`cdiv-${id}`}
                      className="divider divider--col"
                      onMouseDown={e => onColDividerDown(id, rowIds[ci + 1], e)}
                    >
                      <div className="divider-handle" />
                    </div>
                  )}
                </>
              );
            })}
          </div>

          {/* Divisor horizontal entre filas */}
          {ri < rows.length - 1 && (
            <div
              key={`rdiv-${ri}`}
              className="divider divider--row"
              onMouseDown={e => onRowDividerDown(ri, e)}
            >
              <div className="divider-handle" />
            </div>
          )}
        </>
      ))}
    </div>
  );
}

function ModHeader({ mod, isExpanded, onExpand, onMinimize, onClose }: {
  mod: NonNullable<ReturnType<typeof Registry.get>>;
  isExpanded: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="module-header">
      <div className="module-header-left">
        <span className="module-header-icon">{mod.icon}</span>
        <div>
          <div className="module-header-name">{mod.name}</div>
          <div className="module-header-desc">{mod.description}</div>
        </div>
      </div>
      <div className="module-header-actions">
        {mod.layout.canExpandFull && (
          <ModBtn title={isExpanded ? 'Restore' : 'Expand'} onClick={onExpand}>
            {isExpanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </ModBtn>
        )}
        {mod.layout.isMinimizable && !isExpanded && (
          <ModBtn title="Minimize" onClick={onMinimize}><Minus size={14}/></ModBtn>
        )}
        <ModBtn title="Close" onClick={onClose} danger><X size={14}/></ModBtn>
      </div>
    </div>
  );
}

function ModBtn({ children, onClick, title, danger = false }: {
  children: React.ReactNode; onClick: () => void; title: string; danger?: boolean;
}) {
  return (
    <button className={`module-hbtn${danger ? ' module-hbtn--danger' : ''}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}