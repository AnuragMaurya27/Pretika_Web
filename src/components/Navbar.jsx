import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { usersAPI, storiesAPI } from '../api/index';
import { getMediaUrl } from '../utils/media';
import BloodDropLogo from './BloodDropLogo';

const API_BASE = 'https://pretika-api-1.onrender.com';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { walletBalance, unreadCount } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Search state — combined stories + users
  const [searchQ, setSearchQ] = useState('');
  const [storyResults, setStoryResults] = useState([]);
  const [userResults, setUserResults]   = useState([]);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searching, setSearching]       = useState(false);
  const searchRef = useRef(null);
  const debouncedQ = useDebounce(searchQ, 300);

  useEffect(() => {
    if (debouncedQ.trim().length < 2) {
      setStoryResults([]); setUserResults([]); setSearchOpen(false); return;
    }
    setSearching(true);
    Promise.all([
      storiesAPI.list({ search: debouncedQ.trim(), page_size: 4, sort_by: 'trending' }),
      usersAPI.search(debouncedQ.trim()),
    ]).then(([sRes, uRes]) => {
      const stories = sRes.data?.data?.items || sRes.data?.data || [];
      const users   = uRes.data?.data || [];
      setStoryResults(stories.slice(0, 4));
      setUserResults(users.slice(0, 3));
      setSearchOpen(stories.length > 0 || users.length > 0);
    }).catch(() => {}).finally(() => setSearching(false));
  }, [debouncedQ]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileOpen(false);
  };

  const closeSearch = () => {
    setSearchQ(''); setStoryResults([]); setUserResults([]); setSearchOpen(false);
  };

  const goToSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchQ.trim()) return;
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  const navLinks = [
    { to: '/stories',  label: '📚 Stories' },
    { to: '/search',   label: '🔍 Search' },
    { to: '/leaderboard', label: '🏆 Leaderboard' },
    { to: '/chat',     label: '💬 Chat' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'var(--navbar-height)',
      background: 'linear-gradient(135deg, #26215C 0%, #3C3489 60%, #2D2640 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      {/* Decorative Circles matching Flutter _CircleBgPainter */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 100, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
      </div>

      <div className="container" style={{
        position: 'relative',
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: '1.25rem',
            color: '#FFFFFF', letterSpacing: '0.5px', fontWeight: 'bold'
          }}>
            Pretika<span style={{ color: 'var(--red-light)' }}>.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: isActive(l.to) ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
              background: isActive(l.to) ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { if (!isActive(l.to)) e.target.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { if (!isActive(l.to)) e.target.style.color = 'rgba(255,255,255,0.7)'; }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Search bar — combined stories + creators */}
        <div ref={searchRef} className="hide-mobile" style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <form onSubmit={goToSearch} style={{ display: 'flex' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search stories or creators..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => { if (storyResults.length > 0 || userResults.length > 0) setSearchOpen(true); }}
              style={{ fontSize: '0.8rem', padding: '0.38rem 0.7rem', width: '100%', background: 'rgba(255,255,255,0.1)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </form>

          {/* Dropdown */}
          {searchOpen && (storyResults.length > 0 || userResults.length > 0) && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
              zIndex: 200, overflow: 'hidden', minWidth: '280px',
            }}>
              {/* Story results */}
              {storyResults.length > 0 && (
                <>
                  <div style={{ padding: '0.4rem 0.75rem 0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>📚 Stories</div>
                  {storyResults.map((s) => {
                    const thumb = getMediaUrl(s.thumbnail_url);
                    return (
                      <div key={s.id} onClick={() => { closeSearch(); navigate(`/stories/${s.id}`); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '30px', height: '38px', borderRadius: '3px', background: 'var(--red-dark)', flexShrink: 0, overflow: 'hidden' }}>
                          {thumb && <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>by {s.creator_display_name || s.creator_username}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* User results */}
              {userResults.length > 0 && (
                <>
                  <div style={{ padding: '0.4rem 0.75rem 0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderTop: storyResults.length > 0 ? '1px solid var(--border)' : 'none' }}>👤 Creators</div>
                  {userResults.map((u) => (
                    <div key={u.id} onClick={() => { closeSearch(); navigate(`/profile/${u.username}`); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--red-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 700, flexShrink: 0 }}>
                        {(u.display_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.display_name || u.username}
                          {u.is_verified_creator && <span style={{ color: '#4fc3f7', marginLeft: '0.25rem', fontSize: '0.65rem' }}>✅</span>}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{u.username}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* See all results */}
              <div onClick={goToSearch} style={{
                padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border)',
                fontSize: '0.75rem', color: 'var(--red-primary)', fontWeight: 600,
                cursor: 'pointer', textAlign: 'center', transition: 'background 0.12s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🔍 See all results for "{searchQ}" →
              </div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {user ? (
            <>
              {/* Write button */}
              <Link to="/write" className="hide-mobile btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                ✍️ Write
              </Link>

              {/* Wallet */}
              <Link to="/wallet" className="hide-mobile" style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.7rem',
                background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
                color: '#FFD700', textDecoration: 'none',
                transition: 'border-color 0.2s', fontWeight: 600,
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'}
              >
                🪙 {walletBalance.toLocaleString()}
              </Link>

              {/* Notifications */}
              <Link to="/notifications" style={{
                position: 'relative', display: 'flex', alignItems: 'center',
                padding: '0.38rem',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-sm)', color: '#FFFFFF',
                transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red-light)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#FFFFFF'; }}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: 'var(--red-primary)', color: 'white',
                    borderRadius: '50%', width: '16px', height: '16px',
                    fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.65rem',
                    color: '#FFFFFF', fontSize: '0.85rem',
                    cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                >
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'var(--red-primary)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                    color: 'white', flexShrink: 0,
                  }}>
                    {(user.display_name || user.username || 'U')[0].toUpperCase()}
                  </span>
                  <span className="hide-mobile">{user.display_name || user.username}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>▾</span>
                </button>

                {profileOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setProfileOpen(false)} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                      background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)', minWidth: '180px',
                      boxShadow: 'var(--shadow-lg)', zIndex: 11,
                      overflow: 'hidden', animation: 'slideUp 0.15s ease',
                    }}>
                      {[
                        { to: `/profile/${user.username}`, label: '👤 My Profile' },
                        { to: '/write', label: '✍️ My Stories' },
                        { to: '/wallet', label: '🪙 Wallet' },
                        { to: '/notifications', label: '🔔 Notifications' },
                        { to: '/support', label: '🎫 Support' },
                        ...(['admin','super_admin','moderator','finance_manager','content_reviewer','support_agent'].includes(user.role) ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          style={{
                            display: 'block', padding: '0.65rem 1rem',
                            fontSize: '0.875rem', color: 'var(--text-secondary)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--bg-card-hover)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          {item.label}
                        </Link>
                      ))}
                      <div style={{ height: '1px', background: 'var(--border)', margin: '0.25rem 0' }} />
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '0.65rem 1rem', background: 'none', border: 'none',
                          fontSize: '0.875rem', color: 'var(--red-light)', cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Join Free</Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            className="hide-desktop"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.4rem', padding: '0.25rem' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
          padding: '0.5rem 1rem', boxShadow: '0 4px 12px rgba(139,0,30,0.08)',
        }}>
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '0.55rem 0.5rem', color: isActive(l.to) ? 'var(--red-primary)' : 'var(--text-secondary)', fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>
              {l.label}
            </Link>
          ))}
          <Link to="/search" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '0.55rem 0.5rem', color: isActive('/search') ? 'var(--red-primary)' : 'var(--text-secondary)', fontSize: '0.875rem', borderBottom: '1px solid var(--border)' }}>
            🔍 Advanced Search
          </Link>
          {user && (
            <Link to="/write" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '0.55rem 0.5rem', color: 'var(--red-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
              ✍️ Write Your Story
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
