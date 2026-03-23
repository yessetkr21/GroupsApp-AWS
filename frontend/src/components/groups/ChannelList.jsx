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
      window.location.reload();
    } catch (err) {
      alert(err.error || 'Error al crear canal');
    }
  };

  return (
    <div>
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Canales</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          <Plus style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del canal"
            style={{ flex: 1, padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }}
            autoFocus
          />
          <button
            type="submit"
            style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.8)', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '13px', cursor: 'pointer' }}
          >
            Crear
          </button>
        </form>
      )}

      {channels.map((channel) => {
        const isActive = activeChat?.type === 'channel' && activeChat?.id === channel.id;
        return (
          <div
            key={channel.id}
            onClick={() => onSelect(channel)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer',
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <Hash style={{ width: '15px', height: '15px', color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {channel.name}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
