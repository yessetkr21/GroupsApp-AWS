import { useState } from 'react';
import { getInitials, getAvatarColor, formatTime } from '../../lib/utils';
import { Users, Trash2 } from 'lucide-react';

export default function GroupList({ groups, activeChat, onSelect, onDelete, unreadCounts = {} }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  if (groups.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <Users style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.2)' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: '0 0 4px 0' }}>No tienes grupos aún</p>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', margin: 0 }}>Crea uno con el botón + arriba</p>
      </div>
    );
  }

  const handleDeleteClick = (e, group) => {
    e.stopPropagation();
    setConfirmId(group.id);
  };

  const handleConfirmDelete = (e, groupId) => {
    e.stopPropagation();
    setConfirmId(null);
    onDelete && onDelete(groupId);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmId(null);
  };

  return (
    <div>
      {groups.map((group) => {
        const isActive = activeChat?.type === 'group' && activeChat?.id === group.id;
        const unread = unreadCounts[`group-${group.id}`] || 0;
        const isAdmin = group.role === 'admin';

        return (
          <div key={group.id}>
            <div
              onClick={() => onSelect(group)}
              onMouseEnter={() => setHoveredId(group.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                borderBottom: '1px solid var(--border-subtle)',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnterCapture={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeaveCapture={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '14px', flexShrink: 0, backgroundColor: getAvatarColor(group.name) }}>
                {getInitials(group.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                    {group.last_message_at && (
                      <span style={{ fontSize: '11px', color: unread ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}>{formatTime(group.last_message_at)}</span>
                    )}
                    {unread > 0 && (
                      <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    {isAdmin && hoveredId === group.id && (
                      <button
                        onClick={(e) => handleDeleteClick(e, group)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: 'rgba(255,80,80,0.7)', borderRadius: '4px' }}
                        title="Eliminar grupo"
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: unread ? 'var(--text-secondary)' : 'var(--text-dim)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread ? 500 : 400 }}>
                  {group.last_message || 'Sin mensajes aún'}
                </p>
              </div>
            </div>

            {confirmId === group.id && (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', margin: '4px 12px', padding: '10px 12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', margin: '0 0 8px 0' }}>¿Eliminar "{group.name}" y todos sus mensajes?</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => handleConfirmDelete(e, group.id)}
                    style={{ flex: 1, background: 'rgba(220,38,38,0.8)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
