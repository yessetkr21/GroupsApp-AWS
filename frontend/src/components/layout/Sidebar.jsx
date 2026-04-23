import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import GroupList from '../groups/GroupList';
import GroupCreate from '../groups/GroupCreate';
import ChannelList from '../groups/ChannelList';
import { MessageCircle, Users, UserPlus, LogOut, Plus, Search, ArrowLeft, Hash } from 'lucide-react';
import api from '../../services/api';
import { getInitials, getAvatarColor, formatLastSeen } from '../../lib/utils';

export default function Sidebar({ groups, contacts, activeChat, setActiveChat, onGroupCreated, channels, setContacts, unreadCounts = {} }) {
  const { user, logout } = useAuth();
  const { onlineUsers, lastSeenMap } = useSocket();
  const [tab, setTab] = useState('groups');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState('');

  const handleSearchContacts = async (q) => {
    setContactSearch(q);
    if (q.length >= 2) {
      const res = await api.get(`/contacts/search?q=${q}`);
      setSearchResults(res.data);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddContact = async (username) => {
    try {
      const res = await api.post('/contacts', { username });
      const newContact = res.data;
      setContacts((prev) => {
        if (prev.some((c) => c.id === newContact.id)) return prev;
        return [...prev, newContact];
      });
      setShowAddContact(false);
      setContactSearch('');
      setSearchResults([]);
      // Auto-open the DM chat with the new contact
      setActiveChat({ type: 'dm', id: newContact.id, name: newContact.username });
    } catch (err) {
      alert(err.error || 'Error al agregar contacto');
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setActiveChat({ type: 'group', id: group.id, name: group.name });
  };

  const handleSelectChannel = (channel) => {
    setActiveChat({ type: 'channel', id: channel.id, name: `${selectedGroup.name} / #${channel.name}`, groupId: selectedGroup.id });
  };

  const handleSelectDM = (contact) => {
    setActiveChat({ type: 'dm', id: contact.id, name: contact.username });
  };

  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const filteredContacts = contacts.filter((c) => c.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ width: '340px', minWidth: '340px', background: '#0f0f17', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageCircle style={{ width: '16px', height: '16px', color: '#a78bfa' }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff' }}>GroupsApp</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setShowCreateGroup(true)}
            style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
            title="Crear grupo"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            onClick={logout}
            style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
            title="Cerrar sesión"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '13px', fontWeight: 700, flexShrink: 0, backgroundColor: getAvatarColor(user?.username || '') }}
        >
          {getInitials(user?.username || '?')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff', margin: 0, lineHeight: 1.3 }}>{user?.username}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
        </div>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'rgba(255,255,255,0.25)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { key: 'groups', label: 'Grupos', icon: <Users style={{ width: '14px', height: '14px' }} /> },
          { key: 'contacts', label: 'Contactos', icon: <MessageCircle style={{ width: '14px', height: '14px' }} /> },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedGroup(null); }}
            style={{
              flex: 1, padding: '10px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              color: tab === key ? '#a78bfa' : 'rgba(255,255,255,0.35)',
              borderBottom: tab === key ? '2px solid #7c3aed' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'groups' && !selectedGroup && (
          <GroupList groups={filteredGroups} activeChat={activeChat} onSelect={handleSelectGroup} unreadCounts={unreadCounts} />
        )}

        {tab === 'groups' && selectedGroup && (
          <div>
            <button
              onClick={() => { setSelectedGroup(null); setActiveChat({ type: 'group', id: selectedGroup.id, name: selectedGroup.name }); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '13px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <ArrowLeft style={{ width: '14px', height: '14px' }} />
              Volver a grupos
            </button>
            <ChannelList channels={channels} activeChat={activeChat} onSelect={handleSelectChannel} groupId={selectedGroup.id} />
          </div>
        )}

        {tab === 'contacts' && (
          <div>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '13px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <UserPlus style={{ width: '14px', height: '14px' }} />
              Agregar contacto
            </button>

            {showAddContact && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleSearchContacts(e.target.value)}
                  placeholder="Buscar por username o email..."
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus
                />
                {searchResults.map((u) => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '11px', fontWeight: 700, backgroundColor: getAvatarColor(u.username) }}>
                        {getInitials(u.username)}
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff' }}>{u.username}</span>
                    </div>
                    <button
                      onClick={() => handleAddContact(u.username)}
                      style={{ padding: '4px 12px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '20px', color: '#a78bfa', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {filteredContacts.map((contact) => {
              const isActive = activeChat?.type === 'dm' && activeChat?.id === contact.id;
              const isOnline = onlineUsers.has(contact.id);
              const unread = unreadCounts[`dm-${contact.id}`] || 0;
              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectDM(contact)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer',
                    background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                    borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '14px', backgroundColor: getAvatarColor(contact.username) }}>
                      {getInitials(contact.username)}
                    </div>
                    <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#4b5563', border: '2px solid #0f0f17' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: unread ? 600 : 500, fontSize: '14px', color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.username}</p>
                    <p style={{ fontSize: '12px', color: isOnline ? '#22c55e' : 'rgba(255,255,255,0.3)', margin: 0 }}>{isOnline ? 'En línea' : formatLastSeen(lastSeenMap[contact.id])}</p>
                  </div>
                  {unread > 0 && (
                    <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateGroup && (
        <GroupCreate onClose={() => setShowCreateGroup(false)} onCreated={() => { onGroupCreated(); setShowCreateGroup(false); }} />
      )}
    </div>
  );
}
