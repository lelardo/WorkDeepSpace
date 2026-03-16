// src/core/components/Dashboard.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useModuleStore, moduleActions } from '../store/useModuleStore';
import { useTheme } from '../context/ThemeContext';
import { Registry } from '../registry/index';
import { useDb } from '../db/useDb';

const LS_SIZES_KEY = 'workspace_panel_sizes';

function saveSizes(col: Record<string,number>, row: number[]) {
  try { localStorage.setItem(LS_SIZES_KEY, JSON.stringify({ col, row })); } catch {}
}

function loadSizes(): { col: Record<string,number>; row: number[] } | null {
  try {
    const raw = localStorage.getItem(LS_SIZES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildRows(ids: string[]): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], cols = 0;
  for (const id of ids) {
    const mod = Registry.get(id);
    const w = mod?.layout.defaultCols ?? 6;
    if (cols + w > 12 && cur.length > 0) { rows.push(cur); cur = []; cols = 0; }
    cur.push(id); cols += w;
  }
  if (cur.length) rows.push(cur);
  return rows;
}

type PanelSizes = Record<string, number>;

export function Dashboard() {
  const store = useModuleStore();
  const { dark } = useTheme();
  const { db, loading } = useDb();
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [dragModule,  setDragModule]  = useState<string | null>(null);
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);

  const rows = buildRows(store.activeIds);

  const [colSizes, setColSizes] = useState<PanelSizes>(() => loadSizes()?.col ?? {});
  const [rowSizes, setRowSizes] = useState<number[]>(() => loadSizes()?.row ?? []);

  // Init missing sizes for new modules
  useEffect(() => {
    let changed = false;
    setColSizes(prev => {
      const next = { ...prev };
      for (const row of rows) {
        const share = 100 / row.length;
        for (const id of row) {
          if (!(id in next)) { next[id] = share; changed = true; }
        }
      }
      return changed ? next : prev;
    });
    setRowSizes(prev => {
      if (prev.length === rows.length) return prev;
      const share = 100 / (rows.length || 1);
      return rows.map((_, i) => prev[i] ?? share);
    });
  }, [store.activeIds.join(','), rows.length]);

  // Persist whenever sizes change
  useEffect(() => {
    if (Object.keys(colSizes).length > 0) saveSizes(colSizes, rowSizes);
  }, [colSizes, rowSizes]);

  // ── Col drag ──────────────────────────────────────
  const dragColRef = useRef<{ leftId:string; rightId:string; startX:number; leftPct:number; rightPct:number }|null>(null);

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
      const { leftId, rightId, startX, leftPct, rightPct } = dragColRef.current;
      const dpct = ((mv.clientX - startX) / totalW) * 100;
      setColSizes(prev => ({
        ...prev,
        [leftId]:  Math.max(10, leftPct  + dpct),
        [rightId]: Math.max(10, rightPct - dpct),
      }));
    };
    const onUp = () => { dragColRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [colSizes]);

  // ── Row drag ──────────────────────────────────────
  const dragRowRef = useRef<{ topIdx:number; botIdx:number; startY:number; topPct:number; botPct:number }|null>(null);

  const onRowDividerDown = useCallback((topIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const botIdx = topIdx + 1;
    const container = (e.currentTarget as HTMLElement).closest('.dashboard-layout') as HTMLElement;
    const totalH = container?.offsetHeight ?? 1;
    dragRowRef.current = { topIdx, botIdx, startY: e.clientY, topPct: rowSizes[topIdx]??50, botPct: rowSizes[botIdx]??50 };

    const onMove = (mv: MouseEvent) => {
      if (!dragRowRef.current) return;
      const { topIdx, botIdx, startY, topPct, botPct } = dragRowRef.current;
      const dpct = ((mv.clientY - startY) / totalH) * 100;
      setRowSizes(prev => { const n=[...prev]; n[topIdx]=Math.max(8,topPct+dpct); n[botIdx]=Math.max(8,botPct-dpct); return n; });
    };
    const onUp = () => { dragRowRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rowSizes]);

  if (store.activeIds.length === 0) return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon">⬡</span>
      <p>No active modules</p>
      <small>Hover the left edge to open the sidebar</small>
    </div>
  );

  if (loading || !db) return (
    <div className="dashboard-empty">
      <span className="dashboard-empty-icon" style={{ opacity:0.3 }}>⬡</span>
      <p style={{ color:'var(--text-muted)', fontSize:'0.875rem' }}>Initializing…</p>
    </div>
  );

  if (expanded) {
    const mod = Registry.get(expanded);
    if (mod) {
      const C = mod.component;
      return (
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0.625rem', minHeight:0 }}>
          <div className="module-card" style={{ flex:1, display:'flex', flexDirection:'column' }}>
            <ModuleHeader mod={mod} isExpanded onExpand={()=>setExpanded(null)} onMinimize={()=>{store.minimize(mod.id);setExpanded(null);}} onClose={()=>{store.close(mod.id);setExpanded(null);}}/>
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
              <C dark={dark} db={db}/>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="dashboard-layout">
      {rows.map((rowIds, ri) => (
        <React.Fragment key={ri}>
          <div
            className="dashboard-row"
            style={{ flex: rowSizes[ri] ?? 1 }}
          >
            {rowIds.map((id, ci) => {
              const mod  = Registry.get(id);
              if (!mod) return null;
              const C    = mod.component;
              const isOver = dragOverId === id && dragModule !== id;
              return (
                <React.Fragment key={id}>
                  <div
                    className="module-card"
                    style={{
                      flex: colSizes[id] ?? 1, minWidth:0,
                      display:'flex', flexDirection:'column',
                      outline: isOver ? '2px solid var(--primary)' : 'none',
                      transition: 'outline 0.1s',
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverId(id); }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }}
                    onDrop={e => {
                      e.preventDefault();
                      if (dragModule && dragModule !== id) {
                        moduleActions.reorderModules(dragModule, id);
                      }
                      setDragModule(null);
                      setDragOverId(null);
                    }}
                  >
                    <ModuleHeader
                      mod={mod} isExpanded={false}
                      onExpand={()=>setExpanded(id)}
                      onMinimize={()=>store.minimize(id)}
                      onClose={()=>store.close(id)}
                      draggable
                      onDragStart={()=>setDragModule(id)}
                      onDragEnd={()=>{ setDragModule(null); setDragOverId(null); }}
                    />
                    <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0,
                      opacity: dragModule === id ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                      <C dark={dark} db={db}/>
                    </div>
                  </div>
                  {ci < rowIds.length - 1 && (
                    <div className="divider divider--col" onMouseDown={e=>onColDividerDown(id, rowIds[ci+1], e)}>
                      <div className="divider-handle"/>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {ri < rows.length - 1 && (
            <div className="divider divider--row" onMouseDown={e=>onRowDividerDown(ri, e)}>
              <div className="divider-handle"/>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ModuleHeader({ mod, isExpanded, onExpand, onMinimize, onClose, draggable, onDragStart, onDragEnd }: {
  mod: NonNullable<ReturnType<typeof Registry.get>>;
  isExpanded: boolean; onExpand:()=>void; onMinimize:()=>void; onClose:()=>void;
  draggable?: boolean; onDragStart?:()=>void; onDragEnd?:()=>void;
}) {
  return (
    <div
      className="module-header"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ cursor: draggable ? 'grab' : undefined }}
    >
      <div className="module-header-left">
        <span className="module-header-icon">{mod.icon}</span>
        <div>
          <div className="module-header-name">{mod.name}</div>
          <div className="module-header-desc">{mod.description}</div>
        </div>
      </div>
      <div className="module-header-actions">
        {mod.layout.canExpandFull && (
          <ModBtn title={isExpanded?'Restore':'Expand'} onClick={onExpand}>
            {isExpanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </ModBtn>
        )}
        {mod.layout.isMinimizable && !isExpanded && <ModBtn title="Minimize" onClick={onMinimize}><Minus size={14}/></ModBtn>}
        <ModBtn title="Close" onClick={onClose} danger><X size={14}/></ModBtn>
      </div>
    </div>
  );
}

function ModBtn({ children, onClick, title, danger=false }: { children:React.ReactNode; onClick:()=>void; title:string; danger?:boolean }) {
  return <button className={`module-hbtn${danger?' module-hbtn--danger':''}`} onClick={onClick} title={title}>{children}</button>;
}