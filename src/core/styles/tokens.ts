// src/core/styles/tokens.ts
//
// Shared style tokens for module components.
// All values use CSS variables from index.css — they respond to dark mode automatically.
//
// Usage:
//   import { ms } from '@/core/styles/tokens';
//   <div style={ms.container}>…</div>
//   <button style={ms.btn.primary}>Save</button>

import type { CSSProperties } from 'react';

const t = 'all 0.15s ease';

/* ── Surfaces ──────────────────────────────────────────── */
export const container: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '1.125rem',
  height: '100%',
  overflowY: 'auto',
  fontFamily: 'var(--sans)',
  color: 'var(--text)',
  backgroundColor: 'var(--bg-card)',
};

export const card: CSSProperties = {
  backgroundColor: 'var(--bg-raised)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius)',
  padding: '0.875rem',
  transition: t,
};

/* ── Typography ────────────────────────────────────────── */
export const label: CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.09em',
  color: 'var(--text-faint)',
  fontFamily: 'var(--sans)',
};

export const title: CSSProperties = {
  fontSize: '0.9375rem',
  fontWeight: 600,
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  margin: 0,
};

export const body: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  lineHeight: 1.6,
  margin: 0,
};

export const muted: CSSProperties = {
  fontSize: '0.8125rem',
  color: 'var(--text-muted)',
  fontFamily: 'var(--sans)',
  margin: 0,
};

export const mono: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '0.8125rem',
  color: 'var(--text)',
};

/* ── Divider ───────────────────────────────────────────── */
export const divider: CSSProperties = {
  width: '100%',
  height: '1px',
  backgroundColor: 'var(--border)',
  flexShrink: 0,
  margin: '0.25rem 0',
};

/* ── Form elements ─────────────────────────────────────── */
export const input: CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontSize: '0.875rem',
  outline: 'none',
  transition: t,
};

export const select: CSSProperties = { ...input, cursor: 'pointer' };
export const textarea: CSSProperties = { ...input, resize: 'vertical' as const, minHeight: '80px' };

/* ── Buttons ───────────────────────────────────────────── */
const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4rem',
  padding: '0.45rem 0.875rem',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--sans)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: t,
  userSelect: 'none' as const,
  flexShrink: 0,
};

export const btn = {
  primary: {
    ...btnBase,
    backgroundColor: 'var(--primary)',
    color: '#fff',
  } as CSSProperties,
  secondary: {
    ...btnBase,
    backgroundColor: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  } as CSSProperties,
  ghost: {
    ...btnBase,
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    padding: '0.35rem',
  } as CSSProperties,
  danger: {
    ...btnBase,
    backgroundColor: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
  } as CSSProperties,
};

/* ── Badge ─────────────────────────────────────────────── */
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
export const badge = (v: BadgeVariant = 'default'): CSSProperties => {
  const map: Record<BadgeVariant, [string, string]> = {
    default: ['var(--border)', 'var(--text-muted)'],
    success: ['var(--success-bg)', 'var(--success)'],
    warning: ['var(--warning-bg)', 'var(--warning)'],
    danger:  ['var(--danger-bg)', 'var(--danger)'],
    info:    ['var(--primary-bg)', 'var(--primary)'],
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.1rem 0.55rem',
    borderRadius: '999px',
    fontSize: '0.68rem',
    fontWeight: 700,
    fontFamily: 'var(--mono)',
    backgroundColor: map[v][0],
    color: map[v][1],
  };
};

/* ── Layout helpers ────────────────────────────────────── */
export const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
};

export const list: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1,
};

export const empty: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  color: 'var(--text-faint)',
  fontFamily: 'var(--sans)',
  fontSize: '0.875rem',
  fontStyle: 'italic',
};

/* ── Export as ms namespace ────────────────────────────── */
export const ms = {
  container, card, label, title, body, muted, mono,
  divider, input, select, textarea, btn, badge,
  row, list, empty,
} as const;