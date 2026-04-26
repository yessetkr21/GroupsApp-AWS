import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { formatDate } from '../../lib/utils';

export default function ChatView({ messages, currentUser, typingUsers = [], onDeleteMessage }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowScrollBtn(true);
    }
  }, [messages]);

  const handleScroll = () => {
    setShowScrollBtn(!isNearBottom());
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  };

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
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}
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
        return <MessageBubble key={msg.id || `temp-${i}`} message={msg} isOwn={isOwn} onDelete={onDeleteMessage} />;
      })}

      <TypingIndicator typingUsers={typingUsers} />
      <div ref={bottomRef} />
    </div>

    {showScrollBtn && (
      <button
        onClick={scrollToBottom}
        style={{
          position: 'absolute', bottom: '16px', right: '20px',
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(124,58,237,0.5)',
          transition: 'transform 0.15s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Ir al último mensaje"
      >
        <ChevronDown style={{ width: '18px', height: '18px', color: '#ffffff' }} />
      </button>
    )}
    </div>
  );
}
