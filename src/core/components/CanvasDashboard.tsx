// src/core/components/CanvasDashboard.tsx
import React, { useRef, useCallback, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { useModuleStore } from '../store/useModuleStore';
import { useLayoutStore } from '../store/useLayoutStore';
import { useTheme } from '../context/ThemeContext';
import { Registry } from '../registry/index';
import { useDb } from '../db/useDb';

const MIN_W = 280;
const MIN_H = 180;

type Handle = 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
const HANDLES: { id: Handle; style: React.CSSProperties }[] = [
  { id:'n',  style:{ top:'-4px',    left:'12px',   right:'12px', height:'8px',  cursor:'n-resize'  }},
  { id:'s',  style:{ bottom:'-4px', left:'12px',   right:'12px', height:'8px',  cursor:'s-resize'  }},
  { id:'e',  style:{ right:'-4px',  top:'12px', bottom:'12px',   width:'8px',   cursor:'e-resize'  }},
  { id:'w',  style:{ left:'-4px',   top:'12px', bottom:'12px',   width:'8px',   cursor:'w-resize'  }},
  { id:'ne', style:{ top:'-4px',    right:'-4px',  width:'16px', height:'16px', cursor:'ne-resize' }},
  { id:'nw', style:{ top:'-4px',    left:'-4px',   width:'16px', height:'16px', cursor:'nw-resize' }},
  { id:'se', style:{ bottom:'-4px', right:'-4px',  width:'16px', height:'16px', cursor:'se-resize' }},
  { id:'sw', style:{ bottom:'-4px', left:'-4px',   width:'16px', height:'16px', cursor:'sw-resize' }},
];

export function CanvasDashboard() {
  const store  = useModuleStore();
  const layout = useLayoutStore();
  const { dark } = useTheme();
  const { db, loading } = useDb();

  // Ensure slot exists for every active module
  useEffect(() => {
    store.activeIds.forEach(id => layout.ensureSlot(id));
    // Remove slots for closed modules
    layout.slots.forEach(s => { if (!store.activeIds.includes(s.id)) layout.removeSlot(s.id); });
  }, [store.activeIds.join(',')]);

  // ── Move ───────────────────────────────────────
  const moveRef = useRef<{ id:string; ox:number; oy:number } | null>(null);

  const onHeaderMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const slot = layout.slots.find(s => s.id === id);
    if (!slot) return;
    layout.bringToFront(id);
    moveRef.current = { id, ox: e.clientX - slot.x, oy: e.clientY - slot.y };
    const onMove = (mv: MouseEvent) => {
      if (!moveRef.current) return;
      layout.moveSlot(moveRef.current.id, mv.clientX - moveRef.current.ox, mv.clientY - moveRef.current.oy);
    };
    const onUp = () => { moveRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [layout]);

  // ── Resize ─────────────────────────────────────
  const resizeRef = useRef<{ id:string; handle:Handle; sx:number; sy:number; ox:number; oy:number; ow:number; oh:number } | null>(null);

  const onHandleMouseDown = useCallback((id: string, handle: Handle, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const slot = layout.slots.find(s => s.id === id);
    if (!slot) return;
    layout.bringToFront(id);
    resizeRef.current = { id, handle, sx: e.clientX, sy: e.clientY, ox: slot.x, oy: slot.y, ow: slot.w, oh: slot.h };
    const onMove = (mv: MouseEvent) => {
      if (!resizeRef.current) return;
      const { id, handle, sx, sy, ox, oy, ow, oh } = resizeRef.current;
      const dx = mv.clientX - sx, dy = mv.clientY - sy;
      let x = ox, y = oy, w = ow, h = oh;
      if (handle.includes('e')) w = Math.max(MIN_W, ow + dx);
      if (handle.includes('s')) h = Math.max(MIN_H, oh + dy);
      if (handle.includes('w')) { w = Math.max(MIN_W, ow - dx); x = ox + ow - w; }
      if (handle.includes('n')) { h = Math.max(MIN_H, oh - dy); y = oy + oh - h; }
      layout.resizeSlot(id, x, y, w, h);
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [layout]);

  if (store.activeIds.length === 0) return (
    <div className="dashboard-empty">
      <div style={{ position: 'relative', width: '2.5rem', height: '2.5rem' }}>
        <img 
          src="/icon.png" 
          alt="logo" 
          style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '0.375rem',
            filter: 'brightness(0.9) drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
            opacity: 0.85
          }} 
        />
      </div>
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

  return (
    <div className="canvas-layout">
      {layout.slots
        .filter(s => store.activeIds.includes(s.id))
        .sort((a, b) => a.z - b.z)
        .map(slot => {
          const mod = Registry.get(slot.id);
          if (!mod) return null;
          const C = mod.component;
          return (
            <div
              key={slot.id}
              className="module-card canvas-window"
              style={{ left: slot.x, top: slot.y, width: slot.w, height: slot.h, zIndex: slot.z }}
              onMouseDown={() => layout.bringToFront(slot.id)}
            >
              {/* Resize handles */}
              {HANDLES.map(h => (
                <div key={h.id} className="canvas-handle" style={{ position:'absolute', ...h.style }}
                  onMouseDown={e => onHandleMouseDown(slot.id, h.id, e)}/>
              ))}

              {/* Header */}
              <div className="module-header" style={{ cursor:'grab', userSelect:'none' }}
                onMouseDown={e => onHeaderMouseDown(slot.id, e)}>
                <div className="module-header-left">
                  <span className="module-header-icon">{mod.icon}</span>
                  <div>
                    <div className="module-header-name">{mod.name}</div>
                    <div className="module-header-desc">{mod.description}</div>
                  </div>
                </div>
                <div className="module-header-actions">
                  {mod.layout.isMinimizable && (
                    <button className="module-hbtn" title="Minimize" onClick={() => store.minimize(slot.id)}>
                      <Minus size={14}/>
                    </button>
                  )}
                  <button className="module-hbtn module-hbtn--danger" title="Close" onClick={() => store.close(slot.id)}>
                    <X size={14}/>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
                <C dark={dark} db={db}/>
              </div>
            </div>
          );
        })
      }
    </div>
  );
}