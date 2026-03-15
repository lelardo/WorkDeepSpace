// src/core/components/Sidebar.tsx
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useModuleStore } from '../store/useModuleStore';
import { Registry } from '../registry/index';
import { useSession, sessionActions } from '../auth/authStore';

export function Sidebar() {
  const { dark, toggle } = useTheme();
  const store   = useModuleStore();
  const session = useSession();

  const isOpen = (id: string) => store.entries.some(e => e.id === id);
  const isMini = (id: string) => store.entries.some(e => e.id === id && e.state === 'minimized');

  const handleClick = (id: string) => {
    if (!isOpen(id))  { store.open(id); return; }
    if (isMini(id))   { store.restore(id); return; }
    store.minimize(id);
  };

  return (
    <>
      <div className="sidebar-trigger" />
      <aside className="sidebar-panel">

        {/* Header */}
        <div className="sidebar-header">
          <span className="sidebar-logo">⬡</span>
          <div>
            <div className="sidebar-title">Workspace</div>
            <div className="sidebar-version">v0.1.0</div>
          </div>
        </div>

        {/* Usuario activo */}
        {session && (
          <div style={{
            padding: '0.5rem 0.875rem 0.625rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}>
            {/* Avatar inicial */}
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              border: '1.5px solid var(--accent)',
            }}>
              {session.user.display_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.user.display_name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'var(--sans)' }}>
                @{session.user.username}
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-divider" style={{ margin: '0 0.875rem' }} />
        <div className="sidebar-section-label">Modules</div>

        <nav className="sidebar-nav">
          {Registry.all().map(mod => {
            const open = isOpen(mod.id);
            const mini = isMini(mod.id);
            return (
              <button key={mod.id}
                className={`sidebar-item ${open ? (mini ? 'sidebar-item--mini' : 'sidebar-item--active') : ''}`}
                onClick={() => handleClick(mod.id)} title={mod.description}
              >
                <span className="sidebar-item-icon">{mod.icon}</span>
                <span className="sidebar-item-name">{mod.name}</span>
                {open && <span className={`sidebar-item-dot${mini ? ' sidebar-item-dot--mini' : ''}`} />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <button className="sidebar-theme-btn" onClick={toggle}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          {session && (
            <button
              className="sidebar-theme-btn"
              onClick={() => sessionActions.logout()}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--danger-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <LogOut size={14}/>
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}