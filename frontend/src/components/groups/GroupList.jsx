import { getInitials, getAvatarColor, formatTime } from '../../lib/utils';
import { Users } from 'lucide-react';

export default function GroupList({ groups, activeChat, onSelect }) {
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

  return (
    <div>
      {groups.map((group) => {
        const isActive = activeChat?.type === 'group' && activeChat?.id === group.id;
        return (
          <div
            key={group.id}
            onClick={() => onSelect(group)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer',
              background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
              borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 700, fontSize: '14px', flexShrink: 0, backgroundColor: getAvatarColor(group.name) }}>
              {getInitials(group.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <p style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                {group.last_message_at && (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginLeft: '8px' }}>{formatTime(group.last_message_at)}</span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {group.last_message || 'Sin mensajes aún'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
