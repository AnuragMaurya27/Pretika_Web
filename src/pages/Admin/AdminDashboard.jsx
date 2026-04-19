import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, storiesAPI } from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

const ALLOWED_ROLES = ['admin', 'super_admin', 'moderator', 'finance_manager'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('war_room');
  const [warRoom, setWarRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [banModal, setBanModal] = useState({ open: false, user: null });
  const [banReason, setBanReason] = useState('');

  // Stories
  const [stories, setStories] = useState([]);
  const [removeModal, setRemoveModal] = useState({ open: false, story: null });
  const [removeReason, setRemoveReason] = useState('');

  // Reports
  const [reports, setReports] = useState([]);
  const [resolveModal, setResolveModal] = useState({ open: false, report: null });

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);

  // Announcements
  const [announcements, setAnnouncements] = useState([]);
  const [annModal, setAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', content: '', type: 'info', is_pinned: false });

  // Analytics
  const [analytics, setAnalytics] = useState(null);

  // Fraud
  const [fraudAlerts, setFraudAlerts] = useState([]);

  // Pending Creators
  const [pendingCreators, setPendingCreators] = useState([]);

  // Categories
  const [categories, setCategories] = useState([]);
  const [catForm, setCatForm] = useState({ name: '', description: '', iconUrl: '' });
  const [catSaving, setCatSaving] = useState(false);

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }
    loadWarRoom();
  }, [user]);

  useEffect(() => {
    switch (activeTab) {
      case 'war_room': loadWarRoom(); break;
      case 'users': loadUsers(); break;
      case 'stories': loadStories(); break;
      case 'reports': loadReports(); break;
      case 'withdrawals': loadWithdrawals(); break;
      case 'announcements': loadAnnouncements(); break;
      case 'analytics': loadAnalytics(); break;
      case 'fraud': loadFraud(); break;
      case 'creators': loadPendingCreators(); break;
      case 'categories': loadCategories(); break;
    }
  }, [activeTab]);

  const loadWarRoom = async () => {
    try {
      const res = await adminAPI.getWarRoom();
      setWarRoom(res.data?.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const res = await adminAPI.getUsers({ page_size: 20 });
      const d = res.data?.data;
      setUsers(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const searchUsers = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.getUsers({ search: userSearch, page_size: 20 });
      const d = res.data?.data;
      setUsers(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const loadStories = async () => {
    try {
      const res = await adminAPI.getStories({ page_size: 20 });
      const d = res.data?.data;
      setStories(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const loadReports = async () => {
    try {
      const res = await adminAPI.getReports({ page_size: 20 });
      const d = res.data?.data;
      setReports(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await adminAPI.getWithdrawals({ status: 'pending', page_size: 20 });
      const d = res.data?.data;
      setWithdrawals(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await adminAPI.getAnnouncements();
      setAnnouncements(res.data?.data || []);
    } catch { /* ignore */ }
  };

  const loadAnalytics = async () => {
    try {
      const res = await adminAPI.getAnalytics();
      setAnalytics(res.data?.data);
    } catch { /* ignore */ }
  };

  const loadFraud = async () => {
    try {
      const res = await adminAPI.getFraudAlerts({ status: 'open' });
      const d = res.data?.data;
      setFraudAlerts(d?.items || d || []);
    } catch { /* ignore */ }
  };

  const loadPendingCreators = async () => {
    try {
      const res = await adminAPI.getPendingCreators();
      setPendingCreators(res.data?.data || []);
    } catch { /* ignore */ }
  };

  const loadCategories = async () => {
    try {
      const res = await storiesAPI.getCategories();
      setCategories(res.data?.data || []);
    } catch { /* ignore */ }
  };

  const handleCreateCategory = async () => {
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      const res = await storiesAPI.createCategory({ name: catForm.name.trim(), description: catForm.description || undefined, icon_url: catForm.iconUrl || undefined });
      const cat = res.data?.data;
      if (cat) {
        setCategories((prev) => prev.some((c) => c.id === cat.id) ? prev : [...prev, cat]);
        setCatForm({ name: '', description: '', iconUrl: '' });
        toast.success(`"${cat.name}" category ban gayi!`);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Category nahi bani.'); }
    finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`"${cat.name}" delete karna hai?`)) return;
    try {
      await storiesAPI.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast.success('Category delete ho gayi!');
    } catch (err) { toast.error(err.response?.data?.message || 'Delete nahi hua.'); }
  };

  const banUser = async () => {
    try {
      await adminAPI.banUser(banModal.user.id, { reason: banReason, duration_days: 30 });
      toast.success('User ban ho gaya.');
      setBanModal({ open: false, user: null });
      setBanReason('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ban fail ho gaya.');
    }
  };

  const removeStory = async () => {
    try {
      await adminAPI.removeStory(removeModal.story.id, { reason: removeReason });
      toast.success('Story remove ho gayi.');
      setRemoveModal({ open: false, story: null });
      setRemoveReason('');
      loadStories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Remove fail ho gayi.');
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await adminAPI.resolveReport(reportId, { action, notes: '' });
      toast.success('Report resolve ho gayi.');
      loadReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resolve fail ho gayi.');
    }
  };

  const approveWithdrawal = async (id) => {
    try {
      await adminAPI.approveWithdrawal(id, { transaction_id: 'TXN_' + Date.now() });
      toast.success('Withdrawal approve ho gayi!');
      loadWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve fail ho gayi.');
    }
  };

  const rejectWithdrawal = async (id) => {
    try {
      await adminAPI.rejectWithdrawal(id, { reason: 'Admin reject' });
      toast.success('Withdrawal reject ho gayi.');
      loadWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject fail ho gayi.');
    }
  };

  const createAnnouncement = async () => {
    try {
      await adminAPI.createAnnouncement(annForm);
      toast.success('Announcement post ho gayi!');
      setAnnModal(false);
      setAnnForm({ title: '', content: '', type: 'info', is_pinned: false });
      loadAnnouncements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Announcement fail ho gayi.');
    }
  };

  const approveCreator = async (id) => {
    try {
      await adminAPI.approveCreator(id, { message: 'Approved!' });
      toast.success('Creator approved!');
      loadPendingCreators();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve fail ho gaya.');
    }
  };

  const featureStory = async (id) => {
    try {
      await adminAPI.featureStory(id, { is_featured: true, position: 1 });
      toast.success('Story featured!');
      loadStories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Feature fail ho gayi.');
    }
  };

  if (loading) return <Spinner fullPage />;

  const TABS = [
    { key: 'war_room', label: '🔴 War Room' },
    { key: 'creators', label: '✍️ Creators' },
    { key: 'users', label: '👥 Users' },
    { key: 'stories', label: '📚 Stories' },
    { key: 'reports', label: '🚩 Reports' },
    { key: 'withdrawals', label: '💸 Withdrawals' },
    { key: 'announcements', label: '📢 Announcements' },
    { key: 'fraud', label: '⚠️ Fraud' },
    { key: 'analytics', label: '📊 Analytics' },
    { key: 'categories', label: '🎭 Categories' },
  ];

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem' }}>
            ⚙️ <span style={{ color: 'var(--red-primary)' }}>Admin</span> Dashboard
          </h1>
          <span className="badge badge-red">RESTRICTED</span>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── War Room ── */}
        {activeTab === 'war_room' && warRoom && (
          <div>
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              {[
                { label: '👥 Total Users', value: warRoom.total_users?.toLocaleString() || 0 },
                { label: '📚 Total Stories', value: warRoom.total_stories?.toLocaleString() || 0 },
                { label: '🟢 Active Today', value: warRoom.dau?.toLocaleString() || warRoom.active_users_today || 0 },
                { label: '🪙 Coins Circulating', value: (warRoom.total_coins_circulating || 0).toLocaleString() },
                { label: '🚩 Open Reports', value: warRoom.open_reports || 0 },
                { label: '💸 Pending Withdrawals', value: warRoom.pending_withdrawals || 0 },
                { label: '⚠️ Fraud Alerts', value: warRoom.open_fraud_alerts || 0 },
                { label: '✍️ Pending Creators', value: warRoom.pending_creator_applications || 0 },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-primary)' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Creators ── */}
        {activeTab === 'creators' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginBottom: '1rem' }}>
              Pending Creator Applications ({pendingCreators.length})
            </h2>
            {pendingCreators.length === 0 ? (
              <div className="empty-state"><p>Koi pending application nahi.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingCreators.map((c) => (
                  <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.display_name || c.username}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{c.username} • {c.email}</p>
                        {c.application_note && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{c.application_note}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => approveCreator(c.id)}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => adminAPI.rejectCreator(c.id, { reason: 'Not eligible' }).then(loadPendingCreators)}>✗ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div>
            <form onSubmit={searchUsers} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input type="text" className="form-input" placeholder="Username ya email se dhundho..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-outline">🔍 Dhundho</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {users.map((u) => (
                <div key={u.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{u.display_name || u.username}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username} • {u.email} • {u.role}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {u.is_banned ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => adminAPI.unbanUser(u.id).then(() => { toast.success('Unban ho gaya.'); loadUsers(); })}>
                        Unban
                      </button>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => setBanModal({ open: true, user: u })}>🚫 Ban</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => adminAPI.verifyCreator(u.id).then(() => { toast.success('Verify ho gaya!'); loadUsers(); })}>
                      ✅ Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stories ── */}
        {activeTab === 'stories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stories.map((s) => (
              <div key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {s.author_username} • 👁 {s.view_count || 0}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!s.is_featured && <button className="btn btn-ghost btn-sm" onClick={() => featureStory(s.id)}>⭐ Feature</button>}
                  <button className="btn btn-danger btn-sm" onClick={() => setRemoveModal({ open: true, story: s })}>🗑 Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Reports ── */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {reports.length === 0 ? <div className="empty-state"><p>Koi pending report nahi. 🎉</p></div> : (
              reports.map((r) => (
                <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span className="badge badge-red">{r.report_type}</span>
                        <span className="badge badge-muted">{r.content_type}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.reason}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reporter: {r.reporter_username}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => resolveReport(r.id, 'remove_content')}>Remove Content</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => resolveReport(r.id, 'dismiss')}>Dismiss</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Withdrawals ── */}
        {activeTab === 'withdrawals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {withdrawals.length === 0 ? <div className="empty-state"><p>Koi pending withdrawal nahi.</p></div> : (
              withdrawals.map((w) => (
                <div key={w.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {w.username} — 🪙 {w.coins} (₹{(w.coins / 10).toFixed(0)})
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UPI: {w.upi_id} • {new Date(w.created_at).toLocaleDateString('hi-IN')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => approveWithdrawal(w.id)}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => rejectWithdrawal(w.id)}>✗ Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Announcements ── */}
        {activeTab === 'announcements' && (
          <div>
            <button className="btn btn-primary btn-sm" style={{ marginBottom: '1rem' }} onClick={() => setAnnModal(true)}>
              + New Announcement
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {announcements.map((a) => (
                <div key={a.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString('hi-IN')}</p>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => adminAPI.deleteAnnouncement(a.id).then(() => { toast.success('Delete ho gayi.'); loadAnnouncements(); })}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Fraud ── */}
        {activeTab === 'fraud' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {fraudAlerts.length === 0 ? <div className="empty-state"><p>Koi open fraud alert nahi. 🎉</p></div> : (
              fraudAlerts.map((f) => (
                <div key={f.id} style={{ background: 'var(--bg-card)', border: '1px solid #8B0000', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge badge-red" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>{f.alert_type}</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{f.description}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User: {f.username} • Severity: {f.severity}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => adminAPI.resolveFraudAlert(f.id, { action: 'dismiss', notes: '' }).then(() => { toast.success('Alert resolve ho gaya.'); loadFraud(); })}>
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Analytics ── */}
        {activeTab === 'analytics' && analytics && (
          <div>
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
              {[
                { label: '📅 DAU', value: (analytics.dau || 0).toLocaleString() },
                { label: '📅 MAU', value: (analytics.mau || 0).toLocaleString() },
                { label: '🪙 Revenue (Coins)', value: (analytics.total_revenue_coins || 0).toLocaleString() },
                { label: '📖 Stories Published', value: (analytics.stories_published_today || 0).toLocaleString() },
                { label: '👥 New Users Today', value: (analytics.new_users_today || 0).toLocaleString() },
                { label: '📊 Transactions', value: (analytics.total_transactions || 0).toLocaleString() },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--text-primary)' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* 30-day graph placeholder */}
            {analytics.daily_metrics?.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', marginBottom: '1rem' }}>30-Day Active Users</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
                  {analytics.daily_metrics.map((m, i) => {
                    const max = Math.max(...analytics.daily_metrics.map((x) => x.active_users || 1));
                    const height = Math.max(4, ((m.active_users || 0) / max) * 80);
                    return (
                      <div key={i} title={`${m.date}: ${m.active_users}`} style={{ flex: 1, background: 'var(--red-dark)', height: `${height}px`, borderRadius: '2px 2px 0 0', transition: 'background 0.2s', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--red-primary)'}
                        onMouseLeave={(e) => e.target.style.background = 'var(--red-dark)'}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── CATEGORIES ─────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div style={{ maxWidth: '680px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1.25rem' }}>🎭 Category Management</h2>

            {/* Create new category */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.875rem' }}>➕ Nai Category Banao</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input
                  type="text" className="form-input"
                  placeholder="Category Name (e.g. Horror, Ghost Stories, Thriller)"
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                />
                <input
                  type="text" className="form-input"
                  placeholder="Description (optional)"
                  value={catForm.description}
                  onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                />
                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={handleCreateCategory}
                  disabled={catSaving || !catForm.name.trim()}
                >
                  {catSaving ? '⏳ Bana raha hai...' : '🎭 Category Banao'}
                </button>
              </div>
            </div>

            {/* Category list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {categories.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Koi category nahi hai. Upar se banao!</p>
              ) : categories.map((cat) => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.7rem 0.875rem' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</p>
                    {cat.description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.description}</p>}
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>slug: {cat.slug}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red-primary)', fontSize: '0.75rem' }}
                    onClick={() => handleDeleteCategory(cat)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      <Modal isOpen={banModal.open} onClose={() => setBanModal({ open: false, user: null })} title="User Ban Karo">
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
          {banModal.user?.username} ko 30 din ke liye ban karoge?
        </p>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Reason</label>
          <textarea className="form-input" rows={3} value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Ban ka reason..." />
        </div>
        <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={banUser}>
          🚫 Ban Karo
        </button>
      </Modal>

      {/* Remove Story Modal */}
      <Modal isOpen={removeModal.open} onClose={() => setRemoveModal({ open: false, story: null })} title="Story Remove Karo">
        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>"{removeModal.story?.title}" remove karoge?</p>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Reason</label>
          <textarea className="form-input" rows={3} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Remove ka reason..." />
        </div>
        <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={removeStory}>
          🗑 Remove Karo
        </button>
      </Modal>

      {/* Announcement Modal */}
      <Modal isOpen={annModal} onClose={() => setAnnModal(false)} title="Naya Announcement">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input type="text" className="form-input" value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Announcement title..." />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-input" rows={4} value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Announcement content..." />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={annForm.type} onChange={(e) => setAnnForm({ ...annForm, type: e.target.value })}>
              {['info', 'warning', 'success', 'danger', 'maintenance'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={annForm.is_pinned} onChange={(e) => setAnnForm({ ...annForm, is_pinned: e.target.checked })} style={{ accentColor: 'var(--red-primary)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Pin karo</span>
          </label>
          <button className="btn btn-primary" onClick={createAnnouncement}>📢 Post Karo</button>
        </div>
      </Modal>
    </div>
  );
}
