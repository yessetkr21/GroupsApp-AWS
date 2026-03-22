import { useState } from 'react';
import { Hash, Plus } from 'lucide-react';
import api from '../../services/api';

export default function ChannelList({ channels, activeChat, onSelect, groupId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post(`/groups/${groupId}/channels`, { name: newName.trim() });
      setNewName('');
      setShowCreate(false);
      // Parent will refresh via socket or re-fetch
      window.location.reload();
    } catch (err) {
      alert(err.error || 'Error al crear canal');
    }
  };

  return (
    <div>
      <div className="px-4 py-2 flex items-center justify-between border-b bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Canales</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 hover:bg-gray-200 rounded transition"
        >
          <Plus className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="px-4 py-2 border-b flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del canal"
            className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#25D366]"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#25D366] text-white text-sm rounded hover:bg-[#128C7E]"
          >
            Crear
          </button>
        </form>
      )}

      {channels.map((channel) => (
        <div
          key={channel.id}
          onClick={() => onSelect(channel)}
          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100 transition ${
            activeChat?.type === 'channel' && activeChat?.id === channel.id ? 'bg-gray-100' : ''
          }`}
        >
          <Hash className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{channel.name}</p>
            {channel.last_message && (
              <p className="text-xs text-gray-500 truncate">{channel.last_message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
