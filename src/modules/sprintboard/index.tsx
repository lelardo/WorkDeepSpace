// src/modules/sprint/index.tsx
//
// Sprint Board — diferente al Kanban en que:
//   • Las tareas tienen puntos de historia (1,2,3,5,8,13)
//   • Hay un sprint activo con fecha de inicio/fin
//   • Muestra burndown: puntos completados vs total
//   • Las tareas van por: Backlog → Sprint → Doing → Review → Done
//   • El Backlog es el pool de donde se jala al sprint actual

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, Flame, Target, Zap } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import type { AppModule, ModuleProps } from '../../core/types/module';

type Status = 'backlog' | 'sprint' | 'doing' | 'review' | 'done';

interface Task {
  id:      number;
  titulo:  string;
  puntos:  number;
  status:  Status;
  sprint_id: number | null;
}

interface Sprint {
  id:         number;
  nombre:     string;
  inicio:     string;
  fin:        string;
  activo:     number;  // 1 = activo
}

const FIBONACCI = [1, 2, 3, 5, 8, 13];

const BOARD_COLS: { id: Status; label: string; color: string }[] = [
  { id: 'sprint',  label: 'To Do',    color: 'var(--text-faint)'  },
  { id: 'doing',   label: 'Doing',    color: 'var(--warning)'     },
  { id: 'review',  label: 'Review',   color: 'var(--primary)'     },
  { id: 'done',    label: 'Done',     color: 'var(--success)'     },
];

const SprintComponent = ({ db }: ModuleProps) => {
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [sprint,       setSprint]       = useState<Sprint | null>(null);
  const [view,         setView]         = useState<'board' | 'backlog'>('board');
  const [newTitle,     setNewTitle]     = useState('');
  const [newPoints,    setNewPoints]    = useState(2);
  const [newSprint,    setNewSprint]    = useState('');
  const [draggedTask,  setDraggedTask]  = useState<Task | null>(null);
  const [dragOverCol,  setDragOverCol]  = useState<Status | null>(null);

  const load = useCallback(() => {
    setTasks(db.all<Task>('SELECT * FROM sprint_tasks ORDER BY id ASC'));
    const s = db.get<Sprint>('SELECT * FROM sprints WHERE activo = 1 LIMIT 1');
    setSprint(s ?? null);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  // ── Sprint management ──────────────────────────────
  const createSprint = () => {
    if (!newSprint.trim()) return;
    // Desactiva sprint anterior
    db.run('UPDATE sprints SET activo = 0');
    const today = new Date();
    const end   = new Date(today); end.setDate(end.getDate() + 14);
    const id = db.run(
      "INSERT INTO sprints (nombre, inicio, fin, activo) VALUES (?,?,?,1)",
      [newSprint.trim(), today.toISOString().slice(0,10), end.toISOString().slice(0,10)]
    );
    setNewSprint('');
    load();
  };

  const endSprint = () => {
    if (!sprint) return;
    // Mueve tareas no-done de vuelta al backlog
    db.run("UPDATE sprint_tasks SET status='backlog', sprint_id=NULL WHERE status != 'done' AND sprint_id=?", [sprint.id]);
    db.run('UPDATE sprints SET activo=0 WHERE id=?', [sprint.id]);
    load();
  };

  // ── Task management ────────────────────────────────
  const addToBacklog = () => {
    if (!newTitle.trim()) return;
    db.run(
      "INSERT INTO sprint_tasks (titulo, puntos, status, sprint_id) VALUES (?,?,'backlog',NULL)",
      [newTitle.trim(), newPoints]
    );
    setNewTitle('');
    load();
  };

  const pullToSprint = (task: Task) => {
    if (!sprint) return;
    db.run("UPDATE sprint_tasks SET status='sprint', sprint_id=? WHERE id=?", [sprint.id, task.id]);
    load();
  };

  const moveTask = (task: Task, newStatus: Status) => {
    if (task.status === newStatus) return;
    db.run('UPDATE sprint_tasks SET status=? WHERE id=?', [newStatus, task.id]);
    load();
  };

  const deleteTask = (id: number) => {
    db.run('DELETE FROM sprint_tasks WHERE id=?', [id]);
    load();
  };

  // ── Stats ──────────────────────────────────────────
  const sprintTasks = tasks.filter(t => t.sprint_id === sprint?.id);
  const totalPts    = sprintTasks.reduce((s,t) => s+t.puntos, 0);
  const donePts     = sprintTasks.filter(t=>t.status==='done').reduce((s,t)=>s+t.puntos,0);
  const pct         = totalPts > 0 ? Math.round((donePts/totalPts)*100) : 0;
  const backlogCount = tasks.filter(t=>t.status==='backlog').length;

  // Días restantes del sprint
  const daysLeft = sprint
    ? Math.max(0, Math.ceil((new Date(sprint.fin).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div style={{ ...ms.container, gap:'0.625rem' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexShrink:0, flexWrap:'wrap' }}>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:'2px', backgroundColor:'var(--bg-raised)', borderRadius:'var(--radius-sm)', padding:'2px' }}>
          {(['board','backlog'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ ...ms.btn.ghost, padding:'3px 10px', fontSize:'0.75rem', borderRadius:'var(--radius-sm)',
                backgroundColor: view===v ? 'var(--bg-card)' : 'transparent',
                color: view===v ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: view===v ? 'var(--shadow-sm)' : 'none',
              }}>
              {v === 'board' ? 'Board' : `Backlog (${backlogCount})`}
            </button>
          ))}
        </div>

        {/* Sprint info o crear sprint */}
        {sprint ? (
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flex:1, flexWrap:'wrap' }}>
            <span style={{ ...ms.badge('info') }}>
              <Flame size={10} style={{ marginRight:'3px' }}/>{sprint.nombre}
            </span>
            <span style={{ ...ms.label, fontSize:'0.6rem' }}>{daysLeft}d restantes</span>

            {/* Burndown pill */}
            <div style={{ flex:1, maxWidth:'160px', display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ flex:1, height:'6px', backgroundColor:'var(--border)', borderRadius:'999px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, backgroundColor:'var(--success)', borderRadius:'999px', transition:'width 0.3s ease' }}/>
              </div>
              <span style={{ ...ms.mono, fontSize:'0.65rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                {donePts}/{totalPts}pt
              </span>
            </div>

            <button onClick={endSprint} style={{ ...ms.btn.secondary, fontSize:'0.7rem', padding:'2px 8px' }}>
              Cerrar sprint
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:'0.375rem', flex:1 }}>
            <input value={newSprint} onChange={e=>setNewSprint(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&createSprint()}
              placeholder="Nombre del sprint (ej: Sprint 1)…"
              style={{ ...ms.input, flex:1, fontSize:'0.8rem' }}/>
            <button style={ms.btn.primary} onClick={createSprint}>
              <Zap size={14}/> Iniciar
            </button>
          </div>
        )}
      </div>

      {/* ── VISTA: BACKLOG ── */}
      {view === 'backlog' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.5rem', minHeight:0 }}>

          {/* Añadir a backlog */}
          <div style={{ display:'flex', gap:'0.375rem', flexShrink:0 }}>
            <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addToBacklog()}
              placeholder="Historia de usuario…"
              style={{ ...ms.input, flex:1 }}/>
            {/* Selector de puntos fibonacci */}
            <div style={{ display:'flex', gap:'2px' }}>
              {FIBONACCI.map(p => (
                <button key={p} onClick={() => setNewPoints(p)}
                  style={{ ...ms.btn.ghost, padding:'4px 6px', fontSize:'0.75rem',
                    backgroundColor: newPoints===p ? 'var(--primary)' : 'var(--bg-raised)',
                    color: newPoints===p ? '#fff' : 'var(--text-muted)',
                    borderRadius:'var(--radius-sm)', border:'1px solid var(--border)',
                  }}>{p}</button>
              ))}
            </div>
            <button style={ms.btn.primary} onClick={addToBacklog}><Plus size={16}/></button>
          </div>

          {/* Lista backlog */}
          <div style={{ ...ms.list }}>
            {tasks.filter(t=>t.status==='backlog').length === 0
              ? <div style={ms.empty}>El backlog está vacío</div>
              : tasks.filter(t=>t.status==='backlog').map(t => (
                <div key={t.id} style={{ ...ms.card, display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <span style={{ ...ms.badge('default'), fontFamily:'var(--mono)', minWidth:'28px', justifyContent:'center' }}>
                    {t.puntos}
                  </span>
                  <span style={{ ...ms.body, flex:1, fontSize:'0.8125rem' }}>{t.titulo}</span>
                  {sprint && (
                    <button onClick={() => pullToSprint(t)}
                      style={{ ...ms.btn.ghost, padding:'3px', color:'var(--primary)', fontSize:'0.7rem', display:'flex', alignItems:'center', gap:'3px' }}
                      title="Añadir al sprint activo">
                      <ChevronRight size={14}/> Sprint
                    </button>
                  )}
                  <button onClick={() => deleteTask(t.id)}
                    style={{ ...ms.btn.ghost, padding:'3px', flexShrink:0 }}
                    onMouseEnter={e=>(e.currentTarget.style.color='var(--danger)')}
                    onMouseLeave={e=>(e.currentTarget.style.color='')}><Trash2 size={13}/></button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── VISTA: BOARD ── */}
      {view === 'board' && (
        <>
          {!sprint ? (
            <div style={{ ...ms.empty, flex:1 }}>
              <Target size={32} style={{ opacity:0.2 }}/>
              <span>Inicia un sprint para ver el board</span>
            </div>
          ) : (
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'0.625rem', minHeight:0, overflow:'hidden' }}>
              {BOARD_COLS.map(col => {
                const colTasks = sprintTasks.filter(t => t.status === col.id);
                const isOver   = dragOverCol === col.id;
                const colPts   = colTasks.reduce((s,t)=>s+t.puntos,0);

                return (
                  <div key={col.id}
                    style={{ display:'flex', flexDirection:'column', borderRadius:'var(--radius)', overflow:'hidden', minHeight:0,
                      border:`1.5px solid ${isOver ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: isOver ? 'var(--primary-bg)' : 'var(--bg-raised)',
                      transition:'border-color 0.15s, background-color 0.15s',
                    }}
                    onDragOver={e=>{e.preventDefault();setDragOverCol(col.id);}}
                    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragOverCol(null);}}
                    onDrop={()=>{if(draggedTask)moveTask(draggedTask,col.id);setDraggedTask(null);setDragOverCol(null);}}
                  >
                    {/* Col header */}
                    <div style={{ padding:'0.45rem 0.625rem', borderBottom:'1px solid var(--border)', backgroundColor:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                        <div style={{ width:'7px', height:'7px', borderRadius:'50%', backgroundColor:col.color }}/>
                        <span style={ms.label}>{col.label}</span>
                      </div>
                      <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                        <span style={{ ...ms.mono, fontSize:'0.6rem', color:'var(--text-faint)' }}>{colPts}pt</span>
                        <span style={ms.badge('default')}>{colTasks.length}</span>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div style={{ flex:1, overflowY:'auto', padding:'0.4rem', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
                      {colTasks.length === 0 && (
                        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-faint)', fontSize:'0.72rem', fontStyle:'italic', minHeight:'2.5rem' }}>
                          drop here
                        </div>
                      )}
                      {colTasks.map(task => (
                        <div key={task.id} draggable
                          onDragStart={()=>setDraggedTask(task)}
                          onDragEnd={()=>{setDraggedTask(null);setDragOverCol(null);}}
                          style={{ ...ms.card, display:'flex', alignItems:'flex-start', gap:'0.375rem', padding:'0.5rem', cursor:'grab', flexShrink:0,
                            opacity: draggedTask?.id===task.id ? 0.3 : 1,
                          }}
                        >
                          {/* Puntos */}
                          <span style={{ ...ms.badge('info'), fontFamily:'var(--mono)', fontSize:'0.62rem', flexShrink:0, marginTop:'1px' }}>
                            {task.puntos}
                          </span>
                          <span style={{ ...ms.body, flex:1, fontSize:'0.8rem', lineHeight:1.35 }}>{task.titulo}</span>
                          <button onClick={()=>deleteTask(task.id)}
                            style={{ ...ms.btn.ghost, padding:'1px', flexShrink:0 }}
                            onMouseEnter={e=>(e.currentTarget.style.color='var(--danger)')}
                            onMouseLeave={e=>(e.currentTarget.style.color='')}><Trash2 size={11}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const SprintModule: AppModule = {
  id:          'mod-sprint',
  name:        'Sprint Board',
  description: 'Backlog · Sprint · Burndown',
  icon:        '⚡',
  component:   SprintComponent,
  layout: {
    defaultCols:   6,
    defaultRows:   4,
    isMinimizable: true,
    canExpandFull: true,
  },
  migrations: [
    {
      version: 1,
      sql: `
        CREATE TABLE IF NOT EXISTS sprints (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre  TEXT    NOT NULL,
          inicio  TEXT    NOT NULL,
          fin     TEXT    NOT NULL,
          activo  INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sprint_tasks (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo    TEXT    NOT NULL,
          puntos    INTEGER NOT NULL DEFAULT 1,
          status    TEXT    NOT NULL DEFAULT 'backlog',
          sprint_id INTEGER REFERENCES sprints(id)
        );
      `,
    },
  ],
};