// src/core/components/Sidebar.tsx
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme }       from '../context/ThemeContext';
import { useModuleStore } from '../store/useModuleStore';
import { Registry }       from '../registry/index';
import { useSession, sessionActions } from '../auth/authStore';
import { useOverlayStore } from '../overlay/overlayStore';
import { OverlayRegistry } from '../overlay/overlayRegistry';

export function Sidebar() {
  const { dark, toggle } = useTheme();
  const store    = useModuleStore();
  const session  = useSession();
  const oStore   = useOverlayStore();
  const overlays = OverlayRegistry.all();

  const isOpen = (id: string) => store.entries.some(e => e.id === id);
  const isMini = (id: string) => store.entries.some(e => e.id === id && e.state === 'minimized');

  const handleModuleClick = (id: string) => {
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
            <div className="sidebar-title">WorkDeepSpace</div>
            <div className="sidebar-version">v0.1.0</div>
          </div>
        </div>

        {/* Usuario */}
        {session && (
          <div style={{ padding:'0.5rem 0.875rem 0.625rem', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'0.625rem' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', backgroundColor:'var(--accent-bg)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, flexShrink:0, border:'1.5px solid var(--accent)' }}>
              {session.user.display_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text)', fontFamily:'var(--sans)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {session.user.display_name}
              </div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-faint)', fontFamily:'var(--sans)' }}>
                @{session.user.username}
              </div>
            </div>
          </div>
        )}

        <div className="sidebar-divider" />

        {/* ── Módulos ── */}
        <div className="sidebar-section-label">Módulos</div>
        <nav className="sidebar-nav">
          {Registry.all().map(mod => {
            const open = isOpen(mod.id);
            const mini = isMini(mod.id);
            return (
              <button key={mod.id}
                className={`sidebar-item ${open ? (mini ? 'sidebar-item--mini' : 'sidebar-item--active') : ''}`}
                onClick={() => handleModuleClick(mod.id)}
                title={mod.description}
              >
                <span className="sidebar-item-icon">{mod.icon}</span>
                <span className="sidebar-item-name">{mod.name}</span>
                {open && <span className={`sidebar-item-dot${mini ? ' sidebar-item-dot--mini':''}`}/>}
              </button>
            );
          })}
        </nav>

        {/* ── Overlays ── */}
        {overlays.length > 0 && (
          <>
            <div className="sidebar-divider" style={{ margin:'0.375rem 0.875rem' }}/>
            <div className="sidebar-section-label">Widgets flotantes</div>
            <nav className="sidebar-nav">
              {overlays.map(overlay => {
                const active = oStore.isActive(overlay.id);
                return (
                  <button key={overlay.id}
                    className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
                    onClick={() => oStore.toggle(overlay.id)}
                    title={active ? 'Click para desactivar' : 'Click para activar'}
                  >
                    <span className="sidebar-item-icon">{overlay.icon ?? '🧩'}</span>
                    <span className="sidebar-item-name">{overlay.name ?? overlay.id}</span>
                    {/* Toggle pill */}
                    <span style={{
                      fontSize:'0.6rem', fontFamily:'var(--mono)',
                      padding:'1px 5px', borderRadius:'999px',
                      backgroundColor: active ? 'var(--accent-bg)' : 'var(--border)',
                      color: active ? 'var(--accent)' : 'var(--text-faint)',
                      flexShrink: 0,
                    }}>
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </nav>
          </>
        )}

        {/* Footer */}
        <div className="sidebar-footer" style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
          <button className="sidebar-theme-btn" onClick={toggle}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          {session && (
            <button className="sidebar-theme-btn" onClick={() => sessionActions.logout()}
              style={{ color:'var(--danger)', borderColor:'var(--danger-bg)' }}
              onMouseEnter={e=>{e.currentTarget.style.backgroundColor='var(--danger-bg)';}}
              onMouseLeave={e=>{e.currentTarget.style.backgroundColor='transparent';}}>
              <LogOut size={14}/><span>Cerrar sesión</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}