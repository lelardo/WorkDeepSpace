// src/core/overlay/OverlayLayer.tsx
import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme }        from '../context/ThemeContext';
import { useDb }           from '../db/useDb';
import { useSession }      from '../auth/authStore';
import { OverlayRegistry } from './overlayRegistry';
import { FAB_SIZE, FAB_MARGIN, STACK_GAP } from './types';
import type { OverlayCorner } from './types';

const DRAG_THRESHOLD = 6;
const PANEL_GAP      = 10; // px entre FAB y panel

function cornerPos(corner: OverlayCorner, idx: number) {
  const v = FAB_MARGIN + idx * STACK_GAP;
  switch (corner) {
    case 'bottom-right': return { x: window.innerWidth  - FAB_SIZE - FAB_MARGIN, y: window.innerHeight - FAB_SIZE - v };
    case 'bottom-left':  return { x: FAB_MARGIN,                                  y: window.innerHeight - FAB_SIZE - v };
    case 'top-right':    return { x: window.innerWidth  - FAB_SIZE - FAB_MARGIN,  y: v };
    case 'top-left':     return { x: FAB_MARGIN,                                  y: v };
  }
}

function nearestCorner(x: number, y: number): OverlayCorner {
  const r = x > window.innerWidth  / 2 ? 'right' : 'left';
  const t = y < window.innerHeight / 2 ? 'top'   : 'bottom';
  return `${t}-${r}` as OverlayCorner;
}

interface SlotState { id: string; corner: OverlayCorner; stackIdx: number; x: number; y: number; }

function restack(slots: SlotState[], corner: OverlayCorner): SlotState[] {
  const inCorner = slots
    .filter(s => s.corner === corner)
    .sort((a, b) => a.stackIdx - b.stackIdx);
  return slots.map(s => {
    if (s.corner !== corner) return s;
    const newIdx = inCorner.findIndex(c => c.id === s.id);
    return { ...s, stackIdx: newIdx, ...cornerPos(corner, newIdx) };
  });
}

export function OverlayLayer() {
  const { dark } = useTheme();
  const { db }   = useDb();
  const session  = useSession();
  const overlays = OverlayRegistry.all();

  const [slots, setSlots] = useState<SlotState[]>(() => {
    const count: Partial<Record<OverlayCorner, number>> = {};
    return overlays.map(o => {
      const idx = count[o.defaultCorner] ?? 0;
      count[o.defaultCorner] = idx + 1;
      return { id: o.id, corner: o.defaultCorner, stackIdx: idx, ...cornerPos(o.defaultCorner, idx) };
    });
  });

  const [topId,      setTopId]      = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const didDragRef = useRef(false);

  const startDrag = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    const startX = e.clientX, startY = e.clientY;
    const ox = e.clientX - slot.x, oy = e.clientY - slot.y;
    let moved = false;
    didDragRef.current = false;

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX, dy = mv.clientY - startY;
      if (!moved && Math.sqrt(dx*dx + dy*dy) < DRAG_THRESHOLD) return;
      if (!moved) { moved = true; setDraggingId(id); }
      setSlots(prev => prev.map(s =>
        s.id === id ? { ...s, x: mv.clientX - ox, y: mv.clientY - oy } : s
      ));
    };

    const onUp = (mu: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);

      if (!moved) { setDraggingId(null); didDragRef.current = false; return; }

      didDragRef.current = true;
      setDraggingId(null);

      const corner    = nearestCorner(mu.clientX - ox, mu.clientY - oy);
      const oldCorner = slot.corner;

      setSlots(prev => {
        const othersInNew = prev.filter(s => s.id !== id && s.corner === corner);
        const updated = prev.map(s =>
          s.id === id ? { ...s, corner, stackIdx: othersInNew.length } : s
        );
        const restacked = oldCorner !== corner ? restack(updated, oldCorner) : updated;
        return restack(restacked, corner);
      });

      setTimeout(() => { didDragRef.current = false; }, 50);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [slots]);

  if (!db || !session) return null;

  return createPortal(
    <>
      {overlays.map((overlay, i) => {
        const slot = slots.find(s => s.id === overlay.id);
        if (!slot) return null;

        const Component  = overlay.component;
        const isDragging = draggingId === overlay.id;
        const isTop      = topId === overlay.id;

        // Panel sale AL LADO del FAB — derecha si FAB está a la izquierda, izquierda si está a la derecha
        const isAtLeft  = slot.x < window.innerWidth / 2;
        const isAtTop   = slot.y < window.innerHeight / 2;
        const panelW    = overlay.panelWidth  ?? 340;
        const panelH    = overlay.panelHeight ?? 480;

        const panelX = isAtLeft
          ? slot.x + FAB_SIZE + PANEL_GAP          // a la derecha del FAB
          : slot.x - panelW - PANEL_GAP;           // a la izquierda del FAB

        const panelY = isAtTop
          ? slot.y                                  // alineado arriba con el FAB
          : slot.y + FAB_SIZE - panelH;             // alineado abajo con el FAB

        return (
          <div
            key={overlay.id}
            style={{
              position:  'fixed',
              left:      `${slot.x}px`,
              top:       `${slot.y}px`,
              zIndex:    isTop ? 250 : 200 + i,
              width:     `${FAB_SIZE}px`,
              height:    `${FAB_SIZE}px`,
              overflow:  'visible',
              transition: isDragging ? 'none' : 'left 0.4s cubic-bezier(0.34,1.56,0.64,1), top 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Component
              db={db}
              user={session.user}
              dark={dark}
              fabX={slot.x}
              fabY={slot.y}
              panelX={panelX - slot.x}   // relativo al shell
              panelY={panelY - slot.y}   // relativo al shell
              panelClearance={0}         // ya no se necesita — el panel va al lado
              didDragRef={didDragRef}
              onDragStart={e => startDrag(overlay.id, e)}
              onPanelOpen={() => setTopId(overlay.id)}
              onPanelClose={() => setTopId(id => id === overlay.id ? null : id)}
            />
          </div>
        );
      })}
    </>,
    document.body
  );
}