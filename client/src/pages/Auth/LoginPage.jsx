import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Users, Calculator, UserCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@peoplepay360.com');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state?.from?.pathname && location.state.from.pathname !== '/login')
    ? location.state.from.pathname
    : '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, password);
      toast.success('Signed in successfully');
      const target = userData?.role === 'EMPLOYEE' ? '/portal' : (location.state?.from?.pathname || '/dashboard');
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 35%, #fdf2f8 70%, #fefce8 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Soft Pastel Orbs */}
      <div style={{
        position: 'absolute',
        width: '520px',
        height: '520px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167, 243, 208, 0.45) 0%, rgba(199, 210, 254, 0.2) 50%, transparent 70%)',
        top: '-160px',
        right: '-100px',
        pointerEvents: 'none',
        filter: 'blur(30px)',
        animation: 'floatOrb 10s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '460px',
        height: '460px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253, 230, 138, 0.45) 0%, rgba(254, 205, 211, 0.3) 50%, transparent 70%)',
        bottom: '-120px',
        left: '-100px',
        pointerEvents: 'none',
        filter: 'blur(30px)',
        animation: 'floatOrb 14s ease-in-out infinite reverse'
      }} />

      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '22px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 20px 45px -10px rgba(148, 163, 184, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.8)',
        padding: '38px 32px',
        position: 'relative',
        zIndex: 1,
        animation: 'springUp 300ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '22px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            letterSpacing: '-0.02em'
          }}>
            P3
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
            PeoplePay<span style={{ color: '#6366f1' }}>360</span>
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '6px' }}>
            Enterprise HR & Automated Payroll Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
              Corporate Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-email"
                name="email"
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@peoplepay360.com"
                className="form-input"
                style={{ paddingLeft: '42px', height: '46px', fontSize: '0.92rem' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-password"
                name="password"
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '42px', height: '46px', fontSize: '0.92rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              height: '46px',
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '6px'
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to PeoplePay360</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Fill */}
        <div style={{ marginTop: '26px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{
            fontSize: '0.74rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748b',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: 700
          }}>
            1-Click Demo Profiles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@peoplepay360.com', 'Password@123')}
              style={{
                padding: '10px 12px',
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                color: '#5b21b6',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <ShieldCheck size={16} color="#7c3aed" />
              <span>Super Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('hr.manager@peoplepay360.com', 'Password@123')}
              style={{
                padding: '10px 12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '10px',
                color: '#0369a1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Users size={16} color="#0284c7" />
              <span>HR Manager</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('payroll.manager@peoplepay360.com', 'Password@123')}
              style={{
                padding: '10px 12px',
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '10px',
                color: '#4338ca',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Calculator size={16} color="#4f46e5" />
              <span>Payroll Lead</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('aisha.verma@peoplepay360.com', 'Password@123')}
              style={{
                padding: '10px 12px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                color: '#065f46',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <UserCheck size={16} color="#059669" />
              <span>Staff Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
