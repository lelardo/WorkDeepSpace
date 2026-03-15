// src/App.tsx
import { useEffect } from 'react';
import './App.css';
import { AuthGate }      from './core/components/AuthGate';
import { Sidebar }       from './core/components/Sidebar';
import { Taskbar }       from './core/components/Taskbar';
import { Dashboard }     from './core/components/Dashboard';
import { OverlayLayer }  from './core/overlay/OverlayLayer';
import { moduleActions } from './core/store/useModuleStore';

function App() {
  useEffect(() => {
    // Solo abre defaults si el usuario nunca tuvo módulos guardados
    if (!moduleActions.hasSavedState()) {
      moduleActions.open('kanban');
      moduleActions.open('demo');
    }
  }, []);

  return (
    <AuthGate>
      <div className="app-root">
        <Sidebar />
        <div className="app-main">
          <Taskbar />
          <Dashboard />
        </div>
      </div>
      <OverlayLayer />
    </AuthGate>
  );
}

export default App;