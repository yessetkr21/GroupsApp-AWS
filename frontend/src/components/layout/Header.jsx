import { useSocket } from '../../context/SocketContext';
import { Users, Hash, MessageCircle } from 'lucide-react';
import { getInitials, getAvatarColor, formatLastSeen } from '../../lib/utils';

export default function Header({ activeChat, members, typingUsers }) {
  const { onlineUsers, lastSeenMap } = useSocket();
  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;

  const getIcon = () => {
    if (activeChat.type === 'channel') return <Hash style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
    if (activeChat.type === 'group') return <Users style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
    return <MessageCircle style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) {
      const names = typingUsers.map((t) => t.username).join(', ');
      return <span style={{ color: '#a78bfa' }}>{names} escribiendo...</span>;
    }
    if (activeChat.type === 'dm') {
      const dbLastSeen = activeChat.last_seen;
      const socketLastSeen = lastSeenMap.get(activeChat.id);
      const lastSeen = socketLastSeen || dbLastSeen;
      return onlineUsers.has(activeChat.id)
        ? <span style={{ color: '#22c55e' }}>En línea</span>
        : <span style={{ color: 'rgba(255,255,255,0.3)' }}>{lastSeen ? formatLastSeen(lastSeen) : 'Desconectado'}</span>;
    }
    if (activeChat.type === 'group') {
      return <span style={{ color: 'rgba(255,255,255,0.4)' }}>{members.length} miembros · {onlineCount} en línea</span>;
    }
    return null;
  };

  return (
    <div style={{ background: '#0f0f17', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div
        style={{ width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '13px', flexShrink: 0, backgroundColor: getAvatarColor(activeChat.name) }}
      >
        {activeChat.type === 'channel' ? '#' : getInitials(activeChat.name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {getIcon()}
          <h2 style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChat.name}</h2>
        </div>
        <p style={{ fontSize: '12px', margin: '2px 0 0 0', lineHeight: 1 }}>{getSubtitle()}</p>
      </div>

      {activeChat.type === 'group' && members.length > 0 && (
        <div style={{ display: 'flex', marginLeft: 'auto', flexShrink: 0 }}>
          {members.slice(0, 5).map((m, i) => (
            <div
              key={m.id}
              style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #0f0f17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#ffffff', marginLeft: i === 0 ? 0 : '-8px', backgroundColor: getAvatarColor(m.username), zIndex: members.slice(0, 5).length - i }}
              title={m.username}
            >
              {getInitials(m.username)}
            </div>
          ))}
          {members.length > 5 && (
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #0f0f17', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#ffffff', marginLeft: '-8px' }}>
              +{members.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
