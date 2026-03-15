// src/modules/demo/index.tsx
import { useState } from 'react';
import { Check, Star, Zap, Info } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import type { AppModule, ModuleProps } from '../../core/types/module';

const DemoModuleComponent = ({ dark, db: _db }: ModuleProps) => {
  const [inputVal, setInputVal] = useState('');
  const [items, setItems] = useState(['First item', 'Second item', 'Third item']);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const addItem = () => { if (!inputVal.trim()) return; setItems(p => [...p, inputVal.trim()]); setInputVal(''); };
  const toggle  = (i: number) => setChecked(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={ms.container}>
      <div>
        <span style={ms.label}>Badges</span>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          {(['default','info','success','warning','danger'] as const).map(v => (
            <span key={v} style={ms.badge(v)}>{v}</span>
          ))}
        </div>
      </div>
      <div style={ms.divider} />
      <div>
        <span style={ms.label}>Cards</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
          {[
            { icon: <Star size={15}/>,  label: 'Stars',  value: '1,204', v: 'info'    as const },
            { icon: <Zap size={15}/>,   label: 'Events', value: '42',    v: 'success' as const },
            { icon: <Check size={15}/>, label: 'Done',   value: '8/10',  v: 'warning' as const },
            { icon: <Info size={15}/>,  label: 'Alerts', value: '3',     v: 'danger'  as const },
          ].map(({ icon, label, value, v }) => (
            <div key={label} style={{ ...ms.card, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ ...ms.badge(v), padding: '0.35rem', borderRadius: 'var(--radius-sm)' }}>{icon}</span>
              <div><div style={ms.muted}>{label}</div><div style={{ ...ms.title, fontSize: '1rem' }}>{value}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={ms.divider} />
      <div>
        <span style={ms.label}>List</span>
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
          <input type="text" placeholder="Add item…" value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            style={{ ...ms.input, flex: 1 }} />
          <button style={ms.btn.primary} onClick={addItem}>Add</button>
        </div>
      </div>
      <div style={{ ...ms.list, maxHeight: '160px' }}>
        {items.length === 0 ? <div style={ms.empty}>No items</div> : items.map((item, i) => (
          <div key={i} style={{ ...ms.card, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: checked.has(i) ? 0.45 : 1 }} onClick={() => toggle(i)}>
            <div style={{ width: '15px', height: '15px', borderRadius: '4px', border: '1.5px solid var(--border-strong)', backgroundColor: checked.has(i) ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {checked.has(i) && <Check size={9} color="white" strokeWidth={3} />}
            </div>
            <span style={{ ...ms.body, flex: 1, textDecoration: checked.has(i) ? 'line-through' : 'none' }}>{item}</span>
            <span style={ms.muted}>#{i+1}</span>
          </div>
        ))}
      </div>
      <div style={ms.divider} />
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button style={ms.btn.primary}>Primary</button>
        <button style={ms.btn.secondary}>Secondary</button>
        <button style={ms.btn.danger}>Danger</button>
        <button style={ms.btn.ghost}>Ghost</button>
      </div>
      <div style={{ ...ms.card, ...ms.mono, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        dark={String(dark)} · {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export const DemoModule: AppModule = {
  id: 'demo', name: 'Demo', description: 'Shows all ms.* tokens', icon: '🎨',
  component: DemoModuleComponent,
  layout: { defaultCols: 6, defaultRows: 4, isMinimizable: true, canExpandFull: true },
};