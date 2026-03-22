import { useState, useRef } from 'react';
import { Send, Paperclip, Image, X } from 'lucide-react';
import api from '../../services/api';

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { file, url, type }
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping();
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  };

  const handleSend = () => {
    if (preview) {
      handleUploadAndSend();
      return;
    }
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
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSend(text.trim() || null, preview.type, res.data.url, res.data.name);
      setText('');
      clearPreview();
    } catch (err) {
      alert('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <div className="bg-[#f0f2f5] px-4 py-3 border-t">
      {/* File preview */}
      {preview && (
        <div className="mb-2 bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm">
          {preview.type === 'image' ? (
            <img src={preview.url} alt="Preview" className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{preview.file.name}</p>
            <p className="text-xs text-gray-500">
              {(preview.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button onClick={clearPreview} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition shrink-0"
          title="Adjuntar archivo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        />

        <div className="flex-1 bg-white rounded-2xl border shadow-sm">
          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="w-full px-4 py-2.5 text-sm resize-none max-h-32 focus:outline-none rounded-2xl"
            rows={1}
            style={{ minHeight: '42px' }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={uploading || (!text.trim() && !preview)}
          className="p-2.5 bg-[#25D366] text-white rounded-full hover:bg-[#128C7E] transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
