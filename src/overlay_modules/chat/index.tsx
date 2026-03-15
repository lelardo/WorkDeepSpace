// src/overlays/chat/index.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import type { OverlayWidget, OverlayProps } from '../../core/overlay/types';
import { FAB_SIZE } from '../../core/overlay/types';

interface Msg { id:number; user_id:number; display_name:string; mensaje:string; creado_en:string; }

const PANEL_W = 320;
const PANEL_H = 460;

function ChatOverlayComponent({ db, user, panelX, panelY, didDragRef, onDragStart, onPanelOpen, onPanelClose }: OverlayProps) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState('');
  const [lastSeen, setLastSeen] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    try {
      setMessages(db.all<Msg>(`
        SELECT m.id, m.user_id, u.display_name, m.mensaje, m.creado_en
        FROM chat_messages m JOIN users u ON u.id = m.user_id ORDER BY m.id ASC
      `));
    } catch { /* tabla no existe aún */ }
  }, [db]);

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, open]);
  useEffect(() => { if (open && messages.length > 0) setLastSeen(messages[messages.length - 1].id); }, [open, messages]);

  const unread = messages.filter(m => m.id > lastSeen && m.user_id !== user.id).length;

  const toggleOpen = () => {
    if (didDragRef.current) return;
    const next = !open;
    setOpen(next);
    next ? onPanelOpen() : onPanelClose();
  };

  const send = () => {
    if (!input.trim()) return;
    db.run('INSERT INTO chat_messages (user_id, mensaje) VALUES (?, ?)', [user.id, input.trim()]);
    load(); setInput('');
  };

  return (
    <>
      {/* Panel — position:absolute relativo al shell, coords calculadas por OverlayLayer */}
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: `${panelX}px`,
            top:  `${panelY}px`,
            zIndex: 300,
            width: `${PANEL_W}px`, height: `${PANEL_H}px`,
            display: 'flex', flexDirection: 'column',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden', pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ padding:'0.625rem 0.875rem', borderBottom:'1px solid var(--border)', backgroundColor:'var(--bg-raised)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', backgroundColor:'#10b981', boxShadow:'0 0 6px #10b981' }}/>
              <span style={{ ...ms.title, fontSize:'0.8125rem' }}>Chat de Equipo</span>
            </div>
            <button style={{ ...ms.btn.ghost, padding:'3px' }} onClick={toggleOpen}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--danger)')}
              onMouseLeave={e=>(e.currentTarget.style.color='')}><X size={14}/></button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'0.625rem', display:'flex', flexDirection:'column', gap:'0.375rem' }}>
            {messages.length === 0
              ? <div style={ms.empty}>Sin mensajes aún.</div>
              : messages.map((m, i) => {
                const isMe = m.user_id === user.id;
                const prevSame = i > 0 && messages[i-1].user_id === m.user_id;
                return (
                  <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start', marginTop:prevSame?'-0.1rem':'0.1rem' }}>
                    {!isMe && !prevSame && <span style={{ ...ms.label, marginBottom:'0.1rem', paddingLeft:'0.375rem', color:'var(--primary)', fontSize:'0.62rem' }}>{m.display_name}</span>}
                    <div style={{ maxWidth:'85%', padding:'0.45rem 0.7rem', borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px', backgroundColor:isMe?'var(--primary)':'var(--bg-raised)', color:isMe?'#fff':'var(--text)', border:isMe?'none':'1px solid var(--border)', fontSize:'0.8125rem', lineHeight:1.45, wordBreak:'break-word' }}>{m.mensaje}</div>
                    {!prevSame && <span style={{ ...ms.label, fontSize:'0.58rem', opacity:0.6, marginTop:'0.1rem', paddingLeft:isMe?0:'0.375rem', paddingRight:isMe?'0.25rem':0 }}>{new Date(m.creado_en).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
                  </div>
                );
              })
            }
          </div>

          {/* Input */}
          <div style={{ padding:'0.5rem 0.625rem', borderTop:'1px solid var(--border)', backgroundColor:'var(--bg-raised)', display:'flex', gap:'0.375rem', flexShrink:0 }}>
            <input type="text" placeholder="Mensaje…" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              style={{ ...ms.input, flex:1, padding:'0.4rem 0.625rem', fontSize:'0.8125rem' }} autoFocus
            />
            <button style={{ ...ms.btn.primary, padding:'0.4rem 0.625rem', opacity:!input.trim()?0.5:1 }}
              onClick={send} disabled={!input.trim()}><Send size={14}/></button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onMouseDown={onDragStart}
        onClick={toggleOpen}
        title="Chat"
        style={{
          position:'absolute', left:0, top:0,
          width:`${FAB_SIZE}px`, height:`${FAB_SIZE}px`,
          borderRadius:'22px',
          backgroundColor:open?'var(--bg-raised)':'var(--primary)',
          color:open?'var(--text-muted)':'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'grab', boxShadow:'var(--shadow-lg)', border:'none', pointerEvents:'auto',
        }}
      >
        {open ? <X size={22}/> : <MessageSquare size={22}/>}
      </button>
    </>
  );
}

export const ChatOverlay: OverlayWidget = {
  id:'chat', component: ChatOverlayComponent, defaultCorner:'bottom-right',
  panelWidth: PANEL_W, panelHeight: PANEL_H,
  migrations: [{
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      mensaje TEXT NOT NULL, creado_en TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  }],
};