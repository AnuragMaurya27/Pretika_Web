import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import BloodDropLogo from '../../components/BloodDropLogo';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', display_name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Password match nahi karta!'); return; }
    if (form.password.length < 8) { toast.error('Password kam se kam 8 characters ka hona chahiye.'); return; }
    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, display_name: form.display_name, password: form.password });
      toast.success('Account ban gaya! Email verify karo.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a0404 0%, var(--bg-primary) 60%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)', padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <BloodDropLogo size={44} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--text-primary)' }}>
            Andheron Mein Aao
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Horror Universe ka hissa bano — bilkul free
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input type="text" className="form-input" placeholder="horror_king" value={form.username} onChange={set('username')} required minLength={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input type="text" className="form-input" placeholder="Mrityu Kavi" value={form.display_name} onChange={set('display_name')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" className="form-input" placeholder="aatma@email.com" value={form.email} onChange={set('email')} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input type="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required minLength={8} />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <input type="password" className="form-input" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}>
            {loading ? '🩸 Ban raha hai...' : '🩸 Horror Universe Join Karo'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Pehle se ho?{' '}
          <Link to="/login" style={{ color: 'var(--red-primary)', fontWeight: 600 }}>
            Login karo
          </Link>
        </p>
      </div>
    </div>
  );
}
