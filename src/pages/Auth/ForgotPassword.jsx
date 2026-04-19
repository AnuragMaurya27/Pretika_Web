import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../api/index';
import { useToast } from '../../components/Toast';
import BloodDropLogo from '../../components/BloodDropLogo';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Reset link bhej diya! Email check karo.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kuch galat ho gaya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1a0404 0%, var(--bg-primary) 60%)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)', padding: '2.5rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <BloodDropLogo size={44} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem' }}>Password Bhool Gaye?</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Email dalo, reset link bhej dete hain
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Reset link bhej diya {email} par. Email check karo!
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
              Login Page Par Jao
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email" className="form-input" placeholder="aatma@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              {loading ? 'Bhej raha hai...' : '📧 Reset Link Bhejo'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--red-primary)' }}>← Login page par jao</Link>
        </p>
      </div>
    </div>
  );
}
