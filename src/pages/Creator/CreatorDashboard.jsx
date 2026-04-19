import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { storiesAPI, usersAPI, creatorAPI, walletAPI } from '../../api/index';
import { getMediaUrl } from '../../utils/media';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import CoverImageEditor from '../../components/CoverImageEditor';

// ── Helpers ───────────────────────────────────────────────────────────────────
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const readMin = (words) => Math.max(1, Math.ceil(words / 200));
const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n || 0);
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'abhi save hua';
  if (diff < 3600) return `${Math.floor(diff / 60)} min pehle`;
  return `${Math.floor(diff / 3600)} ghante pehle`;
};

const STATUS = {
  draft:     { bg: 'rgba(136,85,85,0.15)', color: '#aa7777', label: 'Draft' },
  published: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: 'Live' },
  archived:  { bg: 'rgba(212,175,55,0.12)', color: '#D4AF37', label: 'Archived' },
};

const emptyStory = { title: '', summary: '', category_id: '', story_type: 'single', language: 'hindi', age_rating: 'all', tags: [], thumbnail_url: '' };
const emptyEp    = { title: '', content: '', access_type: 'free', unlock_coin_cost: 0 };
const emptyApply = { bio: '', motivation: '', writing_sample: '' };

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33`, borderRadius: '20px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3px' }}>
      {s.label}
    </span>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel, danger = true }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '1.5rem', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>{msg}</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Haan, karo</button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const CREATOR_ROLES = ['creator', 'admin', 'super_admin', 'moderator', 'finance_manager', 'content_reviewer'];
  const isCreator = !!(user?.is_creator || CREATOR_ROLES.includes(user?.role));

  // ── Views: 'apply' | 'dashboard' | 'story-form' | 'writer' ─────────────────
  const [view, setView] = useState(isCreator ? 'dashboard' : 'apply');

  // ── Data ─────────────────────────────────────────────────────────────────────
  const [stories, setStories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isCreator);
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedStory, setSelectedStory] = useState(null);
  const [episodes, setEpisodes]     = useState([]);
  const [epLoading, setEpLoading]   = useState(false);

  // Story form
  const [storyForm, setStoryForm]   = useState(emptyStory);
  const [editingStory, setEditingStory] = useState(null);
  const [tagInput, setTagInput]     = useState('');
  const [saving, setSaving]         = useState(false);

  // Episode writer
  const [epForm, setEpForm]         = useState(emptyEp);
  const [editingEp, setEditingEp]   = useState(null);
  const [epSaving, setEpSaving]     = useState(false);
  const [autoSaved, setAutoSaved]   = useState(null);
  const autoSaveRef                  = useRef(null);
  const writerRef                    = useRef(null);

  // Apply Creator
  const [applyForm, setApplyForm]   = useState(emptyApply);
  const [applying, setApplying]     = useState(false);
  const [applied, setApplied]       = useState(false);

  // Confirm dialog
  const [confirm, setConfirm]       = useState(null); // { msg, onConfirm }

  // New category creation
  const [newCatInput, setNewCatInput] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [showNewCat, setShowNewCat]   = useState(false);

  // ── Creator Dashboard Tabs ─────────────────────────────────────────────────
  const [dashTab, setDashTab]       = useState('overview');   // 'overview' | 'stories' | 'revenue'
  const [creatorStats, setCreatorStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const refreshStories = useCallback(() => {
    storiesAPI.getMyStories({ status: statusFilter || undefined })
      .then((sRes) => {
        const d = sRes.data?.data;
        const list = Array.isArray(d) ? d : (d?.items || []);
        setStories(list);
        setSelectedStory((prev) => prev ? (list.find((s) => s.id === prev.id) || prev) : null);
      }).catch((err) => {
        console.error('getMyStories error:', err.response?.data || err.message);
      });
  }, [statusFilter]);

  useEffect(() => {
    if (!isCreator) return;
    setLoading(true);
    Promise.all([
      storiesAPI.getMyStories({ status: statusFilter || undefined }),
      storiesAPI.getCategories(),
    ]).then(([sRes, cRes]) => {
      const d = sRes.data?.data;
      const list = Array.isArray(d) ? d : (d?.items || []);
      setStories(list);
      const cats = cRes.data?.data;
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch((err) => {
      console.error('Dashboard load error:', err.response?.data || err.message);
    }).finally(() => setLoading(false));
  }, [isCreator, statusFilter]);

  useEffect(() => {
    if (!selectedStory) return;
    setEpLoading(true);
    storiesAPI.getEpisodes(selectedStory.id)
      .then((r) => {
        const d = r.data?.data;
        setEpisodes(Array.isArray(d) ? d : (d?.items || []));
      })
      .catch((err) => {
        console.error('getEpisodes error:', err.response?.data || err.message);
        setEpisodes([]);
      })
      .finally(() => setEpLoading(false));
  }, [selectedStory]);

  // ── Load Creator Stats (for overview & revenue tabs) ──────────────────────
  useEffect(() => {
    if (!isCreator) return;
    setStatsLoading(true);
    creatorAPI.getStats()
      .then((res) => setCreatorStats(res.data?.data || null))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [isCreator]);

  // ── Auto-save hint (just UI) ─────────────────────────────────────────────────
  const onContentChange = useCallback((val) => {
    setEpForm((f) => ({ ...f, content: val }));
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => setAutoSaved(new Date()), 3000);
  }, []);

  // ── Apply Creator ────────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!applyForm.bio.trim()) { toast.error('Bio zaroori hai.'); return; }
    setApplying(true);
    try {
      await usersAPI.applyCreator({ bio: applyForm.bio, motivation: applyForm.motivation, writing_sample: applyForm.writing_sample });
      setApplied(true);
      toast.success('Application submit ho gayi! 24-48 hrs mein review hogi. 🎉');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('pending')) {
        setApplied(true); toast.info('Aapki application already pending hai.');
      } else {
        toast.error(msg || 'Apply nahi hua. Dobara try karo.');
      }
    } finally { setApplying(false); }
  };

  // ── Story CRUD ───────────────────────────────────────────────────────────────
  const handleSaveStory = async () => {
    if (!storyForm.title.trim()) { toast.error('Title required hai.'); return; }
    setSaving(true);
    try {
      const pl = {
        title: storyForm.title.trim(),
        story_type: storyForm.story_type,
        language: storyForm.language,
        age_rating: storyForm.age_rating,
        ...(storyForm.summary?.trim() && { summary: storyForm.summary.trim() }),
        ...(storyForm.category_id && { category_id: storyForm.category_id }),
        ...(storyForm.tags.length > 0 && { tags: storyForm.tags }),
        ...(storyForm.thumbnail_url?.trim() && { thumbnail_url: storyForm.thumbnail_url.trim() }),
      };
      if (editingStory) {
        const r = await storiesAPI.update(editingStory.id, pl);
        const upd = r.data?.data || { ...editingStory, ...pl };
        setStories((p) => p.map((s) => s.id === editingStory.id ? upd : s));
        if (selectedStory?.id === editingStory.id) setSelectedStory(upd);
        toast.success('Story update ho gayi! ✍️');
      } else {
        const r = await storiesAPI.create(pl);
        const cr = r.data?.data;
        if (cr) {
          setStories((p) => [cr, ...p]);
          setSelectedStory(cr);
        }
        toast.success('Story ban gayi! Ab pehla episode likho. 🩸');
      }
      setStoryForm(emptyStory); setEditingStory(null); setTagInput('');
      setView('dashboard');
      // Reload to get latest server state
      setTimeout(() => refreshStories(), 500);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.title || err.message || 'Story save nahi hui.';
      // If not a creator, direct them to apply
      if (msg.toLowerCase().includes('creator')) {
        toast.error('Pehle Creator ban jao — Profile > Creator Apply karo ya admin se is_creator=true set karwao.');
      } else {
        toast.error(msg);
      }
    } finally { setSaving(false); }
  };

  const handlePublishStory = async (s) => {
    try {
      await storiesAPI.publish(s.id);
      const upd = { ...s, status: 'published' };
      setStories((p) => p.map((x) => x.id === s.id ? upd : x));
      if (selectedStory?.id === s.id) setSelectedStory(upd);
      toast.success('Story publish ho gayi! 🎉');
    } catch (err) { toast.error(err.response?.data?.message || 'Publish nahi hua.'); }
  };

  const handleUnpublishStory = async (s) => {
    try {
      await storiesAPI.unpublish(s.id);
      const upd = { ...s, status: 'draft' };
      setStories((p) => p.map((x) => x.id === s.id ? upd : x));
      if (selectedStory?.id === s.id) setSelectedStory(upd);
      toast.info('Story unpublish ho gayi.');
    } catch (err) { toast.error(err.response?.data?.message || 'Nahi hua.'); }
  };

  const handleDeleteStory = (s) => {
    setConfirm({
      msg: `"${s.title}" aur uske saare episodes permanently delete ho jayenge. Kya pakka delete karna hai?`,
      onConfirm: async () => {
        try {
          await storiesAPI.delete(s.id);
          setStories((p) => p.filter((x) => x.id !== s.id));
          if (selectedStory?.id === s.id) setSelectedStory(null);
          setConfirm(null);
          toast.success('Story delete ho gayi.');
        } catch (err) { toast.error(err.response?.data?.message || 'Delete nahi hua.'); }
      },
    });
  };

  const startEditStory = (s) => {
    setStoryForm({ title: s.title, summary: s.summary || '', category_id: s.category_id || '', story_type: s.story_type || 'single', language: s.language || 'hindi', age_rating: s.age_rating || 'all', tags: s.tags || [], thumbnail_url: s.thumbnail_url || '' });
    setEditingStory(s); setTagInput(''); setView('story-form');
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (t && !storyForm.tags.includes(t) && storyForm.tags.length < 10)
      setStoryForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const handleCreateCategory = async () => {
    if (!newCatInput.trim()) return;
    setCreatingCat(true);
    try {
      const res = await storiesAPI.createCategory({ name: newCatInput.trim() });
      const cat = res.data?.data;
      if (cat) {
        setCategories((prev) => prev.some((c) => c.id === cat.id) ? prev : [...prev, cat]);
        setStoryForm((f) => ({ ...f, category_id: cat.id }));
        toast.success(`"${cat.name}" category ban gayi! ✅`);
        setNewCatInput(''); setShowNewCat(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Category nahi bani.');
    } finally { setCreatingCat(false); }
  };

  // ── Episode CRUD ─────────────────────────────────────────────────────────────
  const openWriter = async (ep = null) => {
    if (ep) {
      // Fetch full episode content — list endpoint returns content:null
      try {
        const r = await storiesAPI.getEpisode(selectedStory.id, ep.id);
        const full = r.data?.data || ep;
        setEpForm({ title: full.title || '', content: full.content || '', access_type: full.access_type || 'free', unlock_coin_cost: full.unlock_coin_cost || 0 });
        setEditingEp(full);
      } catch {
        setEpForm({ title: ep.title, content: '', access_type: ep.access_type || 'free', unlock_coin_cost: ep.unlock_coin_cost || 0 });
        setEditingEp(ep);
      }
    } else {
      setEpForm(emptyEp); setEditingEp(null);
    }
    setAutoSaved(null); setView('writer');
    setTimeout(() => writerRef.current?.focus(), 150);
  };

  const handleSaveEpisode = async (andPublish = false) => {
    if (!epForm.title.trim()) { toast.error('Title required hai.'); return; }
    if (!epForm.content.trim()) { toast.error('Kahani content likhna zaroori hai!'); return; }
    setEpSaving(true);
    try {
      const pl = { title: epForm.title, content: epForm.content, access_type: epForm.access_type, unlock_coin_cost: epForm.access_type === 'premium' ? Number(epForm.unlock_coin_cost) : 0 };
      let saved;
      if (editingEp) {
        const r = await storiesAPI.updateEpisode(selectedStory.id, editingEp.id, pl);
        saved = r.data?.data;
        setEpisodes((p) => p.map((e) => e.id === editingEp.id ? saved : e));
        toast.success('Episode update ho gaya! ✍️');
      } else {
        const r = await storiesAPI.createEpisode(selectedStory.id, pl);
        saved = r.data?.data;
        setEpisodes((p) => [...p, saved]);
        setEditingEp(saved);
        toast.success(`Episode #${saved?.episode_number} add ho gaya! 🩸`);
      }
      setAutoSaved(new Date());
      if (andPublish && saved) {
        await storiesAPI.publishEpisode(selectedStory.id, saved.id);
        setEpisodes((p) => p.map((e) => e.id === saved.id ? { ...e, status: 'published' } : e));
        toast.success('Episode publish ho gaya! 🎉');
        refreshStories();
        setView('dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Episode save nahi hua.');
    } finally { setEpSaving(false); }
  };

  const handlePublishEpisode = async (ep) => {
    try {
      await storiesAPI.publishEpisode(selectedStory.id, ep.id);
      setEpisodes((p) => p.map((e) => e.id === ep.id ? { ...e, status: 'published' } : e));
      toast.success(`Episode #${ep.episode_number} publish! 🎉`);
    } catch (err) { toast.error(err.response?.data?.message || 'Nahi hua.'); }
  };

  const handleDeleteEpisode = (ep) => {
    setConfirm({
      msg: `Episode "${ep.title}" permanently delete ho jayega.`,
      onConfirm: async () => {
        try {
          await storiesAPI.deleteEpisode(selectedStory.id, ep.id);
          setEpisodes((p) => p.filter((e) => e.id !== ep.id));
          setConfirm(null);
          toast.success('Episode delete ho gaya.');
        } catch (err) { toast.error(err.response?.data?.message || 'Delete nahi hua.'); }
      },
    });
  };

  // ── Aggregate stats ───────────────────────────────────────────────────────────
  const totalViews     = stories.reduce((a, s) => a + (s.total_views || 0), 0);
  const totalLikes     = stories.reduce((a, s) => a + (s.total_likes || 0), 0);
  const publishedCount = stories.filter((s) => s.status === 'published').length;

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) return <Spinner fullPage />;

  // ╔══════════════════════════════════════════════════════╗
  // ║  VIEW: APPLY CREATOR                                 ║
  // ╚══════════════════════════════════════════════════════╝
  if (view === 'apply') {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ maxWidth: '680px' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>✍️</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Creator <span style={{ color: 'var(--red-primary)' }}>Bano</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Apni horror kahaniyaan likho, readers tak pahuncho aur coins kamao.<br />
              Application submit karo — 24-48 ghante mein review hogi.
            </p>
          </div>

          {/* Perks grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {[
              { icon: '🩸', title: 'Unlimited Likhao', desc: 'Kahaniyaan, series, episodes — sab likho' },
              { icon: '💰', title: 'Coins Kamao', desc: 'Appreciate se real earnings milti hai' },
              { icon: '👁', title: 'Fear Rank Pao', desc: 'Leaderboard mein naam chamkao' },
            ].map((p) => (
              <div key={p.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>{p.icon}</div>
                <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{p.title}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          {applied ? (
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: '#4ade80', marginBottom: '0.4rem' }}>Application Submit Ho Gayi!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Humari team 24-48 ghante mein review karegi. Email notification milegi.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                📝 Creator Application
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Apne baare mein batao (Bio) *</label>
                  <textarea
                    className="form-input" rows={3}
                    placeholder="Main ek horror writer hoon... (max 500 chars)"
                    value={applyForm.bio}
                    onChange={(e) => setApplyForm((f) => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                    style={{ minHeight: '90px', resize: 'vertical' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{applyForm.bio.length}/500</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Creator kyun banna chahte ho?</label>
                  <textarea
                    className="form-input" rows={2}
                    placeholder="Mujhe horror stories se zyada pyaar hai kyunki..."
                    value={applyForm.motivation}
                    onChange={(e) => setApplyForm((f) => ({ ...f, motivation: e.target.value.slice(0, 500) }))}
                    style={{ minHeight: '70px', resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Writing Sample (ek chhoti kahani likho)</label>
                  <textarea
                    className="form-input" rows={5}
                    placeholder="Raat ke 2 baj rahe the jab mujhe ek awaaz aayi... (200-500 words best hai)"
                    value={applyForm.writing_sample}
                    onChange={(e) => setApplyForm((f) => ({ ...f, writing_sample: e.target.value }))}
                    style={{ minHeight: '130px', resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{wc(applyForm.writing_sample)} words</span>
                </div>
                <button className="btn btn-primary" onClick={handleApply} disabled={applying || !applyForm.bio.trim()}>
                  {applying ? '⏳ Submit ho raha hai...' : '🩸 Application Submit Karo'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ╔══════════════════════════════════════════════════════╗
  // ║  VIEW: EPISODE WRITER (fullscreen)                   ║
  // ╚══════════════════════════════════════════════════════╝
  if (view === 'writer') {
    const words = wc(epForm.content);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: 'var(--navbar-height)', background: '#FFFCFB' }}>

        {/* Writer Top Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 1.25rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          position: 'sticky', top: 'var(--navbar-height)', zIndex: 50,
        }}>
          {/* Back */}
          <button className="btn btn-ghost btn-sm" onClick={() => setView('dashboard')} style={{ flexShrink: 0 }}>
            ← Dashboard
          </button>

          {/* Breadcrumb */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {selectedStory?.title}
              {editingEp ? ` › Episode #${editingEp.episode_number}` : ' › Naya Episode'}
            </span>
          </div>

          {/* Auto-save */}
          {autoSaved && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              ✓ Auto-saved {timeAgo(autoSaved)}
            </span>
          )}

          {/* Stats */}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {words} words • ~{readMin(words)} min read
          </span>

          {/* Access type mini */}
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '110px', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            value={epForm.access_type}
            onChange={(e) => setEpForm((f) => ({ ...f, access_type: e.target.value }))}
          >
            <option value="free">🆓 Free</option>
            <option value="premium">🔒 Premium</option>
          </select>

          {epForm.access_type === 'premium' && (
            <input
              type="number" className="form-input"
              style={{ width: '80px', fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
              min={1} max={10000} placeholder="Coins"
              value={epForm.unlock_coin_cost}
              onChange={(e) => setEpForm((f) => ({ ...f, unlock_coin_cost: Number(e.target.value) }))}
            />
          )}

          {/* Actions */}
          <button className="btn btn-ghost btn-sm" onClick={() => handleSaveEpisode(false)} disabled={epSaving}>
            {epSaving ? '⏳...' : '💾 Save'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEpisode(true)} disabled={epSaving}>
            {epSaving ? '⏳...' : '🚀 Publish'}
          </button>
        </div>

        {/* Writer Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '780px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>

          {/* Episode Title */}
          <input
            type="text"
            className="writer-title-input"
            placeholder="Episode ka title likhao..."
            value={epForm.title}
            onChange={(e) => setEpForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={255}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.3rem, 3vw, 1.9rem)',
              color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: 1.3,
              borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem',
            }}
          />

          {/* Story Content Textarea */}
          <textarea
            ref={writerRef}
            placeholder={`Apni puri kahani yahan likho...\n\nParagraph ke beech ek blank line chodo.\n\nKoi limit nahi — jitna dil chahe utna likho. 🩸`}
            value={epForm.content}
            onChange={(e) => onContentChange(e.target.value)}
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#1A0508',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '1.05rem',
              lineHeight: 1.9,
              resize: 'none',
              minHeight: 'calc(100vh - 280px)',
              caretColor: 'var(--red-primary)',
            }}
          />

          {/* Bottom word count bar */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {words.toLocaleString()} words · {readMin(words)} min read · {epForm.content.length.toLocaleString()} characters
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleSaveEpisode(false)} disabled={epSaving}>
                💾 Save Draft
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleSaveEpisode(true)} disabled={epSaving}>
                🚀 Save & Publish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ╔══════════════════════════════════════════════════════╗
  // ║  VIEW: STORY FORM                                    ║
  // ╚══════════════════════════════════════════════════════╝
  if (view === 'story-form') {
    return (
      <div className="page-wrapper">
        <div className="container" style={{ maxWidth: '720px' }}>

          {/* Back button */}
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => { setStoryForm(emptyStory); setEditingStory(null); setTagInput(''); setView('dashboard'); }}>
            ← Dashboard
          </button>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
              {editingStory ? `✏️ Edit: ${editingStory.title}` : '✍️ Nai Kahani Shuru Karo'}
            </h2>

            {/* Info banner */}
            <div style={{ background: 'rgba(220,20,60,0.06)', border: '1px solid rgba(220,20,60,0.18)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              💡 <strong>Note:</strong> Yahan sirf story ki basic info bharo (title, category, etc.).<br />
              <strong>Story ka actual content</strong> episodes mein likhna hai — "Naya Episode" button se full-screen writer khulega.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Title */}
              <div className="form-group">
                <label className="form-label">Kahani ka Naam (Title) *</label>
                <input
                  type="text" className="form-input"
                  placeholder="Andhere ki Aawaz, Bhoot Bangla..."
                  value={storyForm.title}
                  onChange={(e) => setStoryForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={255}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{storyForm.title.length}/255</span>
              </div>

              {/* Cover Image Editor */}
              <div className="form-group">
                <label className="form-label">📸 Cover Image Editor</label>
                <CoverImageEditor
                  value={storyForm.thumbnail_url}
                  onChange={(url) => setStoryForm((f) => ({ ...f, thumbnail_url: url }))}
                />
              </div>

              {/* Summary / Blurb */}
              <div className="form-group">
                <label className="form-label">Summary / Blurb (Readers ke liye teaser)</label>
                <textarea
                  className="form-input" rows={3}
                  placeholder="Kahani ki ek chhoti si jhalak jo reader ko click karne par majboor kare... (max 1000 chars)"
                  value={storyForm.summary}
                  onChange={(e) => setStoryForm((f) => ({ ...f, summary: e.target.value.slice(0, 1000) }))}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{storyForm.summary.length}/1000</span>
              </div>

              {/* Category + Story Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Category / Genre</label>
                  <select
                    className="form-input"
                    value={storyForm.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') { setShowNewCat(true); return; }
                      setStoryForm((f) => ({ ...f, category_id: e.target.value }));
                      setShowNewCat(false);
                    }}
                  >
                    <option value="">-- Category chunno --</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="__new__">➕ Nai Category Banao...</option>
                  </select>
                  {showNewCat && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                      <input
                        type="text" className="form-input"
                        placeholder="Category name (e.g. Horror, Thriller...)"
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                        style={{ flex: 1, fontSize: '0.82rem' }}
                        autoFocus
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateCategory} disabled={creatingCat || !newCatInput.trim()}>
                        {creatingCat ? '...' : '+ Banao'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowNewCat(false); setNewCatInput(''); }}>✕</button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Story Type</label>
                  <select className="form-input" value={storyForm.story_type} onChange={(e) => setStoryForm((f) => ({ ...f, story_type: e.target.value }))}>
                    <option value="single">📄 Single Story</option>
                    <option value="series">📚 Series (Multiple Episodes)</option>
                  </select>
                </div>
              </div>

              {/* Language + Age Rating */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Bhasha (Language)</label>
                  <select className="form-input" value={storyForm.language} onChange={(e) => setStoryForm((f) => ({ ...f, language: e.target.value }))}>
                    <option value="hindi">🇮🇳 Hindi</option>
                    <option value="hinglish">🌐 Hinglish</option>
                    <option value="english">🇬🇧 English</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age Rating</label>
                  <select className="form-input" value={storyForm.age_rating} onChange={(e) => setStoryForm((f) => ({ ...f, age_rating: e.target.value }))}>
                    <option value="all">👶 All Ages</option>
                    <option value="13+">🧒 13+</option>
                    <option value="16+">👦 16+</option>
                    <option value="18+">🔞 18+</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="form-group">
                <label className="form-label">Tags (max 10) — Enter ya comma se add karo</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text" className="form-input"
                    placeholder="bhoot, darr, serial killer..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addTag}>+ Add</button>
                </div>
                {storyForm.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {storyForm.tags.map((tag) => (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.25)', borderRadius: '20px', padding: '0.15rem 0.55rem', fontSize: '0.72rem', color: 'var(--red-light)' }}>
                        #{tag}
                        <button onClick={() => setStoryForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, padding: 0, marginLeft: '2px' }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
                <button className="btn btn-primary" onClick={handleSaveStory} disabled={saving || !storyForm.title.trim()}>
                  {saving ? '⏳ Save ho raha hai...' : editingStory ? '💾 Update Karo' : '🩸 Kahani Banao'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setStoryForm(emptyStory); setEditingStory(null); setTagInput(''); setView('dashboard'); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ╔══════════════════════════════════════════════════════╗
  // ║  VIEW: DASHBOARD (main)                              ║
  // ╚══════════════════════════════════════════════════════╝
  return (
    <div className="page-wrapper">
      <div className="container">

        {/* ── Top Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              ✍️ Creator <span style={{ color: 'var(--red-primary)' }}>Dashboard</span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Namaste, {user?.display_name || user?.username} 👋
              {user?.creator_fear_rank && (
                <span style={{ marginLeft: '0.5rem', background: 'rgba(220,20,60,0.12)', color: 'var(--red-light)', border: '1px solid rgba(220,20,60,0.25)', borderRadius: '20px', padding: '0.1rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>
                  💀 {user.creator_fear_rank}
                </span>
              )}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => { setStoryForm(emptyStory); setEditingStory(null); setTagInput(''); setView('story-form'); }}>
            + Nai Kahani
          </button>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { icon: '📚', label: 'Kul Kahaniyaan', value: stories.length, sub: `${publishedCount} published` },
            { icon: '👁', label: 'Total Views', value: fmt(totalViews), sub: 'sab stories' },
            { icon: '❤️', label: 'Total Likes', value: fmt(totalLikes), sub: 'appreciate + dil' },
            { icon: '💰', label: 'Coins Kamaaye', value: fmt(user?.total_earned || 0), sub: 'lifetime earnings' },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--red-primary)', marginTop: '0.1rem' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Dashboard Tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
          {[
            { key: 'overview', icon: '📊', label: 'Overview' },
            { key: 'stories',  icon: '📚', label: 'Kahaniyan' },
            { key: 'revenue',  icon: '💰', label: 'Revenue' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setDashTab(t.key)}
              style={{
                padding: '0.6rem 1.1rem',
                background: 'none',
                border: 'none',
                borderBottom: dashTab === t.key ? '2.5px solid var(--red-primary)' : '2.5px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: dashTab === t.key ? 700 : 500,
                color: dashTab === t.key ? 'var(--red-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s',
                letterSpacing: dashTab === t.key ? '0.3px' : '0',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: STORIES (existing story/episode management) ─────────────── */}
        {dashTab === 'stories' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedStory ? '320px 1fr' : '1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── LEFT: Story List ─────────────────────────────────────────────── */}
          <div>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              {[
                { val: '', label: 'Sab' },
                { val: 'draft', label: '📝 Drafts' },
                { val: 'published', label: '🟢 Live' },
              ].map((f) => (
                <button
                  key={f.val}
                  className={`btn btn-sm ${statusFilter === f.val ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStatusFilter(f.val)}
                >
                  {f.label}
                  {f.val === '' && <span style={{ marginLeft: '0.25rem', opacity: 0.7, fontSize: '0.65rem' }}>({stories.length})</span>}
                </button>
              ))}
            </div>

            {stories.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🩸</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.875rem', fontSize: '0.875rem' }}>
                  Pehli kahani likho aur darr failao!
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => { setStoryForm(emptyStory); setEditingStory(null); setView('story-form'); }}>
                  + Pehli Kahani
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stories.map((story) => {
                  const isSelected = selectedStory?.id === story.id;
                  return (
                    <div
                      key={story.id}
                      onClick={() => setSelectedStory(isSelected ? null : story)}
                      style={{
                        background: isSelected ? 'rgba(220,20,60,0.06)' : 'var(--bg-card)',
                        border: `1px solid ${isSelected ? 'var(--red-primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      {/* Story header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, marginRight: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                          {story.title}
                        </p>
                        <StatusBadge status={story.status} />
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.55rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>📖 {story.total_episodes || 0} ep</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>👁 {fmt(story.total_views)}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>❤️ {fmt(story.total_likes)}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{story.story_type}</span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }} onClick={() => startEditStory(story)}>
                          ✏️ Edit
                        </button>
                        {story.status === 'draft' ? (
                          <button className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }} onClick={() => handlePublishStory(story)}>
                            🚀 Publish
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }} onClick={() => handleUnpublishStory(story)}>
                            📥 Unpublish
                          </button>
                        )}
                        <Link to={`/stories/${story.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }} onClick={(e) => e.stopPropagation()}>
                          👁 View
                        </Link>
                        <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem', padding: '0.18rem 0.45rem' }} onClick={() => handleDeleteStory(story)}>
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Episode Manager ───────────────────────────────────────── */}
          {selectedStory && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

              {/* Episode Manager Header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(220,20,60,0.03)' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                    📖 {selectedStory.title}
                  </h2>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {episodes.length} episodes • <StatusBadge status={selectedStory.status} />
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => openWriter(null)} style={{ background: 'var(--red-primary)' }}>
                    + Naya Episode
                  </button>
                </div>
              </div>

              {/* ⚠️ PUBLISH STORY BANNER — shown when story is draft */}
              {selectedStory.status === 'draft' && episodes.length > 0 && (
                <div style={{ background: 'linear-gradient(90deg,rgba(220,20,60,0.08),rgba(220,20,60,0.04))', borderBottom: '1px solid rgba(220,20,60,0.2)', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🚀</span>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--red-primary)', marginBottom: '0.1rem' }}>
                        Kahani abhi DRAFT mein hai — Home Page pe nahi dikh rahi!
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Episode publish karne ke baad <strong>Story bhi publish karni padti hai</strong> tab readers ko milegi.
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handlePublishStory(selectedStory)}
                    style={{ flexShrink: 0, fontWeight: 700, letterSpacing: '0.02em' }}
                  >
                    🚀 Abhi Publish Karo
                  </button>
                </div>
              )}

              {/* Episodes List */}
              <div style={{ padding: '1rem 1.25rem' }}>
                {epLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Spinner size={32} />
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                      Koi episode nahi abhi. Pehla episode likhao!
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => openWriter(null)}>
                      ✍️ Pehla Episode Likho
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {episodes.map((ep) => (
                      <div key={ep.id} style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.875rem',
                        background: 'var(--bg-secondary)',
                        transition: 'border-color 0.15s',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--red-primary)', flexShrink: 0 }}>
                                #{ep.episode_number}
                              </span>
                              <p style={{ fontSize: '0.855rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ep.title}
                              </p>
                              <StatusBadge status={ep.status} />
                              {ep.access_type === 'premium' && (
                                <span style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '20px', padding: '0.08rem 0.4rem', fontSize: '0.62rem', fontWeight: 700 }}>
                                  🔒 {ep.unlock_coin_cost}🪙
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>📝 {(ep.word_count || 0).toLocaleString()} words</span>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>⏱ {readMin(ep.word_count || 0)} min</span>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>👁 {fmt(ep.total_views)}</span>
                              <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>❤️ {fmt(ep.total_likes)}</span>
                            </div>
                          </div>

                          {/* Episode actions */}
                          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => openWriter(ep)} title="Edit / Likhao">
                              ✏️
                            </button>
                            {ep.status === 'draft' && (
                              <button className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => handlePublishEpisode(ep)} title="Publish">
                                🚀
                              </button>
                            )}
                            <Link to={`/stories/${selectedStory.id}/episodes/${ep.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} title="Preview">
                              👁
                            </Link>
                            <button className="btn btn-danger btn-sm" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => handleDeleteEpisode(ep)} title="Delete">
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Placeholder when no story is selected */}
          {!selectedStory && stories.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center', display: 'none' }}>
            </div>
          )}
        </div>
        )} {/* end dashTab === 'stories' */}

        {/* ── TAB: OVERVIEW ─────────────────────────────────────────────────── */}
        {dashTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💀</div>
                <p>Stats load ho rahi hain...</p>
              </div>
            ) : (
              <>
                {/* ── Fear Rank Card ───────────────────────────────────────── */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                  {/* Decorative glow */}
                  <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(220,20,60,0.06)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>{creatorStats?.fear_rank_icon || '👤'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                          {creatorStats?.fear_rank || 'Rookie Haunter'}
                        </span>
                        <span style={{ background: 'rgba(220,20,60,0.1)', color: 'var(--red-primary)', border: '1px solid rgba(220,20,60,0.25)', borderRadius: '20px', padding: '0.1rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>
                          Level {creatorStats?.fear_rank_level || 1}/7
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Fear Score: <b style={{ color: 'var(--text-primary)' }}>{(creatorStats?.fear_score || 0).toLocaleString('en-IN')}</b>
                        {creatorStats?.next_rank_name && (
                          <span> &nbsp;→&nbsp; <span style={{ color: 'var(--red-primary)' }}>{creatorStats.next_rank_name}</span> zaroor bano!</span>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Score kaise badhao?</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Views + Likes×10 + Followers×20
                      </div>
                    </div>
                  </div>

                  {/* Progress bar to next rank */}
                  {creatorStats?.fear_rank_level < 7 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {creatorStats?.fear_rank}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--red-primary)', fontWeight: 600 }}>
                          {creatorStats?.next_rank_name}
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, creatorStats?.milestone_progress || 0)}%`,
                          background: 'linear-gradient(90deg, var(--red-dark), var(--red-primary))',
                          borderRadius: '20px',
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {(creatorStats?.milestone_progress || 0).toFixed(1)}% complete
                      </div>
                    </div>
                  )}
                  {creatorStats?.fear_rank_level === 7 && (
                    <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(220,20,60,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--red-primary)', fontWeight: 700 }}>
                      🏆 Supreme Harbinger! Platform ka sabse bada khatarnak writer!
                    </div>
                  )}
                </div>

                {/* ── Creator Tier + Key Stats Row ─────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                  {/* Tier Card */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>{creatorStats?.creator_tier_icon || '🥉'}</span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                          {creatorStats?.creator_tier || 'Bronze'} Creator
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Revenue Share: <b style={{ color: '#D4AF37', fontSize: '0.85rem' }}>{creatorStats?.creator_share_percentage || 40}%</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Is Month Views: <b style={{ color: 'var(--text-primary)' }}>{fmt(creatorStats?.this_month_views || 0)}</b>
                      {creatorStats?.creator_tier !== 'Platinum' && creatorStats?.next_tier_views > 0 && (
                        <span> / {fmt(creatorStats?.next_tier_views)} ke liye agle tier</span>
                      )}
                    </div>

                    {creatorStats?.creator_tier !== 'Platinum' && (
                      <div>
                        <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, creatorStats?.tier_progress || 0)}%`,
                            background: 'linear-gradient(90deg, #D4AF37, #FFA500)',
                            borderRadius: '20px',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem', textAlign: 'right' }}>
                          {(creatorStats?.tier_progress || 0).toFixed(1)}% to next tier
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                      Tiers: 🥉40% → 🥈45% → 🥇50% → 💎55%
                    </div>
                  </div>

                  {/* This Month Card */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📅 Is Month</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { icon: '👁', val: fmt(creatorStats?.this_month_views || 0), label: 'Views' },
                        { icon: '🪙', val: fmt(creatorStats?.this_month_earnings_coins || 0), label: `₹${((creatorStats?.this_month_earnings_inr || 0)).toFixed(0)} Earned` },
                      ].map((s) => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '0.6rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '1.25rem' }}>{s.icon}</div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-primary)', lineHeight: 1 }}>{s.val}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(220,20,60,0.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>💰 Lifetime: </span>
                      <b style={{ color: 'var(--text-primary)' }}>{fmt(creatorStats?.total_earnings_coins || 0)}</b>
                      <span style={{ color: 'var(--text-muted)' }}> coins (₹{(creatorStats?.total_earnings_inr || 0).toFixed(0)})</span>
                    </div>
                  </div>
                </div>

                {/* ── Stats Grid ──────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {[
                    { icon: '👁', label: 'Total Views', value: fmt(creatorStats?.total_views || totalViews), sub: `${fmt(creatorStats?.this_month_views || 0)} this month`, color: '#4fc3f7' },
                    { icon: '👥', label: 'Followers', value: fmt(creatorStats?.followers_count || 0), sub: `${fmt(creatorStats?.following_count || 0)} following`, color: '#81c784' },
                    { icon: '❤️', label: 'Total Likes', value: fmt(creatorStats?.total_likes || totalLikes), sub: 'across stories', color: 'var(--red-primary)' },
                    { icon: '📚', label: 'Stories', value: creatorStats?.stories_count || stories.length, sub: `${creatorStats?.published_stories_count || publishedCount} published`, color: '#D4AF37' },
                  ].map((s) => (
                    <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', transition: 'border-color 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = s.color + '44'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>{s.icon}</div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
                      <div style={{ fontSize: '0.65rem', color: s.color, marginTop: '0.1rem' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* ── Top Story ──────────────────────────────────────────── */}
                {creatorStats?.top_story && (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Top Kahani</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      {creatorStats.top_story.thumbnail_url && (
                        <img
                          src={getMediaUrl(creatorStats.top_story.thumbnail_url)}
                          alt=""
                          style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{creatorStats.top_story.title}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>👁 {fmt(creatorStats.top_story.views)}</span>
                          <span>❤️ {fmt(creatorStats.top_story.likes)}</span>
                        </div>
                      </div>
                      <a href={`/stories/${creatorStats.top_story.id}`} className="btn btn-ghost btn-sm">Dekho →</a>
                    </div>
                  </div>
                )}

                {/* ── Revenue Teaser ──────────────────────────────────────── */}
                <div
                  onClick={() => setDashTab('revenue')}
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(220,20,60,0.08) 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#D4AF37', marginBottom: '0.2rem' }}>💰 Revenue Details Dekho</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Total earned: <b style={{ color: 'var(--text-primary)' }}>{fmt(creatorStats?.total_earnings_coins || 0)} coins (₹{(creatorStats?.total_earnings_inr || 0).toFixed(0)})</b>
                    </div>
                  </div>
                  <span style={{ fontSize: '1.25rem', color: '#D4AF37' }}>→</span>
                </div>
              </>
            )}
          </div>
        )} {/* end dashTab === 'overview' */}

        {/* ── TAB: REVENUE ──────────────────────────────────────────────────── */}
        {dashTab === 'revenue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
                <p>Revenue load ho rahi hai...</p>
              </div>
            ) : (
              <>
                {/* ── Total Earnings Header ────────────────────────────────── */}
                <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, rgba(220,20,60,0.1) 100%)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                    {[
                      { icon: '🪙', label: 'Lifetime Earnings', coins: creatorStats?.total_earnings_coins || 0, inr: creatorStats?.total_earnings_inr || 0, color: '#D4AF37' },
                      { icon: '📅', label: 'Is Month', coins: creatorStats?.this_month_earnings_coins || 0, inr: creatorStats?.this_month_earnings_inr || 0, color: '#4fc3f7' },
                      { icon: '💼', label: 'Wallet Balance', coins: creatorStats?.wallet_balance || 0, inr: (creatorStats?.wallet_balance || 0) * 0.10, color: '#81c784' },
                    ].map((s) => (
                      <div key={s.label}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{s.icon}</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: s.color, lineHeight: 1 }}>
                          {fmt(s.coins)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{s.label}</div>
                        <div style={{ fontSize: '0.75rem', color: s.color, marginTop: '0.15rem', fontWeight: 600 }}>₹{s.inr.toFixed(0)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Withdrawal eligibility */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {creatorStats?.can_withdraw ? (
                      <>
                        <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>✅ Aap withdrawal ke liye eligible hain!</span>
                        <a href="/wallet" className="btn btn-sm" style={{ background: '#D4AF37', color: '#000', border: 'none', fontWeight: 700 }}>💸 Withdrawal Request</a>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        ⚠️ Min {fmt(creatorStats?.min_withdrawal_coins || 500)} coins chahiye withdrawal ke liye
                        ({fmt(Math.max(0, (creatorStats?.min_withdrawal_coins || 500) - (creatorStats?.wallet_balance || 0)))} aur chahiye)
                      </span>
                    )}
                    {creatorStats?.pending_withdrawal_coins > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#FFA500' }}>⏳ Pending: {fmt(creatorStats.pending_withdrawal_coins)} coins</span>
                    )}
                  </div>
                </div>

                {/* ── Revenue Breakdown ────────────────────────────────────── */}
                {(() => {
                  const sources = [
                    { key: 'appreciation', icon: '❤️', label: 'Appreciations', desc: 'Readers ne diye coins', coins: creatorStats?.appreciation_earnings || 0 },
                    { key: 'leaderboard',  icon: '🏆', label: 'Leaderboard Rewards', desc: 'Monthly ranking prize', coins: creatorStats?.leaderboard_rewards || 0 },
                    { key: 'competition',  icon: '🏅', label: 'Competition Prizes', desc: 'Writing competitions', coins: creatorStats?.competition_prizes || 0 },
                    { key: 'referral',     icon: '👥', label: 'Referral Bonus', desc: 'Creator referral', coins: creatorStats?.referral_bonus || 0 },
                    { key: 'admin',        icon: '⭐', label: 'Admin Credits', desc: 'Platform credits', coins: creatorStats?.admin_credits || 0 },
                  ];
                  const totalCoins = sources.reduce((a, s) => a + s.coins, 0) || 1;
                  return (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>💰 Revenue Breakdown</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {sources.map((s) => {
                          const pct = ((s.coins / totalCoins) * 100).toFixed(1);
                          return (
                            <div key={s.key}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                                  <div>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{s.desc}</span>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: s.coins > 0 ? '#D4AF37' : 'var(--text-muted)' }}>
                                    🪙 {fmt(s.coins)}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>({pct}%)</span>
                                </div>
                              </div>
                              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: s.coins > 0 ? 'linear-gradient(90deg, var(--red-dark), #D4AF37)' : 'var(--border)', borderRadius: '20px', transition: 'width 0.8s ease' }} />
                              </div>
                              <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>₹{(s.coins * 0.10).toFixed(0)}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#D4AF37' }}>🪙 {fmt(creatorStats?.total_earnings_coins || 0)} = ₹{(creatorStats?.total_earnings_inr || 0).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Creator Tier System ──────────────────────────────────── */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>📈 Creator Tier System</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Monthly views ke hisaab se aapka revenue share percentage badhta hai.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[
                      { icon: '🥉', name: 'Bronze', views: '0 – 9,999', share: 40, color: '#cd7f32' },
                      { icon: '🥈', name: 'Silver', views: '10,000 – 49,999', share: 45, color: '#c0c0c0' },
                      { icon: '🥇', name: 'Gold', views: '50,000 – 99,999', share: 50, color: '#D4AF37' },
                      { icon: '💎', name: 'Platinum', views: '1,00,000+', share: 55, color: '#a8edea' },
                    ].map((tier) => {
                      const isCurrentTier = tier.name === (creatorStats?.creator_tier || 'Bronze');
                      return (
                        <div key={tier.name} style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1rem',
                          background: isCurrentTier ? `${tier.color}12` : 'var(--bg-secondary)',
                          border: `1px solid ${isCurrentTier ? tier.color + '55' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>{tier.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: tier.color }}>{tier.name}</span>
                              {isCurrentTier && <span style={{ fontSize: '0.65rem', background: `${tier.color}22`, color: tier.color, border: `1px solid ${tier.color}44`, borderRadius: '20px', padding: '0.05rem 0.4rem', fontWeight: 700 }}>← Aap yahan hain</span>}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{tier.views} views/month</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: tier.color, lineHeight: 1 }}>{tier.share}%</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>creator share</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '0.875rem', padding: '0.75rem', background: 'rgba(220,20,60,0.04)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    💡 Platform share (60% → 45%) aur Reward Fund (20%) ke sath milke total 100% hota hai. Reward Fund monthly top creators ko distribute hota hai!
                  </div>
                </div>

                {/* ── Revenue Sources Info ─────────────────────────────────── */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>🎯 Revenue Sources</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { icon: '❤️', title: 'Appreciate karo', desc: 'Readers apni pasandeeda story ko coins bhejte hain — aapko 40%+ milta hai', badge: 'Active' },
                      { icon: '🔒', title: 'Premium Episodes', desc: 'Readers coins se exclusive episodes unlock karte hain', badge: 'Active' },
                      { icon: '🏆', title: 'Leaderboard', desc: 'Monthly top-10 creators mein aao aur reward pao', badge: 'Monthly' },
                      { icon: '🏅', title: 'Writing Competitions', desc: 'Platform competitions jeet ke prize money pao', badge: 'Coming Soon' },
                      { icon: '👥', title: 'Referral Program', desc: 'Naye creators refer karo aur bonus pao', badge: 'Coming Soon' },
                      { icon: '⚡', title: 'Super Chat', desc: 'Fans live chat mein Super Chat se support karte hain', badge: 'Coming Soon' },
                    ].map((s) => (
                      <div key={s.title} style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', background: s.badge === 'Active' ? 'rgba(34,197,94,0.15)' : s.badge === 'Monthly' ? 'rgba(212,175,55,0.15)' : 'rgba(100,100,100,0.15)', color: s.badge === 'Active' ? '#4ade80' : s.badge === 'Monthly' ? '#D4AF37' : 'var(--text-muted)', borderRadius: '20px', padding: '0.05rem 0.4rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.badge}</span>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )} {/* end dashTab === 'revenue' */}

      </div>

      {/* ── Confirm Dialog ───────────────────────────────────────────────────── */}
      {confirm && (
        <ConfirmDialog
          msg={confirm.msg}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
