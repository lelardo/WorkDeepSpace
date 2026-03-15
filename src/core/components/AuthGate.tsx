// src/core/components/AuthGate.tsx
//
// Wrapper que decide si mostrar Login/Registro o la app completa.
// También restaura la sesión desde localStorage al montar.

import { useState, useEffect } from 'react';
import { useSession } from '../auth/authStore';
import { useDb } from '../db/useDb';
import { restoreSession } from '../auth/authService';
import { LoginView }    from './LoginView';
import { RegisterView } from './RegisterView';

type AuthView = 'login' | 'register';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const { db, loading } = useDb();
  const [view, setView] = useState<AuthView>('login');
  const [restored, setRestored] = useState(false);

  // Intenta restaurar sesión guardada una vez que la BD esté lista
  useEffect(() => {
    if (!loading && db && !restored) {
      restoreSession(db);
      setRestored(true);
    }
  }, [db, loading, restored]);

  if (loading || !restored) {
    return (
      <div style={{
        height: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg)', color: 'var(--text-faint)',
        fontFamily: 'var(--sans)', fontSize: '0.875rem', gap: '0.75rem',
        flexDirection: 'column',
      }}>
        <span style={{ fontSize: '2rem', opacity: 0.25 }}>⬡</span>
        <span>Iniciando…</span>
      </div>
    );
  }

  if (!session) {
    return view === 'login'
      ? <LoginView    db={db} onSwitch={() => setView('register')} />
      : <RegisterView db={db} onSwitch={() => setView('login')}    />;
  }

  return <>{children}</>;
}