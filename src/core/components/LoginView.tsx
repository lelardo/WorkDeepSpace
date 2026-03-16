// src/core/components/LoginView.tsx
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '../auth/authService';
import type { DbApi } from '../db/types';

export function LoginView({ db, onSwitch }: { db: DbApi; onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    const result = await login(db, username, password);
    setLoading(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div style={authLayout}>
      <div style={authCard}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/icon.png" alt="WorkDeepSpace" style={{ width: '3rem', height: '3rem', marginBottom: '0.5rem' }} />
          <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            WorkDeepSpace
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Inicia sesión para continuar
          </p>
        </div>

        {/* Campos */}
        <div style={fieldGroup}>
          <label style={fieldLabel}>Usuario</label>
          <input
            autoFocus
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="tu_usuario"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {/* Botón */}
        <button
          onClick={handleSubmit}
          disabled={loading || !username || !password}
          style={{
            ...btnStyle,
            opacity: (loading || !username || !password) ? 0.5 : 1,
            cursor: (loading || !username || !password) ? 'not-allowed' : 'pointer',
          }}
        >
          <LogIn size={16} />
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        {/* Switch */}
        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: 'var(--sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <button onClick={onSwitch} style={linkBtn}>Regístrate</button>
        </p>
      </div>
    </div>
  );
}

// ── Estilos compartidos ────────────────────────────────
const authLayout: React.CSSProperties = {
  height: '100vh', width: '100vw',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'var(--bg)',
  fontFamily: 'var(--sans)',
};

const authCard: React.CSSProperties = {
  width: '100%', maxWidth: '360px',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-lg)',
  padding: '2rem 2rem 1.5rem',
  boxShadow: 'var(--shadow-lg)',
};

const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem',
};

const fieldLabel: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--text-faint)',
};

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'border-color 0.15s',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  padding: '0.625rem',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--primary)',
  color: '#fff',
  fontFamily: 'var(--sans)',
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  marginTop: '0.25rem',
};

const errorStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--danger-bg)',
  color: 'var(--danger)',
  fontSize: '0.8125rem',
  fontFamily: 'var(--sans)',
  marginBottom: '0.75rem',
  border: '1px solid var(--danger)',
};

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  color: 'var(--primary)', fontFamily: 'var(--sans)',
  fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 600,
};