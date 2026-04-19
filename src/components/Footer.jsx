import { Link } from 'react-router-dom';
import BloodDropLogo from './BloodDropLogo';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      padding: '2.5rem 0 1.5rem',
      marginTop: 'auto',
    }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <BloodDropLogo size={28} />
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--red-primary)' }}>Haunted</span> Voice Universe
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              India ka pehla horror storytelling platform. Teri awaaz, teri kahani, maut ki zubaan se.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Explore
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { to: '/stories', label: 'Kahaniyaan' },
                { to: '/leaderboard', label: 'Leaderboard' },
                { to: '/leaderboard?tab=competitions', label: 'Competitions' },
                { to: '/chat', label: 'Horror Chat' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--red-primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Account
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { to: '/login', label: 'Login' },
                { to: '/register', label: 'Register' },
                { to: '/wallet', label: 'Wallet' },
                { to: '/support', label: 'Support' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--red-primary)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Haunted Voice Universe. Sab haq surakshit.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🩸 Made with blood, sweat &amp; horror
          </p>
        </div>
      </div>
    </footer>
  );
}
