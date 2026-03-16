// src/core/components/Dashboard.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { useModuleStore, moduleActions } from '../store/useModuleStore';
import { useTheme } from '../context/ThemeContext';
import { Registry } from '../registry/index';
import { useDb } from '../db/useDb';
import { useLayoutStore } from '../store/useLayoutStore';
import { CanvasDashboard } from './CanvasDashboard';

const LS_SIZES_KEY = 'workspace_panel_sizes';

function saveSizes(col: Record<string,number>, row: number[], rowStructureKey: string) {
  try { localStorage.setItem(LS_SIZES_KEY, JSON.stringify({ col, row, rowStructureKey })); } catch {}
}

function loadSizes(): { col: Record<string,number>; row: number[]; rowStructureKey?: string } | null {
  try {
    const raw = localStorage.getItem(LS_SIZES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildRows(ids: string[], rowBreaks: Set<string>): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  for (const id of ids) {
    const mod = Registry.get(id);
    const w   = mod?.layout.defaultCols ?? 6;
    const curCols = cur.reduce((s, cid) => {
      const m = Registry.get(cid); return s + (m?.layout.defaultCols ?? 6);
    }, 0);

    // Only start a new row if there's an EXPLICIT break OR natural overflow (strictly > 12)
    // Note: curCols + w === 12 means they fit perfectly — do NOT start new row
    const naturalOverflow = cur.length > 0 && curCols + w > 12;
    const explicitBreak   = cur.length > 0 && rowBreaks.has(id);

    if (naturalOverflow || explicitBreak) {
      rows.push(cur); cur = [];
    }
    cur.push(id);
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
  const [dropTarget,  setDropTarget]  = useState<{ id: string; zone: 'left'|'center'|'right'|'top'|'bottom' } | null>(null);

  const layout = useLayoutStore();

  // Clean stale rowBreaks on mount — removes breaks for modules that
  // no longer exist or whose breaks create phantom rows
  useEffect(() => {
    moduleActions.cleanRowBreaks(store.activeIds);
  }, []);

  const rows = buildRows(store.activeIds, store.rowBreaks);

  // Compute the current row structure key — used to detect stale saved sizes
  const rowStructureKey = rows.map(r => r.join(':')).join('|');

  const [colSizes, setColSizes] = useState<PanelSizes>(() => {
    const saved = loadSizes();
    if (!saved) return {};
    // Restore if saved structure matches current rows
    const savedKey = saved.rowStructureKey;
    const curKey   = rows.map(r => r.join(':')).join('|');
    if (savedKey === curKey) return saved.col ?? {};
    // Structure changed — start fresh
    const col: PanelSizes = {};
    for (const row of rows) { const s = 100 / row.length; for (const id of row) col[id] = s; }
    return col;
  });
  const [rowSizes, setRowSizes] = useState<number[]>(() => {
    const saved = loadSizes();
    if (!saved) { const s = 100 / (rows.length || 1); return rows.map(() => s); }
    const savedKey = saved.rowStructureKey;
    const curKey   = rows.map(r => r.join(':')).join('|');
    if (savedKey === curKey && saved.row?.length === rows.length) return saved.row;
    const s = 100 / (rows.length || 1);
    return rows.map(() => s);
  });

  // Recalculate only when row structure actually changes (not on first mount)
  const prevStructureKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevStructureKey.current === null) {
      // First mount — skip, useState already handled it
      prevStructureKey.current = rowStructureKey;
      return;
    }
    if (prevStructureKey.current === rowStructureKey) return;
    prevStructureKey.current = rowStructureKey;
    // Structure changed — reset to equal distribution
    const share = 100 / (rows.length || 1);
    setRowSizes(rows.map(() => share));
    const newCol: PanelSizes = {};
    for (const row of rows) { const s = 100 / row.length; for (const id of row) newCol[id] = s; }
    setColSizes(newCol);
  }, [rowStructureKey]);

  // Persist whenever sizes change — save structure key alongside
  useEffect(() => {
    if (Object.keys(colSizes).length > 0) saveSizes(colSizes, rowSizes, rowStructureKey);
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

  // ── Mode switch — after all hooks ───────────────
  if (layout.mode === 'canvas') return <CanvasDashboard />;

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

  // ── Smart drop handler ────────────────────────
  // Zone comes from dropTarget (set during dragOver) — that's what the
  // user saw as feedback, so we use it as the source of truth on drop.
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragModule || dragModule === targetId) { setDragModule(null); setDropTarget(null); return; }
    const zone = dropTarget?.id === targetId ? dropTarget.zone : 'center';
    if (zone === 'center') {
      moduleActions.reorderModules(dragModule, targetId);
    } else if (zone === 'left' || zone === 'right') {
      moduleActions.insertModule(dragModule, targetId, zone);
    } else {
      // top / bottom → split into own row
      moduleActions.splitModule(dragModule, targetId, zone === 'top' ? 'above' : 'below');
    }
    setDragModule(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top)  / rect.height;
    // Top/bottom 20% → split into own row; left/right 25% → insert same row; center → swap
    let zone: 'left'|'center'|'right'|'top'|'bottom';
    if (yPct < 0.20)      zone = 'top';
    else if (yPct > 0.80) zone = 'bottom';
    else if (xPct < 0.25) zone = 'left';
    else if (xPct > 0.75) zone = 'right';
    else                  zone = 'center';
    setDropTarget(prev => prev?.id === id && prev?.zone === zone ? prev : { id, zone });
  };

  return (
    <div className="dashboard-layout">
      {rows.map((rowIds, ri) => (
        <React.Fragment key={ri}>
          <div
            className="dashboard-row"
            style={{ flex: `${rowSizes[ri] ?? 1} 1 0%` }}
          >
            {rowIds.map((id, ci) => {
              const mod  = Registry.get(id);
              if (!mod) return null;
              const C    = mod.component;
              const dt   = dropTarget?.id === id && dragModule !== id ? dropTarget : null;
              return (
                <React.Fragment key={id}>
                  <div
                    className="module-card"
                    style={{
                      flex: `${colSizes[id] ?? 1} 1 0%`, minWidth:0,
                      display:'flex', flexDirection:'column',
                      position: 'relative',
                    }}
                    onDragOver={e => handleDragOver(e, id)}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                    onDrop={e => handleDrop(e, id)}
                  >
                    {/* Drop indicator — vertical line for left/right */}
                    {dt && (dt.zone === 'left' || dt.zone === 'right') && (
                      <div style={{
                        position:'absolute', top:0, bottom:0, width:'3px',
                        backgroundColor:'var(--primary)', zIndex:20, borderRadius:'2px',
                        left: dt.zone === 'left' ? 0 : undefined,
                        right: dt.zone === 'right' ? 0 : undefined,
                        boxShadow: '0 0 8px var(--primary)', pointerEvents:'none',
                      }}/>
                    )}
                    {/* Drop indicator — horizontal line for top/bottom */}
                    {dt && (dt.zone === 'top' || dt.zone === 'bottom') && (
                      <div style={{
                        position:'absolute', left:0, right:0, height:'3px',
                        backgroundColor:'var(--primary)', zIndex:20, borderRadius:'2px',
                        top: dt.zone === 'top' ? 0 : undefined,
                        bottom: dt.zone === 'bottom' ? 0 : undefined,
                        boxShadow: '0 0 8px var(--primary)', pointerEvents:'none',
                      }}/>
                    )}
                    {/* Center drop highlight */}
                    {dt && dt.zone === 'center' && (
                      <div style={{ position:'absolute', inset:0, border:'2px solid var(--primary)', borderRadius:'var(--radius-lg)', zIndex:20, pointerEvents:'none' }}/>
                    )}
                    <ModuleHeader
                      mod={mod} isExpanded={false}
                      onExpand={()=>setExpanded(id)}
                      onMinimize={()=>store.minimize(id)}
                      onClose={()=>store.close(id)}
                      draggable
                      onDragStart={()=>setDragModule(id)}
                      onDragEnd={()=>{ setDragModule(null); setDropTarget(null); }}
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