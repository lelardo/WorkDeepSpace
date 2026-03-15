// src/core/components/RegisterView.tsx
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { register } from '../auth/authService';
import type { DbApi } from '../db/types';

export function RegisterView({ db, onSwitch }: { db: DbApi; onSwitch: () => void }) {
  const [username,    setUsername]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password,    setPassword]    = useState('');
  const [password2,   setPassword2]   = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const result = await register(db, username, displayName || username, password);
    setLoading(false);
    if (!result.ok) setError(result.error);
  };

  const ready = username && password && password2;

  return (
    <div style={authLayout}>
      <div style={authCard}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⬡</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--sans)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
            Crear cuenta
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontFamily: 'var(--sans)', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
            Workspace v0.1.0
          </p>
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>Usuario <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input autoFocus type="text" value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="tu_usuario"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>Nombre para mostrar</label>
          <input type="text" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Tu Nombre (opcional)"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>Contraseña <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mín. 4 caracteres"
            style={inputStyle}
          />
        </div>

        <div style={fieldGroup}>
          <label style={fieldLabel}>Confirmar contraseña <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="password" value={password2}
            onChange={e => setPassword2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ready && handleSubmit()}
            placeholder="Repite la contraseña"
            style={{
              ...inputStyle,
              borderColor: password2 && password !== password2 ? 'var(--danger)' : undefined,
            }}
          />
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading || !ready}
          style={{ ...btnStyle, opacity: (loading || !ready) ? 0.5 : 1, cursor: (loading || !ready) ? 'not-allowed' : 'pointer' }}
        >
          <UserPlus size={16} />
          {loading ? 'Creando cuenta…' : 'Registrarse'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: 'var(--sans)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <button onClick={onSwitch} style={linkBtn}>Inicia sesión</button>
        </p>
      </div>
    </div>
  );
}

const authLayout: React.CSSProperties = {
  height: '100vh', width: '100vw',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'var(--bg)', fontFamily: 'var(--sans)',
};
const authCard: React.CSSProperties = {
  width: '100%', maxWidth: '380px',
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-lg)',
  padding: '2rem 2rem 1.5rem',
  boxShadow: 'var(--shadow-lg)',
};
const fieldGroup: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.875rem',
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
  width: '100%',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
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
  fontSize: '0.875rem', fontWeight: 600,
  cursor: 'pointer', transition: 'opacity 0.15s',
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