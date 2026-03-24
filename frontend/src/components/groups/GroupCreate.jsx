import { useState } from 'react';
import { X, Users } from 'lucide-react';
import api from '../../services/api';

export default function GroupCreate({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/groups', { name: name.trim(), description: description.trim() });
      onCreated();
    } catch (err) {
      setError(err.error || 'Error al crear grupo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #13131f, #0f0f1a)',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.08)',
          width: '100%', maxWidth: '420px',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05))',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users style={{ width: '18px', height: '18px', color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
              Crear nuevo grupo
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <X style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', padding: '8px 12px', borderRadius: '8px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Name field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'rgba(255,255,255,0.5)', marginBottom: '6px',
            }}>
              Nombre del grupo <span style={{ color: '#a78bfa' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', fontSize: '14px',
                color: '#ffffff', outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.4)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              placeholder="Ej: Proyecto Telemática"
              required
              autoFocus
            />
          </div>

          {/* Description field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 500,
              color: 'rgba(255,255,255,0.5)', marginBottom: '6px',
            }}>
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', fontSize: '14px',
                color: '#ffffff', outline: 'none', resize: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.4)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              rows={3}
              placeholder="Descripción del grupo..."
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', fontSize: '14px', fontWeight: 500,
                color: 'rgba(255,255,255,0.6)', background: 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                flex: 1, padding: '10px 16px',
                border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600,
                color: '#ffffff',
                background: loading || !name.trim()
                  ? 'rgba(124,58,237,0.3)'
                  : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                boxShadow: loading || !name.trim() ? 'none' : '0 4px 16px rgba(124,58,237,0.3)',
              }}
              onMouseEnter={(e) => { if (!loading && name.trim()) e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.4)'; }}
              onMouseLeave={(e) => { if (!loading && name.trim()) e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.3)'; }}
            >
              {loading ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
