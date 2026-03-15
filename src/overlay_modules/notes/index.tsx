import { useState, useEffect } from 'react';
import { StickyNote, Plus, Trash2, X, Edit3, ChevronDown } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import { useModuleData } from '../../core/hooks/useModuleData';
import type { OverlayWidget, OverlayProps } from '../../core/overlay/types';
import { FAB_SIZE } from '../../core/overlay/types';

function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{ fontFamily:'var(--mono)', fontSize:'0.75rem', backgroundColor:'var(--border)', borderRadius:'3px', padding:'0 3px' }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

function renderMd(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    const h1 = line.match(/^# (.+)/);   if (h1) return <div key={i} style={{ fontSize:'1rem',fontWeight:700,color:'var(--text)',margin:'0.35rem 0 0.15rem' }}>{h1[1]}</div>;
    const h2 = line.match(/^## (.+)/);  if (h2) return <div key={i} style={{ fontSize:'0.875rem',fontWeight:700,color:'var(--text)',margin:'0.25rem 0 0.1rem' }}>{h2[1]}</div>;
    const h3 = line.match(/^### (.+)/); if (h3) return <div key={i} style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--text)',margin:'0.2rem 0 0.1rem' }}>{h3[1]}</div>;
    if (line.match(/^---+$/)) return <hr key={i} style={{ border:'none',borderTop:'1px solid var(--border)',margin:'0.3rem 0' }}/>;
    const li = line.match(/^[-*] (.+)/); if (li) return <div key={i} style={{ display:'flex',gap:'0.3rem',marginBottom:'0.1rem' }}><span style={{ color:'var(--primary)' }}>•</span><span style={{ fontSize:'0.8rem' }}>{inlineFormat(li[1])}</span></div>;
    const bq = line.match(/^> (.+)/);   if (bq) return <div key={i} style={{ borderLeft:'3px solid var(--primary)',paddingLeft:'0.5rem',margin:'0.15rem 0',color:'var(--text-muted)',fontSize:'0.78rem',fontStyle:'italic' }}>{inlineFormat(bq[1])}</div>;
    if (!line.trim()) return <div key={i} style={{ height:'0.35rem' }}/>;
    return <div key={i} style={{ fontSize:'0.8rem',lineHeight:1.5 }}>{inlineFormat(line)}</div>;
  });
}

interface Note extends Record<string, unknown> { id:number; titulo:string; contenido:string; color:string; editado_en:string; }

const COLORS = [
  { label:'Default', bg:'var(--bg-raised)', border:'var(--border)' },
  { label:'Blue',    bg:'#dbeafe',          border:'#93c5fd'       },
  { label:'Green',   bg:'#dcfce7',          border:'#86efac'       },
  { label:'Yellow',  bg:'#fef9c3',          border:'#fde047'       },
  { label:'Pink',    bg:'#fce7f3',          border:'#f9a8d4'       },
  { label:'Purple',  bg:'#ede9fe',          border:'#c4b5fd'       },
];

const PANEL_W = 340;
const PANEL_H = 480;

function NotesOverlayComponent({ db, user, panelX, panelY, didDragRef, onDragStart, onPanelOpen, onPanelClose }: OverlayProps) {
  const [open,         setOpen]         = useState(false);
  const [active,       setActive]       = useState<Note | null>(null);
  const [editMode,     setEditMode]     = useState(false);
  const [draftTitle,   setDraftTitle]   = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftColor,   setDraftColor]   = useState(COLORS[0].label);
  const [showColors,   setShowColors]   = useState(false);

  const { data: notes, reload } = useModuleData<Note>(
    db,
    'SELECT * FROM quick_notes WHERE user_id = $1 ORDER BY editado_en DESC',
    [user.id]
  );

  useEffect(() => { 
    if (open && notes && notes.length > 0 && !active) setActive(notes[0]);
  }, [open, notes, active]);

  const toggleOpen = () => {
    if (didDragRef.current) return;
    const next = !open;
    setOpen(next);
    next ? onPanelOpen() : onPanelClose();
  };

  const newNote = async () => {
    if (!db) return;
    await db.run(
      'INSERT INTO quick_notes (user_id, titulo, contenido, color) VALUES ($1, $2, $3, $4)',
      [user.id, 'Nueva nota', '', COLORS[0].label]
    );
    reload();
  };

  const deleteNote = async (id: number) => {
    if (!db) return;
    await db.run('DELETE FROM quick_notes WHERE id = $1', [id]);
    await reload();
    if (active?.id === id) setActive(null);
  };

  const saveNote = async () => {
    if (!active || !db) return;
    await db.run(
      "UPDATE quick_notes SET titulo=$1, contenido=$2, color=$3, editado_en=CURRENT_TIMESTAMP WHERE id=$4",
      [draftTitle, draftContent, draftColor, active.id]
    );
    await reload();
    setEditMode(false);
    setShowColors(false);
  };

  const startEdit = (n: Note) => {
    setDraftTitle(n.titulo);
    setDraftContent(n.contenido);
    setDraftColor(n.color);
    setEditMode(true);
    setShowColors(false);
  };

  const curColor = COLORS.find(c => c.label === (editMode ? draftColor : active?.color)) ?? COLORS[0];

  return (
    <>
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:'absolute', left:`${panelX}px`, top:`${panelY}px`,
            zIndex:300,
            width:`${PANEL_W}px`, height:`${PANEL_H}px`,
            display:'flex', flexDirection:'column',
            backgroundColor:'var(--bg-card)', border:'1px solid var(--border-card)',
            borderRadius:'var(--radius-lg)', boxShadow:'0 16px 40px rgba(0,0,0,0.25)',
            overflow:'hidden', pointerEvents:'auto',
          }}
        >
          <div style={{ display:'flex', flex:1, minHeight:0 }}>
            {/* Lista */}
            <div style={{ width:'110px', flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', backgroundColor:'var(--bg-raised)' }}>
              <div style={{ padding:'0.5rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ ...ms.label, fontSize:'0.6rem' }}>Notas</span>
                <button style={{ ...ms.btn.ghost, padding:'2px' }} onClick={newNote}><Plus size={13}/></button>
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {!notes || notes.length === 0
                  ? <div style={{ padding:'0.75rem 0.5rem', ...ms.muted, fontSize:'0.72rem', textAlign:'center', fontStyle:'italic' }}>Sin notas</div>
                  : notes.map(n => {
                    const c = COLORS.find(c => c.label === n.color) ?? COLORS[0];
                    const isActive = active?.id === n.id;
                    return (
                      <div key={n.id} onClick={() => { setActive(n); setEditMode(false); }}
                        style={{ padding:'0.5rem', cursor:'pointer', borderBottom:'1px solid var(--border)', transition:'all 0.12s', backgroundColor:isActive?'var(--primary-bg)':'transparent', borderLeft:`3px solid ${isActive?'var(--primary)':c.border}` }}>
                        <div style={{ fontSize:'0.72rem', fontWeight:600, color:isActive?'var(--primary)':'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.titulo||'Sin título'}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-faint)', marginTop:'0.1rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.contenido.slice(0,28)||'—'}</div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            {/* Contenido */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, backgroundColor:curColor.bg }}>
              {active ? (
                <>
                  <div style={{ padding:'0.4rem 0.5rem', borderBottom:`1px solid ${curColor.border}`, display:'flex', alignItems:'center', gap:'0.3rem', backgroundColor:curColor.bg, flexShrink:0 }}>
                    {editMode
                      ? <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:'var(--sans)', fontSize:'0.8rem', fontWeight:600, color:'var(--text)', minWidth:0 }} placeholder="Título…"/>
                      : <span style={{ flex:1, fontSize:'0.8rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{active.titulo||'Sin título'}</span>
                    }
                    {editMode && (
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <button onClick={() => setShowColors(p=>!p)} style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${curColor.border}`, backgroundColor:curColor.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><ChevronDown size={9}/></button>
                        {showColors && (
                          <div style={{ position:'absolute', top:'20px', right:0, display:'flex', gap:'4px', backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'4px', zIndex:10 }}>
                            {COLORS.map(c => <button key={c.label} onClick={() => { setDraftColor(c.label); setShowColors(false); }} style={{ width:'16px', height:'16px', borderRadius:'50%', border:`2px solid ${c.border}`, backgroundColor:c.bg, cursor:'pointer', outline:draftColor===c.label?'2px solid var(--primary)':'none', outlineOffset:'1px' }}/>)}
                          </div>
                        )}
                      </div>
                    )}
                    {editMode
                      ? <><button onClick={saveNote} style={{ ...ms.btn.primary, padding:'2px 8px', fontSize:'0.7rem', flexShrink:0 }}>Guardar</button><button onClick={() => { setEditMode(false); setShowColors(false); }} style={{ ...ms.btn.ghost, padding:'3px', flexShrink:0 }}><X size={13}/></button></>
                      : <button onClick={() => startEdit(active)} style={{ ...ms.btn.ghost, padding:'3px', flexShrink:0 }} title="Editar"><Edit3 size={13}/></button>
                    }
                    <button onClick={() => deleteNote(active.id)} style={{ ...ms.btn.ghost, padding:'3px', flexShrink:0 }}
                      onMouseEnter={e=>(e.currentTarget.style.color='var(--danger)')}
                      onMouseLeave={e=>(e.currentTarget.style.color='')}><Trash2 size={13}/></button>
                  </div>

                  {editMode
                    ? <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)}
                        placeholder={'Markdown...\n# Título\n**negrita** *cursiva* `código`\n- lista\n> cita'}
                        style={{ flex:1, resize:'none', border:'none', outline:'none', backgroundColor:'transparent', fontFamily:'var(--mono)', fontSize:'0.775rem', color:'var(--text)', lineHeight:1.6, padding:'0.625rem' }}
                        onKeyDown={e => { if (e.key==='Tab') { e.preventDefault(); const t=e.currentTarget,s=t.selectionStart,v=t.value; t.value=v.slice(0,s)+'  '+v.slice(t.selectionEnd); t.selectionStart=t.selectionEnd=s+2; setDraftContent(t.value); } }}
                      />
                    : <div style={{ flex:1, overflowY:'auto', padding:'0.625rem' }}>
                        {active.contenido ? renderMd(active.contenido) : <div style={{ ...ms.empty, fontSize:'0.75rem' }}>Vacía — click ✏️ para editar</div>}
                      </div>
                  }
                  <div style={{ padding:'0.25rem 0.625rem', borderTop:`1px solid ${curColor.border}`, flexShrink:0 }}>
                    <span style={{ ...ms.label, fontSize:'0.58rem' }}>{editMode ? `${draftContent.length} chars` : `Editado ${new Date(active.editado_en).toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`}</span>
                  </div>
                </>
              ) : (
                <div style={{ ...ms.empty, flex:1, flexDirection:'column', gap:'0.75rem' }}>
                  <StickyNote size={28} style={{ opacity:0.2 }}/>
                  <span style={{ fontSize:'0.8rem' }}>Selecciona una nota</span>
                  <button style={{ ...ms.btn.secondary, fontSize:'0.75rem', padding:'0.35rem 0.75rem' }} onClick={newNote}><Plus size={13}/> Nueva nota</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ padding:'0.25rem 0.75rem', borderTop:'1px solid var(--border)', backgroundColor:'var(--bg-raised)', flexShrink:0 }}>
            <span style={{ ...ms.label, fontSize:'0.58rem' }}>{notes ? notes.length : 0} nota{notes && notes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onMouseDown={onDragStart}
        onClick={toggleOpen}
        title="Notas rápidas"
        style={{
          position:'absolute', left:0, top:0,
          width:`${FAB_SIZE}px`, height:`${FAB_SIZE}px`,
          borderRadius:'22px',
          backgroundColor:open?'var(--bg-raised)':'var(--accent)',
          color:open?'var(--text-muted)':'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'grab', boxShadow:'var(--shadow-lg)', border:'none', pointerEvents:'auto',
        }}
      >
        {open ? <X size={22}/> : <StickyNote size={22}/>}
      </button>
    </>
  );
}

export const NotesOverlay: OverlayWidget = {
  id:'notes', name:'Notas', author:'lelardo', icon:<StickyNote size={20} />, component: NotesOverlayComponent, defaultCorner:'bottom-right',
  panelWidth: PANEL_W, panelHeight: PANEL_H,
  migrations: [{
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS quick_notes (
      id        SERIAL PRIMARY KEY,
      user_id   INTEGER NOT NULL,
      titulo    TEXT    NOT NULL DEFAULT 'Nueva nota',
      contenido TEXT    NOT NULL DEFAULT '',
      color     TEXT    NOT NULL DEFAULT 'Default',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      editado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notes_user ON quick_notes(user_id);`,
  }],
};