import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ZoomIn, ZoomOut, Calendar, ChevronLeft, ChevronRight, Target, Map } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import type { AppModule, ModuleProps } from '../../core/types/module';

interface Epic {
  id: number;
  nombre: string;
  start_index: number; // Índice absoluto de meses
  duration: number;
  progreso: number;
}

const RoadmapComponent = ({ db }: ModuleProps) => {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [zoom, setZoom] = useState(100);
  
  // Calcular el mes actual de forma absoluta (meses totales desde año 0 aprox)
  const now = new Date();
  const currentAbsMonth = now.getFullYear() * 12 + now.getMonth();
  
  // Estado para saber qué mes mostrar al principio del scroll
  const [viewStart, setViewStart] = useState(currentAbsMonth - 2); 

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setEpics(db.all<Epic>(`SELECT * FROM roadmap_epics ORDER BY id ASC`));
  };

  useEffect(() => { load(); }, [db]);

  const addEpic = () => {
    if (!newTitle.trim()) return;
    // Insertamos la épica iniciando en el mes que estamos viendo
    db.run(`INSERT INTO roadmap_epics (nombre, start_index, duration, progreso) 
            VALUES (?, ?, 3, 0)`, [newTitle, viewStart + 1]);
    setNewTitle('');
    load();
  };

  const updateEpic = (id: number, fields: Partial<Epic>) => {
    const keys = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(fields), id];
    db.run(`UPDATE roadmap_epics SET ${keys} WHERE id = ?`, values);
    load();
  };

  const deleteEpic = (id: number) => {
    if (confirm('¿Eliminar esta épica?')) {
      db.run(`DELETE FROM roadmap_epics WHERE id = ?`, [id]);
      load();
    }
  };

  // Función para formatear el header: "Ene 2024"
  const getMonthLabel = (absIndex: number) => {
    const year = Math.floor(absIndex / 12);
    const month = absIndex % 12;
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return { name: names[month], year };
  };

  return (
    <div style={{ ...ms.container, overflow: 'hidden' }}>
      <div style={{ ...ms.row, marginBottom: '1rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input 
            style={{ ...ms.input, flex: 1, maxWidth: '280px' }} 
            placeholder="Nueva Épica..." 
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addEpic()}
          />
          <button style={ms.btn.primary} onClick={addEpic}><Plus size={18} /></button>
          
          <div style={{ borderLeft: '1px solid var(--border)', marginLeft: '8px', paddingLeft: '8px', display: 'flex', gap: '4px' }}>
            <button style={ms.btn.ghost} onClick={() => setViewStart(v => v - 1)}><ChevronLeft size={18}/></button>
            <button 
              style={{ ...ms.btn.secondary, fontSize: '0.75rem', gap: '6px' }} 
              onClick={() => setViewStart(currentAbsMonth - 2)}
            >
              <Target size={14} /> Hoy
            </button>
            <button style={ms.btn.ghost} onClick={() => setViewStart(v => v + 1)}><ChevronRight size={18}/></button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-raised)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <ZoomOut size={14} style={{ color: 'var(--text-muted)' }} />
          <input type="range" min="60" max="250" value={zoom} onChange={e => setZoom(parseInt(e.target.value))} style={{ cursor: 'pointer', accentColor: 'var(--accent)' }} />
          <ZoomIn size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card)' }}>
        <div style={{ position: 'relative', minWidth: 'fit-content' }}>
          
          {/* Timeline Header */}
          <div style={{ display: 'flex', height: '45px', background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ width: '180px', borderRight: '1px solid var(--border)', background: 'var(--bg-raised)', position: 'sticky', left: 0, zIndex: 11 }}></div>
            {Array.from({ length: 18 }).map((_, i) => {
              const info = getMonthLabel(viewStart + i);
              const isCurrent = (viewStart + i) === currentAbsMonth;
              return (
                <div key={i} style={{ 
                  width: `${zoom}px`, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  borderRight: '1px solid var(--border-faint)', color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                  background: isCurrent ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{info.name}</span>
                  <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{info.year}</span>
                </div>
              );
            })}
          </div>

          {/* Filas */}
          {epics.map(epic => (
            <div key={epic.id} style={{ display: 'flex', height: '50px', borderBottom: '1px solid var(--border-faint)', alignItems: 'center' }}>
              <div style={{ width: '180px', height: '100%', padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: '2px solid var(--border)', background: 'var(--bg-card)', position: 'sticky', left: 0, zIndex: 5 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{epic.nombre}</span>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-faint)' }} onClick={() => deleteEpic(epic.id)}><Trash2 size={14} /></button>
              </div>

              <div style={{ position: 'relative', flex: 1, height: '100%', backgroundImage: `linear-gradient(to right, var(--border-faint) 1px, transparent 1px)`, backgroundSize: `${zoom}px 100%` }}>
                
                {/* Indicador de HOY (Línea vertical) */}
                {currentAbsMonth >= viewStart && (
                  <div style={{ 
                    position: 'absolute', left: `${(currentAbsMonth - viewStart) * zoom}px`, 
                    width: '2px', height: '100%', background: 'var(--accent)', opacity: 0.3, zIndex: 1 
                  }} />
                )}

                {/* Barra de la Épica */}
                <div style={{
                  position: 'absolute',
                  left: `${(epic.start_index - viewStart) * zoom + 4}px`,
                  width: `${epic.duration * zoom - 8}px`,
                  top: '10px', height: '30px',
                  background: 'linear-gradient(90deg, var(--accent) 0%, #6366f1 100%)',
                  borderRadius: '6px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', padding: '0 6px', gap: '4px', color: '#fff', zIndex: 2,
                  transition: 'left 0.3s ease, width 0.3s ease'
                }}>
                  <button style={ctrlBtn} onClick={() => updateEpic(epic.id, { start_index: epic.start_index - 1 })}><ChevronLeft size={12}/></button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => updateEpic(epic.id, { progreso: (epic.progreso + 20) % 120 })}>
                    {epic.progreso}%
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button style={ctrlBtn} onClick={() => updateEpic(epic.id, { duration: Math.max(1, epic.duration - 1) })}>-</button>
                    <button style={ctrlBtn} onClick={() => updateEpic(epic.id, { duration: epic.duration + 1 })}>+</button>
                    <button style={ctrlBtn} onClick={() => updateEpic(epic.id, { start_index: epic.start_index + 1 })}><ChevronRight size={12}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ctrlBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
  width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '4px', cursor: 'pointer'
};

export const RoadmapModule: AppModule = {
  id: 'mod-roadmap',
  name: 'Roadmap',
  description: 'Timeline con años y meses',
  author: 'lelardo',
  icon: <Map size={20} />,
  component: RoadmapComponent,
  layout: { defaultCols: 12, defaultRows: 6, isMinimizable: true, canExpandFull: true },
  migrations: [{
    version: 4, 
    sql: `CREATE TABLE IF NOT EXISTS roadmap_epics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      start_index INTEGER DEFAULT 0,
      duration INTEGER DEFAULT 3,
      progreso INTEGER DEFAULT 0
    );`
  }]
};