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

  // API field is email_or_username — accepts both email and username
  const [form, setForm] = useState({ email_or_username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email_or_username.trim()) { toast.error('Email ya username daalo.'); return; }
    setLoading(true);
    try {
      await login(form.email_or_username.trim(), form.password);
      toast.success('Swagat hai! Andheron mein aa gaye. 🩸');
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
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1a0404 0%, #090101 70%)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <BloodDropLogo size={38} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Wapas Aao
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Andheron mein tumhara intezaar tha</p>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '1.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Email ya Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="aatma@email.com ya username"
                value={form.email_or_username}
                onChange={(e) => setForm({ ...form, email_or_username: e.target.value })}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--red-primary)' }}>
                  Bhool gaye?
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
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    fontSize: '0.8rem', cursor: 'pointer', padding: '0.2rem',
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
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginTop: '0.25rem', fontSize: '0.875rem' }}
            >
              {loading ? '🩸 Login ho raha hai...' : 'Login Karo'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Naye ho?{' '}
          <Link to="/register" style={{ color: 'var(--red-primary)', fontWeight: 600 }}>
            Free mein join karo
          </Link>
        </p>
      </div>
    </div>
  );
}
