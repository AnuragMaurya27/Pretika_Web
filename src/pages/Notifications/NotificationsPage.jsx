import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';

const NOTIF_ICONS = {
  new_follower: '👥', new_comment: '💬', comment_like: '❤️', story_appreciation: '🪙',
  story_featured: '⭐', new_chapter: '📖', competition_result: '🏆', system: '🔔',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { setUnreadCount } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(null);
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadNotifications();
  }, [user, page]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [nRes, pRes] = await Promise.all([
        notificationsAPI.getList(page),
        notificationsAPI.getPreferences(),
      ]);
      const d = nRes.data?.data;
      setNotifications(d?.items || d || []);
      setTotalPages(d?.total_pages || 1);
      setPreferences(pRes.data?.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Sab notifications read mark ho gayi!');
    } catch { /* ignore */ }
  };

  const deleteNotif = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.info('Notification delete ho gayi.');
    } catch { /* ignore */ }
  };

  const savePreferences = async (prefs) => {
    try {
      await notificationsAPI.updatePreferences(prefs);
      setPreferences(prefs);
      toast.success('Preferences save ho gayi!');
    } catch { /* ignore */ }
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>
            🔔 <span style={{ color: 'var(--red-primary)' }}>Notifications</span>
          </h1>
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            ✓ Sab Read Karo
          </button>
        </div>

        <div className="tabs">
          {[{ key: 'list', label: '🔔 Sab' }, { key: 'prefs', label: '⚙️ Settings' }].map((t) => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          loading ? <Spinner size={40} /> : notifications.length === 0 ? (
            <div className="empty-state"><p>🔔 Koi notification nahi abhi.</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{
                    display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                    background: n.is_read ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    border: `1px solid ${n.is_read ? 'var(--border)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                    onClick={() => { if (!n.is_read) markRead(n.id); }}
                  >
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{NOTIF_ICONS[n.type] || '🔔'}</span>
                    <div style={{ flex: 1 }}>
                      {n.title && <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{n.title}</p>}
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{n.message || n.body}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {new Date(n.created_at).toLocaleString('hi-IN')}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red-primary)', flexShrink: 0, marginTop: '4px' }} />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer', padding: '0.15rem', flexShrink: 0 }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--red-primary)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )
        )}

        {activeTab === 'prefs' && preferences && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '1rem' }}>
              Notification Preferences
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(preferences).filter(([k]) => k !== 'id' && k !== 'user_id').map(([key, val]) => (
                typeof val === 'boolean' && (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={() => savePreferences({ ...preferences, [key]: !val })}
                      style={{ accentColor: 'var(--red-primary)', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </label>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
