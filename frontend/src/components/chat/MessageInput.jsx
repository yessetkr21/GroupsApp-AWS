import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import api from '../../services/api';

export default function MessageInput({ onSend, onTyping, onStopTyping }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping();
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping?.();
    }, 3000);
  };

  const handleSend = () => {
    if (preview) { handleUploadAndSend(); return; }
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const url = URL.createObjectURL(file);
    setPreview({ file, url, type: isImage ? 'image' : 'file' });
    e.target.value = '';
  };

  const handleUploadAndSend = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', preview.file);
      const res = await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSend(text.trim() || null, preview.type, res.data.url, res.data.name);
      setText('');
      clearPreview();
    } catch {
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const canSend = !uploading && (text.trim().length > 0 || preview);

  return (
    <div style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
      {preview && (
        <div style={{ marginBottom: '8px', background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {preview.type === 'image' ? (
            <img src={preview.url} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
          ) : (
            <div style={{ width: '48px', height: '48px', background: 'rgba(124,58,237,0.15)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paperclip style={{ width: '18px', height: '18px', color: '#a78bfa' }} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.file.name}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{(preview.file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={clearPreview} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0, transition: 'all 0.15s' }}
          title="Adjuntar archivo"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; e.currentTarget.style.color = '#a78bfa'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <Paperclip style={{ width: '16px', height: '16px' }} />
        </button>

        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar" />

        <div style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', transition: 'border-color 0.15s' }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '14px', resize: 'none', maxHeight: '120px', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5, fontFamily: 'inherit' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: '38px', height: '38px', borderRadius: '10px', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
            background: canSend ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--input-bg)',
            color: canSend ? '#ffffff' : 'var(--text-dim)',
            boxShadow: canSend ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
          }}
        >
          {uploading
            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            : <Send style={{ width: '16px', height: '16px' }} />
          }
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
