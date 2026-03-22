import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { formatDate } from '../../lib/utils';

export default function ChatView({ messages, currentUser }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages by date
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
    <div ref={containerRef} className="flex-1 overflow-y-auto chat-bg px-4 py-2">
      {groupedMessages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white/80 rounded-lg px-6 py-3 shadow-sm">
            <p className="text-gray-500 text-sm">No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        </div>
      )}

      {groupedMessages.map((item, i) => {
        if (item.type === 'date') {
          return (
            <div key={`date-${i}`} className="flex justify-center my-3">
              <span className="bg-white/90 text-gray-500 text-xs px-4 py-1.5 rounded-lg shadow-sm">
                {item.date}
              </span>
            </div>
          );
        }

        const msg = item.data;
        const isOwn = msg.sender_id === currentUser?.id;

        return (
          <MessageBubble
            key={msg.id || `temp-${i}`}
            message={msg}
            isOwn={isOwn}
          />
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
