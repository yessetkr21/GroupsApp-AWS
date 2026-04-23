export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((t) => t.username).join(', ');

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 6px', alignSelf: 'flex-start' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px 18px 18px 4px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{names} escribiendo...</span>
      </div>
    </div>
  );
}
