import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import BloodDropLogo from '../../components/BloodDropLogo';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email_or_username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email_or_username.trim()) { toast.error('Enter email or username.'); return; }
    setLoading(true);
    try {
      await login(form.email_or_username.trim(), form.password);
      toast.success('Welcome back! 🩸');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAFA',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Pretika Theme Rounded Background Circles */}
      <div style={{ position: 'absolute', top: -150, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(229,9,20,0.08) 0%, rgba(229,9,20,0) 100%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -50, right: -150, width: 300, height: 300, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(229,9,20,0.12) 0%, rgba(229,9,20,0) 100%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: -100, left: '20%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(229,9,20,0.03)', zIndex: 0 }} />

      <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' }}>
            <div style={{ 
              width: '72px', height: '72px', background: '#FFFFFF', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              boxShadow: '0 8px 20px rgba(229,9,20,0.15)', border: '1px solid rgba(229,9,20,0.05)'
            }}>
              <BloodDropLogo size={36} />
            </div>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', color: '#1A1A1A', marginBottom: '0.25rem', fontWeight: 700 }}>
            Welcome Back
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666666' }}>Sign in to continue your journey</p>
        </div>

        <div style={{
          background: '#FFFFFF', border: '1px solid #EBEBEB',
          borderRadius: 'var(--radius-lg)', padding: '2rem 1.75rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: '#444444', fontWeight: 600, fontSize: '0.85rem' }}>Email or Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="aatma@email.com or username"
                value={form.email_or_username}
                onChange={(e) => setForm({ ...form, email_or_username: e.target.value })}
                autoComplete="username"
                required
                style={{ background: '#F8F9FA', color: '#1A1A1A', border: '1px solid #E2E8F0', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ color: '#444444', fontWeight: 600, fontSize: '0.85rem', marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--red-primary)', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                  style={{ background: '#F8F9FA', color: '#1A1A1A', border: '1px solid #E2E8F0', padding: '0.65rem', paddingRight: '2.5rem', borderRadius: 'var(--radius-sm)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#888888',
                    fontSize: '0.9rem', cursor: 'pointer', padding: '0.2rem',
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600, borderRadius: 'var(--radius-md)' }}
            >
              {loading ? '🩸 Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#666666' }}>
          New here?{' '}
          <Link to="/register" style={{ color: 'var(--red-primary)', fontWeight: 600 }}>
            Join for free
          </Link>
        </p>
      </div>
    </div>
  );
}
