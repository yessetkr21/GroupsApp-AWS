import { useSocket } from '../../context/SocketContext';
import { Users, Hash, MessageCircle } from 'lucide-react';
import { getInitials, getAvatarColor } from '../../lib/utils';

export default function Header({ activeChat, members, typingUsers }) {
  const { onlineUsers } = useSocket();

  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;

  const getIcon = () => {
    if (activeChat.type === 'channel') return <Hash className="w-5 h-5" />;
    if (activeChat.type === 'group') return <Users className="w-5 h-5" />;
    return <MessageCircle className="w-5 h-5" />;
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) {
      const names = typingUsers.map((t) => t.username).join(', ');
      return <span className="text-green-300">{names} escribiendo...</span>;
    }
    if (activeChat.type === 'dm') {
      return onlineUsers.has(activeChat.id) ? 'En línea' : 'Desconectado';
    }
    if (activeChat.type === 'group') {
      return `${members.length} miembros, ${onlineCount} en línea`;
    }
    return '';
  };

  return (
    <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shadow-sm">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
        style={{ backgroundColor: getAvatarColor(activeChat.name) }}
      >
        {activeChat.type === 'channel' ? '#' : getInitials(activeChat.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h2 className="font-medium truncate">{activeChat.name}</h2>
        </div>
        <p className="text-xs text-gray-300 truncate">{getSubtitle()}</p>
      </div>
      {activeChat.type === 'group' && (
        <div className="flex -space-x-2">
          {members.slice(0, 5).map((m) => (
            <div
              key={m.id}
              className="w-8 h-8 rounded-full border-2 border-[#075E54] flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: getAvatarColor(m.username) }}
              title={m.username}
            >
              {getInitials(m.username)}
            </div>
          ))}
          {members.length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-[#075E54] bg-gray-600 flex items-center justify-center text-[10px] font-bold text-white">
              +{members.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
