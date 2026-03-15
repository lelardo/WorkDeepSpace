// src/modules/kanban/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import type { AppModule, ModuleProps } from '../../core/types/module';

type Status = 'todo' | 'in_progress' | 'done';
interface Task { id: number; title: string; status: Status; position: number; }

const COLUMNS: { status: Status; label: string; badge: 'default'|'warning'|'success' }[] = [
  { status: 'todo',        label: 'To Do',       badge: 'default'  },
  { status: 'in_progress', label: 'In Progress',  badge: 'warning'  },
  { status: 'done',        label: 'Done',         badge: 'success'  },
];

const KanbanComponent = ({ db }: ModuleProps) => {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [input,    setInput]    = useState('');
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [dragging, setDragging] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);

  const load = useCallback(() => {
    const rows = db.all<Task>('SELECT id, title, status, position FROM kanban_tasks ORDER BY position ASC');
    setTasks(rows);
  }, [db]);

  useEffect(() => { load(); }, [load]);

  const addTask = (status: Status) => {
    const title = input.trim();
    if (!title) return;
    const maxPos = tasks.filter(t => t.status === status).reduce((m, t) => Math.max(m, t.position), -1);
    db.run('INSERT INTO kanban_tasks (title, status, position) VALUES (?, ?, ?)', [title, status, maxPos + 1]);
    setInput(''); setAddingTo(null); load();
  };

  const deleteTask = (id: number) => { db.run('DELETE FROM kanban_tasks WHERE id = ?', [id]); load(); };

  const moveTask = (task: Task, newStatus: Status) => {
    if (task.status === newStatus) return;
    const maxPos = tasks.filter(t => t.status === newStatus).reduce((m, t) => Math.max(m, t.position), -1);
    db.run('UPDATE kanban_tasks SET status = ?, position = ? WHERE id = ?', [newStatus, maxPos + 1, task.id]);
    load();
  };

  const byStatus = (s: Status) => tasks.filter(t => t.status === s);

  return (
    <div style={{ ...ms.container, flexDirection: 'row', padding: '0.625rem', gap: '0.625rem', overflow: 'hidden' }}>
      {COLUMNS.map(col => {
        const colTasks = byStatus(col.status);
        const isOver   = dragOver === col.status;
        return (
          <div key={col.status} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            borderRadius: 'var(--radius)', minHeight: 0,
            border: `1.5px solid ${isOver ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: isOver ? 'var(--primary-bg)' : 'var(--bg-raised)',
            overflow: 'hidden', transition: 'border-color 0.15s, background-color 0.15s',
          }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
            onDrop={() => { if (dragging) moveTask(dragging, col.status); setDragging(null); setDragOver(null); }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.45rem 0.625rem', borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)', flexShrink: 0,
            }}>
              <span style={ms.label}>{col.label}</span>
              <span style={ms.badge(col.badge)}>{colTasks.length}</span>
            </div>

            {/* Tasks list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {colTasks.length === 0 && addingTo !== col.status && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-faint)', fontSize: '0.72rem', fontStyle: 'italic', minHeight: '2rem' }}>
                  drop here
                </div>
              )}
              {colTasks.map(task => (
                <div key={task.id} draggable
                  onDragStart={() => setDragging(task)}
                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  style={{ ...ms.card, display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.45rem 0.4rem', cursor: 'grab', flexShrink: 0,
                    opacity: dragging?.id === task.id ? 0.3 : 1, transition: 'opacity 0.15s',
                  }}
                >
                  <GripVertical size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                  <span style={{ ...ms.body, flex: 1, fontSize: '0.8rem', lineHeight: 1.35 }}>{task.title}</span>
                  <button onClick={() => deleteTask(task.id)}
                    style={{ ...ms.btn.ghost, padding: '2px', flexShrink: 0, color: 'var(--text-faint)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                  ><Trash2 size={12} /></button>
                </div>
              ))}
            </div>

            {/* Footer add */}
            <div style={{ padding: '0.35rem 0.4rem', borderTop: '1px solid var(--border)', flexShrink: 0, backgroundColor: 'var(--bg-card)' }}>
              {addingTo === col.status ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <input autoFocus type="text" value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTask(col.status); if (e.key === 'Escape') { setAddingTo(null); setInput(''); } }}
                    placeholder="Task title…"
                    style={{ ...ms.input, fontSize: '0.78rem', padding: '0.3rem 0.45rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button style={{ ...ms.btn.primary, flex: 1, fontSize: '0.72rem', padding: '0.25rem' }} onClick={() => addTask(col.status)}>Add</button>
                    <button style={{ ...ms.btn.secondary, fontSize: '0.72rem', padding: '0.25rem 0.4rem' }} onClick={() => { setAddingTo(null); setInput(''); }}>✕</button>
                  </div>
                </div>
              ) : (
                <button style={{ ...ms.btn.ghost, width: '100%', justifyContent: 'flex-start',
                  gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-faint)', padding: '0.25rem' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                  onClick={() => setAddingTo(col.status)}
                ><Plus size={12} /> Add task</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const KanbanModule: AppModule = {
  id: 'kanban', name: 'Kanban', description: 'Task board with drag & drop', icon: '📋',
  component: KanbanComponent,
  layout: { defaultCols: 6, defaultRows: 4, isMinimizable: true, canExpandFull: true },
  migrations: [{
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS kanban_tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL,
        status     TEXT    NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
        position   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_kanban_status ON kanban_tasks(status);
    `,
  }],
};