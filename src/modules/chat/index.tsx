// src/modules/chat/index.tsx
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ms } from '../../core/styles/tokens';
import { useSession } from '../../core/auth/authStore';
import type { AppModule, ModuleProps } from '../../core/types/module';

interface ChatMessage {
  id:           number;
  user_id:      number;
  username:     string;
  display_name: string;
  mensaje:      string;
  creado_en:    string;
}

const ChatModuleComponent = ({ db }: ModuleProps) => {
  const session   = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = () => {
    const rows = db.all<ChatMessage>(`
      SELECT m.id, m.user_id, u.username, u.display_name, m.mensaje, m.creado_en
      FROM chat_messages m
      JOIN users u ON u.id = m.user_id
      ORDER BY m.id ASC
    `);
    setMessages(rows);
  };

  useEffect(() => { load(); }, [db]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !session) return;
    db.run('INSERT INTO chat_messages (user_id, mensaje) VALUES (?, ?)', [session.user.id, input.trim()]);
    load();
    setInput('');
  };

  const myId = session?.user.id;

  return (
    <div style={{ ...ms.container, padding: '0.75rem', gap: '0.625rem' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.25rem 0.125rem' }}>
        {messages.length === 0 ? (
          <div style={ms.empty}>Sin mensajes aún. ¡Di algo!</div>
        ) : messages.map(m => {
          const isMe = m.user_id === myId;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <span style={{ ...ms.label, marginBottom: '0.2rem', paddingLeft: '0.5rem', color: 'var(--primary)' }}>
                  {m.display_name}
                </span>
              )}
              <div style={{
                maxWidth: '78%',
                padding: '0.5rem 0.75rem',
                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                backgroundColor: isMe ? 'var(--primary)' : 'var(--bg-raised)',
                color: isMe ? '#fff' : 'var(--text)',
                border: isMe ? 'none' : '1px solid var(--border)',
                fontSize: '0.8375rem', fontFamily: 'var(--sans)', lineHeight: 1.45,
                wordBreak: 'break-word',
              }}>
                {m.mensaje}
              </div>
              <span style={{ ...ms.label, marginTop: '0.15rem', fontSize: '0.62rem',
                paddingLeft: isMe ? 0 : '0.5rem', paddingRight: isMe ? '0.25rem' : 0 }}>
                {new Date(m.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <input type="text" placeholder="Escribe un mensaje…"
          style={{ ...ms.input, flex: 1 }} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button style={{ ...ms.btn.primary, padding: '0.5rem 0.75rem', opacity: !input.trim() ? 0.5 : 1 }}
          onClick={handleSend} disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export const ChatModule: AppModule = {
  id: 'mod-chat', name: 'Chat Local', description: 'Mensajería interna', icon: '💬',
  component: ChatModuleComponent,
  layout: { defaultCols: 4, defaultRows: 6, isMinimizable: true, canExpandFull: true },
  migrations: [{
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS chat_messages (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id   INTEGER NOT NULL REFERENCES users(id),
      mensaje   TEXT    NOT NULL,
      creado_en TEXT    NOT NULL DEFAULT (datetime('now'))
    );`,
  }],
};