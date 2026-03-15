// src/App.tsx
import { useEffect } from 'react';
import './App.css';
import { AuthGate }      from './core/components/AuthGate';
import { Sidebar }       from './core/components/Sidebar';
import { Taskbar }       from './core/components/Taskbar';
import { Dashboard }     from './core/components/Dashboard';
import { OverlayLayer }  from './core/overlay/OverlayLayer';
import { moduleActions } from './core/store/useModuleStore';

let _opened = false;
function openDefaults() {
  if (_opened) return;
  _opened = true;
  moduleActions.open('kanban');
  moduleActions.open('demo');
}

function App() {
  useEffect(() => { openDefaults(); }, []);
  return (
    <AuthGate>
      <div className="app-root">
        <Sidebar />
        <div className="app-main">
          <Taskbar />
          <Dashboard />
        </div>
      </div>
      {/* Overlays se renderizan en un portal sobre toda la UI */}
      <OverlayLayer />
    </AuthGate>
  );
}

export default App;