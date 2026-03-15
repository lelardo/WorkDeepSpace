import { useState } from 'react';
import { ListTodo, Plus, Layers, Hash, ChevronUp, ChevronDown, X } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import { useModuleData } from '../../core/hooks/useModuleData';
import type { AppModule, ModuleProps } from '../../core/types/module';

interface BacklogItem extends Record<string, unknown> {
  id: number;
  titulo: string;
  epica: string;
  puntos: number;
  estado: 'backlog' | 'ready' | 'doing' | 'done';
  prioridad: number;
}

const BacklogModuleComponent = ({ db }: ModuleProps) => {
  const { data: items, reload } = useModuleData<BacklogItem>(
    db,
    'SELECT * FROM backlog_items ORDER BY prioridad DESC, id DESC'
  );
  const [newTitle, setNewTitle] = useState('');

  const addItem = async () => {
    if (!newTitle.trim() || !db) return;
    await db.run(
      'INSERT INTO backlog_items (titulo, epica, puntos, estado, prioridad) VALUES ($1, $2, $3, $4, $5)',
      [newTitle, 'General', 0, 'backlog', 0]
    );
    setNewTitle('');
    await reload();
  };

  const updatePoints = async (id: number, pts: number) => {
    if (!db) return;
    await db.run('UPDATE backlog_items SET puntos = $1 WHERE id = $2', [pts, id]);
    await reload();
  };

  const changePriority = async (id: number, current: number, delta: number) => {
    if (!db) return;
    await db.run('UPDATE backlog_items SET prioridad = $1 WHERE id = $2', [current + delta, id]);
    await reload();
  };

  const deleteItem = async (id: number) => {
    if (!db || !confirm('¿Eliminar esta historia?')) return;
    await db.run('DELETE FROM backlog_items WHERE id = $1', [id]);
    await reload();
  };

  return (
    <div style={ms.container}>
      {/* Input de nueva historia */}
      <div style={{ ...ms.row, marginBottom: '1.5rem' }}>
        <input
          style={{ ...ms.input, flex: 1 }}
          placeholder="¿Qué historia de usuario sigue?..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button style={ms.btn.primary} onClick={addItem}>
          <Plus size={18} />
          <span>Añadir</span>
        </button>
      </div>

      <span style={ms.label}>Cola de Prioridad</span>
      
      <div style={ms.list}>
        {items.length === 0 ? (
          <div style={ms.empty}>No hay historias pendientes en el backlog.</div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ ...ms.card, marginBottom: '0.75rem', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* Info Principal */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p style={{ ...ms.title, margin: 0 }}>{item.titulo}</p>
                    <span style={ms.badge(item.estado === 'backlog' ? 'default' : 'info')}>
                      {item.estado}
                    </span>
                  </div>
                  
                  <div style={{ ...ms.row, marginTop: '0.5rem', gap: '1.5rem' }}>
                    <div style={{ ...ms.muted, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                      <Layers size={14} /> {item.epica}
                    </div>
                    <div style={{ ...ms.muted, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                      <Hash size={14} /> {item.puntos || 0} Story Points
                    </div>
                  </div>
                </div>

                {/* Acciones de Edición Rápida */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Selector Fibonacci */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 5, 8].map(p => (
                      <button
                        key={p}
                        onClick={() => updatePoints(item.id, p)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '4px',
                          border: '1px solid var(--border)',
                          fontSize: '0.7rem', cursor: 'pointer',
                          backgroundColor: item.puntos === p ? 'var(--accent)' : 'transparent',
                          color: item.puntos === p ? '#fff' : 'var(--text-muted)'
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Priorización */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button style={ms.btn.ghost} onClick={() => changePriority(item.id, item.prioridad, 1)}>
                      <ChevronUp size={16} />
                    </button>
                    <button style={ms.btn.ghost} onClick={() => changePriority(item.id, item.prioridad, -1)}>
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Eliminar */}
                  <button 
                    style={{ ...ms.btn.ghost, color: 'var(--danger)' }}
                    onClick={() => deleteItem(item.id)}
                    title="Eliminar historia"
                  >
                    <X size={16} />
                  </button>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Descriptor del Módulo
export const BacklogModule: AppModule = {
  id: 'mod-backlog',
  name: 'Backlog',
  description: 'Priorización de Historias de Usuario',
  author: 'lelardo',
  icon: <ListTodo size={20} />,
  component: BacklogModuleComponent,

  layout: {
    defaultCols: 6, // Un poco más ancho para ver bien las columnas
    defaultRows: 6,
    isMinimizable: true,
    canExpandFull: true,
  },

  migrations: [
    {
      version: 1,
      sql: `
        CREATE TABLE IF NOT EXISTS backlog_items (
          id        SERIAL PRIMARY KEY,
          titulo    TEXT    NOT NULL,
          epica     TEXT    DEFAULT 'General',
          puntos    INTEGER DEFAULT 0,
          estado    TEXT    DEFAULT 'backlog',
          prioridad INTEGER DEFAULT 0,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
    }
  ]
};