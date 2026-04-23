import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { formatDate } from '../../lib/utils';

export default function ChatView({ messages, currentUser, typingUsers = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const groupedMessages = [];
  let lastDate = '';

  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    if (date !== lastDate) {
      groupedMessages.push({ type: 'date', date });
      lastDate = date;
    }
    groupedMessages.push({ type: 'message', data: msg });
  });

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#09090f', display: 'flex', flexDirection: 'column' }}
    >
      {groupedMessages.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ fontSize: '20px' }}>💬</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', margin: 0 }}>No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        </div>
      )}

      {groupedMessages.map((item, i) => {
        if (item.type === 'date') {
          return (
            <div key={`date-${i}`} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 8px' }}>
              <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontSize: '11px', padding: '4px 12px', borderRadius: '20px' }}>
                {item.date}
              </span>
            </div>
          );
        }

        const msg = item.data;
        const isOwn = msg.sender_id === currentUser?.id;
        return <MessageBubble key={msg.id || `temp-${i}`} message={msg} isOwn={isOwn} />;
      })}

      <TypingIndicator typingUsers={typingUsers} />
      <div ref={bottomRef} />
    </div>
  );
}
