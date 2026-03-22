import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import GroupList from '../groups/GroupList';
import GroupCreate from '../groups/GroupCreate';
import ChannelList from '../groups/ChannelList';
import { MessageCircle, Users, UserPlus, LogOut, Plus, Search, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { getInitials, getAvatarColor } from '../../lib/utils';

export default function Sidebar({ groups, contacts, activeChat, setActiveChat, onGroupCreated, channels, setContacts }) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [tab, setTab] = useState('groups'); // groups | contacts
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
      setContacts((prev) => [...prev, res.data]);
      setShowAddContact(false);
      setContactSearch('');
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
    <div className="w-[380px] min-w-[380px] bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          <span className="font-semibold text-lg">GroupsApp</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Crear grupo"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: getAvatarColor(user?.username || '') }}
        >
          {getInitials(user?.username || '?')}
        </div>
        <div>
          <p className="font-medium text-sm text-gray-800">{user?.username}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:bg-gray-200 transition"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => { setTab('groups'); setSelectedGroup(null); }}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition ${
            tab === 'groups'
              ? 'text-[#075E54] border-b-2 border-[#075E54]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Grupos
        </button>
        <button
          onClick={() => { setTab('contacts'); setSelectedGroup(null); }}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition ${
            tab === 'contacts'
              ? 'text-[#075E54] border-b-2 border-[#075E54]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Contactos
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'groups' && !selectedGroup && (
          <GroupList
            groups={filteredGroups}
            activeChat={activeChat}
            onSelect={handleSelectGroup}
          />
        )}

        {tab === 'groups' && selectedGroup && (
          <div>
            <button
              onClick={() => { setSelectedGroup(null); setActiveChat({ type: 'group', id: selectedGroup.id, name: selectedGroup.name }); }}
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#075E54] hover:bg-gray-50 w-full"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a grupos
            </button>
            <ChannelList
              channels={channels}
              activeChat={activeChat}
              onSelect={handleSelectChannel}
              groupId={selectedGroup.id}
            />
          </div>
        )}

        {tab === 'contacts' && (
          <div>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-[#25D366] hover:bg-gray-50 w-full border-b"
            >
              <UserPlus className="w-4 h-4" />
              Agregar contacto
            </button>

            {showAddContact && (
              <div className="px-4 py-3 border-b bg-gray-50">
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleSearchContacts(e.target.value)}
                  placeholder="Buscar por username o email..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                  autoFocus
                />
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 mt-1"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: getAvatarColor(u.username) }}
                      >
                        {getInitials(u.username)}
                      </div>
                      <span className="text-sm">{u.username}</span>
                    </div>
                    <button
                      onClick={() => handleAddContact(u.username)}
                      className="text-xs bg-[#25D366] text-white px-3 py-1 rounded-full hover:bg-[#128C7E]"
                    >
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleSelectDM(contact)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition ${
                  activeChat?.type === 'dm' && activeChat?.id === contact.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getAvatarColor(contact.username) }}
                  >
                    {getInitials(contact.username)}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      onlineUsers.has(contact.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{contact.username}</p>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(contact.id) ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <GroupCreate
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => {
            onGroupCreated();
            setShowCreateGroup(false);
          }}
        />
      )}
    </div>
  );
}
