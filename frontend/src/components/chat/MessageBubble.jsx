import { Check, CheckCheck, File, Image } from 'lucide-react';
import { formatTime, getAvatarColor } from '../../lib/utils';

export default function MessageBubble({ message, isOwn }) {
  const statusIcon = () => {
    if (!isOwn) return null;
    if (message.status === 'read') {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    }
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  const renderContent = () => {
    if (message.message_type === 'image' && message.file_url) {
      return (
        <div>
          <img
            src={message.file_url}
            alt={message.file_name || 'Imagen'}
            className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition"
            onClick={() => window.open(message.file_url, '_blank')}
          />
          {message.content && <p className="mt-1.5 text-[14px] leading-relaxed">{message.content}</p>}
        </div>
      );
    }

    if (message.message_type === 'file' && message.file_url) {
      return (
        <a
          href={message.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white/50 rounded-lg p-3 hover:bg-white/70 transition"
        >
          <div className="w-10 h-10 bg-[#075E54] rounded-lg flex items-center justify-center shrink-0">
            <File className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{message.file_name || 'Archivo'}</p>
            <p className="text-xs text-gray-500">Descargar</p>
          </div>
        </a>
      );
    }

    return <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>;
  };

  return (
    <div className={`flex mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative ${
          isOwn
            ? 'bg-[#DCF8C6] rounded-tr-none'
            : 'bg-white rounded-tl-none'
        }`}
      >
        {!isOwn && message.sender_username && (
          <p
            className="text-xs font-semibold mb-0.5"
            style={{ color: getAvatarColor(message.sender_username) }}
          >
            {message.sender_username}
          </p>
        )}

        {renderContent()}

        <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
          <span className="text-[11px] text-gray-500">{formatTime(message.created_at)}</span>
          {statusIcon()}
        </div>
      </div>
    </div>
  );
}
