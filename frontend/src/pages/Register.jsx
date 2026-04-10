import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) return setError('Enter a username');
    if (!email.trim()) return setError('Enter your email');
    if (!password) return setError('Enter a password');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Failed to create account');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setSize();
    let ps = [], raf = 0;
    const make = () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: Math.random() * 0.25 + 0.05, o: Math.random() * 0.35 + 0.15 });
    const init = () => { ps = []; const n = Math.floor((canvas.width * canvas.height) / 9000); for (let i = 0; i < n; i++) ps.push(make()); };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ps.forEach(p => {
        p.y -= p.v;
        if (p.y < 0) { p.x = Math.random() * canvas.width; p.y = canvas.height + 40; p.v = Math.random() * 0.25 + 0.05; p.o = Math.random() * 0.35 + 0.15; }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`; ctx.fillRect(p.x, p.y, 0.7, 2.2);
      });
      raf = requestAnimationFrame(draw);
    };
    const onResize = () => { setSize(); init(); };
    window.addEventListener('resize', onResize);
    init(); raf = requestAnimationFrame(draw);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div style={{ position:'fixed',inset:0,background:'#09090b',display:'flex',flexDirection:'column',color:'#fafafa' }}>
      <style>{`
        .al{position:absolute;inset:0;pointer-events:none}
        .hl,.vl{position:absolute;background:#27272a}
        .hl{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:dX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vl{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0;animation:dY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hl:nth-child(1){top:18%;animation-delay:.12s}.hl:nth-child(2){top:50%;animation-delay:.22s}.hl:nth-child(3){top:82%;animation-delay:.32s}
        .vl:nth-child(4){left:22%;animation-delay:.42s}.vl:nth-child(5){left:50%;animation-delay:.54s}.vl:nth-child(6){left:78%;animation-delay:.66s}
        @keyframes dX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes dY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        .ca{opacity:0;transform:translateY(18px);animation:fU .7s cubic-bezier(.22,.61,.36,1) .35s forwards}
        @keyframes fU{to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .inp{width:100%;background:#18181b;border:1px solid #3f3f46;border-radius:8px;color:#fafafa;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
        .inp:focus{border-color:#71717a;box-shadow:0 0 0 2px rgba(113,113,122,0.2)}
        .inp::placeholder{color:#52525b}
        .btn-main{width:100%;background:#fafafa;color:#09090b;border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s}
        .btn-main:hover:not(:disabled){background:#e4e4e7}
        .btn-main:disabled{opacity:0.6;cursor:not-allowed}
        .sep-line{flex:1;height:1px;background:#27272a}
      `}</style>

      <div style={{ position:'absolute',inset:0,background:'radial-gradient(80% 60% at 50% 30%, rgba(255,255,255,0.05) 0%, transparent 60%)',pointerEvents:'none' }} />

      <div className="al" style={{ opacity:.7 }}>
        <div className="hl" /><div className="hl" /><div className="hl" />
        <div className="vl" /><div className="vl" /><div className="vl" />
      </div>

      <canvas ref={canvasRef} style={{ position:'absolute',inset:0,width:'100%',height:'100%',opacity:.5,mixBlendMode:'screen',pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ position:'relative',zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #1f1f22' }}>
        <span style={{ fontSize:'11px',letterSpacing:'.12em',textTransform:'uppercase',color:'#71717a' }}>NOVA</span>
        <button style={{ display:'flex',alignItems:'center',gap:6,background:'#18181b',border:'1px solid #27272a',borderRadius:'8px',color:'#fafafa',fontSize:'13px',padding:'6px 12px',cursor:'pointer' }}>
          Contact <ArrowRight size={14} />
        </button>
      </div>

      {/* Center */}
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',position:'relative',zIndex:10 }}>
        <div className="ca" style={{ width:'100%',maxWidth:'320px' }}>
          <div style={{ background:'rgba(24,24,27,0.8)',border:'1px solid #27272a',borderRadius:'14px',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',overflow:'hidden' }}>
            <div style={{ padding:'24px 24px 20px' }}>
              <h2 style={{ fontSize:'22px',fontWeight:700,color:'#fafafa',margin:'0 0 4px 0',lineHeight:1.2 }}>Create account</h2>
              <p style={{ fontSize:'13px',color:'#71717a',margin:'0 0 20px 0' }}>Sign up to get started</p>

              {error && (
                <div style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,padding:'10px 12px',marginBottom:16 }}>
                  <AlertCircle size={14} style={{ color:'#f87171',flexShrink:0 }} />
                  <span style={{ fontSize:'13px',color:'#f87171' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block',fontSize:'13px',color:'#a1a1aa',marginBottom:6 }}>Username</label>
                  <div style={{ position:'relative' }}>
                    <User size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#52525b',pointerEvents:'none' }} />
                    <input type="text" placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)} className="inp" style={{ padding:'9px 12px 9px 34px' }} />
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block',fontSize:'13px',color:'#a1a1aa',marginBottom:6 }}>Email</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#52525b',pointerEvents:'none' }} />
                    <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="inp" style={{ padding:'9px 12px 9px 34px' }} />
                  </div>
                </div>

                <div style={{ marginBottom:18 }}>
                  <label style={{ display:'block',fontSize:'13px',color:'#a1a1aa',marginBottom:6 }}>Password</label>
                  <div style={{ position:'relative' }}>
                    <Lock size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#52525b',pointerEvents:'none' }} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="inp" style={{ padding:'9px 36px 9px 34px' }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#71717a',cursor:'pointer',display:'flex',padding:2 }}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-main">
                  {loading
                    ? <div style={{ width:16,height:16,border:'2px solid #52525b',borderTopColor:'#09090b',borderRadius:'50%',animation:'spin .6s linear infinite',margin:'0 auto' }} />
                    : 'Continue'
                  }
                </button>
              </form>
            </div>

            <div style={{ padding:'14px 24px',borderTop:'1px solid #1f1f22',textAlign:'center' }}>
              <span style={{ fontSize:'13px',color:'#71717a' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:'#a1a1aa',textDecoration:'none',fontWeight:500 }}
                  onMouseEnter={e => e.target.style.color='#fafafa'} onMouseLeave={e => e.target.style.color='#a1a1aa'}>
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
