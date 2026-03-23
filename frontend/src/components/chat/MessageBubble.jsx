import { Check, CheckCheck, File } from 'lucide-react';
import { formatTime, getAvatarColor, getInitials } from '../../lib/utils';

export default function MessageBubble({ message, isOwn }) {
  const statusIcon = () => {
    if (!isOwn) return null;
    if (message.status === 'read') return <CheckCheck style={{ width: '14px', height: '14px', color: '#a78bfa' }} />;
    if (message.status === 'delivered') return <CheckCheck style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,0.3)' }} />;
    return <Check style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,0.3)' }} />;
  };

  const renderContent = () => {
    if (message.message_type === 'image' && message.file_url) {
      return (
        <div>
          <img
            src={message.file_url}
            alt={message.file_name || 'Imagen'}
            style={{ maxWidth: '260px', borderRadius: '8px', cursor: 'pointer', display: 'block' }}
            onClick={() => window.open(message.file_url, '_blank')}
          />
          {message.content && (
            <p style={{ marginTop: '6px', fontSize: '14px', lineHeight: 1.5, color: isOwn ? '#ffffff' : 'rgba(255,255,255,0.9)', margin: '6px 0 0 0' }}>
              {message.content}
            </p>
          )}
        </div>
      );
    }

    if (message.message_type === 'file' && message.file_url) {
      return (
        <a
          href={message.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', textDecoration: 'none' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <File style={{ width: '18px', height: '18px', color: '#a78bfa' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.file_name || 'Archivo'}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Descargar</p>
          </div>
        </a>
      );
    }

    return (
      <p style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: isOwn ? '#ffffff' : 'rgba(255,255,255,0.9)' }}>
        {message.content}
      </p>
    );
  };

  return (
    <div style={{ display: 'flex', marginBottom: '4px', justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
      {!isOwn && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '10px', fontWeight: 700, flexShrink: 0, marginBottom: '2px', backgroundColor: getAvatarColor(message.sender_username || '') }}>
          {getInitials(message.sender_username || '?')}
        </div>
      )}

      <div style={{ maxWidth: '62%' }}>
        {!isOwn && message.sender_username && (
          <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '3px', marginLeft: '2px', color: getAvatarColor(message.sender_username) }}>
            {message.sender_username}
          </p>
        )}

        <div
          style={{
            padding: '8px 12px',
            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isOwn
              ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
              : 'rgba(255,255,255,0.07)',
            border: isOwn ? 'none' : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isOwn ? '0 2px 12px rgba(124,58,237,0.25)' : 'none',
          }}
        >
          {renderContent()}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
              {formatTime(message.created_at)}
            </span>
            {statusIcon()}
          </div>
        </div>
      </div>
    </div>
  );
}
