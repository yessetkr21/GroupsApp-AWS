import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Mail, Lock, ArrowRight } from 'lucide-react';
import LightRays from '../components/backgrounds/LightRays';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: '#07070d', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', maxHeight: '100vh' }}
    >
      {/* LightRays Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#6d28d9"
          raysSpeed={0.4}
          lightSpread={1.5}
          rayLength={2.5}
          pulsating
          fadeDistance={1.2}
          saturation={1.2}
          followMouse
          mouseInfluence={0.15}
          noiseAmount={0.02}
          distortion={0.1}
        />
      </div>

      {/* Gradient overlay bottom fade */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(7,7,13,0.85) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '440px', margin: '0 auto', padding: '0 20px' }}>

        {/* ── Hero Section ── */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          {/* Heading */}
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px 0' }}>
            <span style={{ color: '#ffffff' }}>Conecta. </span>
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Colabora.
            </span>
            <br />
            <span style={{ color: '#ffffff' }}>Sin límites.</span>
          </h1>

          {/* Subtitle */}
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', lineHeight: 1.5, maxWidth: '340px', margin: '0 auto' }}>
            Grupos, canales y mensajes en tiempo real con la potencia de AWS. Tu equipo, siempre sincronizado.
          </p>
        </div>

        {/* ── Login Card ── */}
        <div
          style={{
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            padding: '28px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4), 0 0 80px rgba(139,92,246,0.06)',
          }}
        >
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MessageCircle style={{ width: '22px', height: '22px', color: '#a78bfa' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
                Bienvenido de vuelta
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0' }}>
                Ingresa a tu cuenta para continuar
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '24px',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: 'rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 42px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(139,92,246,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: 'rgba(255,255,255,0.2)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 42px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(139,92,246,0.5)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px',
                background: loading ? 'rgba(124,58,237,0.5)' : '#7c3aed',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                borderRadius: '12px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
                boxShadow: '0 8px 24px rgba(124,58,237,0.3)',
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = '#6d28d9'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.background = '#7c3aed'; }}
              onMouseDown={(e) => { if (!loading) e.target.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.target.style.transform = 'scale(1)'; }}
            >
              {loading ? (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              ¿No tienes cuenta?{' '}
              <Link to="/register" style={{ color: '#a78bfa', fontWeight: 500, textDecoration: 'none' }}>
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '20px' }}>
          GroupsApp · Sistemas Distribuidos · AWS
        </p>
      </div>

      {/* Spin animation for loader */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.2) !important;
        }
      `}</style>
    </div>
  );
}
