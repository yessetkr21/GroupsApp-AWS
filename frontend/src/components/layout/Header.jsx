import { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Users, Hash, MessageCircle, UserPlus, X, Search } from 'lucide-react';
import { getInitials, getAvatarColor, formatLastSeen } from '../../lib/utils';
import api from '../../services/api';

export default function Header({ activeChat, members, typingUsers, onMembersChanged }) {
  const { onlineUsers, lastSeenMap } = useSocket();
  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addError, setAddError] = useState('');

  const getIcon = () => {
    if (activeChat.type === 'channel') return <Hash style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
    if (activeChat.type === 'group') return <Users style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
    return <MessageCircle style={{ width: '16px', height: '16px', color: '#a78bfa' }} />;
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) {
      const names = typingUsers.map((t) => t.username).join(', ');
      return (
        <span style={{ color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
            <span className="typing-dot" style={{ animationDelay: '0ms', width: '4px', height: '4px' }} />
            <span className="typing-dot" style={{ animationDelay: '160ms', width: '4px', height: '4px' }} />
            <span className="typing-dot" style={{ animationDelay: '320ms', width: '4px', height: '4px' }} />
          </span>
          {names} escribiendo
        </span>
      );
    }
    if (activeChat.type === 'dm') {
      const isOnline = onlineUsers.has(activeChat.id);
      if (isOnline) {
        return <span style={{ color: '#22c55e' }}>En línea</span>;
      }
      const lastSeen = lastSeenMap[activeChat.id];
      return <span style={{ color: 'rgba(255,255,255,0.3)' }}>{formatLastSeen(lastSeen)}</span>;
    }
    if (activeChat.type === 'group') {
      return <span style={{ color: 'rgba(255,255,255,0.4)' }}>{members.length} miembros · {onlineCount} en línea</span>;
    }
    return null;
  };

  const handleSearchUsers = async (q) => {
    setMemberSearch(q);
    setAddError('');
    if (q.length >= 2) {
      try {
        const res = await api.get(`/contacts/search?q=${q}`);
        // Filter out already-members
        const memberIds = new Set(members.map((m) => m.id));
        setSearchResults(res.data.filter((u) => !memberIds.has(u.id)));
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMember = async (userId) => {
    setAddError('');
    try {
      const groupId = activeChat.type === 'group' ? activeChat.id : activeChat.groupId;
      await api.post(`/groups/${groupId}/members`, { user_id: userId });
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      if (onMembersChanged) onMembersChanged();
    } catch (err) {
      setAddError(err.error || 'Error al agregar miembro');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const groupId = activeChat.type === 'group' ? activeChat.id : activeChat.groupId;
      await api.delete(`/groups/${groupId}/members/${userId}`);
      if (onMembersChanged) onMembersChanged();
    } catch (err) {
      setAddError(err.error || 'Error al remover miembro');
    }
  };

  const isGroupOrChannel = activeChat.type === 'group' || activeChat.type === 'channel';
  const currentUserRole = members.find((m) => m.role === 'admin')?.role;

  return (
    <>
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

        {isGroupOrChannel && (
          <button
            onClick={() => setShowMembers(!showMembers)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: showMembers ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: showMembers ? '#a78bfa' : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            <Users style={{ width: '14px', height: '14px' }} />
            {members.length}
          </button>
        )}

        {isGroupOrChannel && members.length > 0 && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            {members.slice(0, 5).map((m, i) => (
              <div
                key={m.id}
                style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #0f0f17', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#ffffff', marginLeft: i === 0 ? 0 : '-8px', backgroundColor: getAvatarColor(m.username), zIndex: members.slice(0, 5).length - i, position: 'relative' }}
                title={m.username}
              >
                {getInitials(m.username)}
                <span style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '8px', height: '8px', borderRadius: '50%', background: onlineUsers.has(m.id) ? '#22c55e' : '#4b5563', border: '1.5px solid #0f0f17' }} />
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

      {/* Members panel */}
      {showMembers && isGroupOrChannel && (
        <div style={{ background: '#0f0f17', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', maxHeight: '320px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Miembros ({members.length})</span>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '6px', color: '#a78bfa', fontSize: '12px', cursor: 'pointer' }}
            >
              <UserPlus style={{ width: '12px', height: '12px' }} />
              Agregar
            </button>
          </div>

          {showAddMember && (
            <div style={{ marginBottom: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Buscar usuario..."
                  style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#ffffff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>
              {addError && <p style={{ fontSize: '11px', color: '#f87171', margin: '0 0 6px 0' }}>{addError}</p>}
              {searchResults.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700, backgroundColor: getAvatarColor(u.username) }}>
                      {getInitials(u.username)}
                    </div>
                    <span style={{ fontSize: '12px', color: '#fff' }}>{u.username}</span>
                  </div>
                  <button
                    onClick={() => handleAddMember(u.id)}
                    style={{ padding: '3px 10px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '14px', color: '#a78bfa', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}

          {members.map((m) => {
            const isOnline = onlineUsers.has(m.id);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, backgroundColor: getAvatarColor(m.username) }}>
                    {getInitials(m.username)}
                  </div>
                  <span style={{ position: 'absolute', bottom: '0px', right: '0px', width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#4b5563', border: '1.5px solid #0f0f17' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{m.username}</span>
                    {m.role === 'admin' && (
                      <span style={{ fontSize: '9px', padding: '1px 6px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px', color: '#a78bfa', fontWeight: 600 }}>Admin</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: isOnline ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                    {isOnline ? 'En línea' : formatLastSeen(m.last_seen)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
