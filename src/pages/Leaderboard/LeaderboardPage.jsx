import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardAPI } from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const LB_TYPES = [
  { value: 'daily_trending', label: '🔥 Aaj' },
  { value: 'weekly_rising', label: '📈 Weekly' },
  { value: 'monthly_top', label: '🏆 Monthly' },
  { value: 'all_time', label: '👑 All Time' },
  { value: 'most_coins', label: '🪙 Coins' },
  { value: 'most_comments', label: '💬 Comments' },
];

// FIXED: use comp.status directly (API returns status: 'upcoming'|'submission_open'|'voting'|'ended')
const statusBadge = (status) => {
  const map = {
    upcoming: <span className="badge badge-blue">Aane Wala</span>,
    submission_open: <span className="badge badge-green">🟢 Open</span>,
    voting: <span className="badge badge-gold">Voting</span>,
    ended: <span className="badge badge-muted">Ended</span>,
  };
  return map[status] || <span className="badge badge-muted">{status}</span>;
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [lbType, setLbType] = useState('daily_trending');
  const [lbData, setLbData] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryPage, setEntryPage] = useState(1);
  const [entryTotalPages, setEntryTotalPages] = useState(1);
  const [submitModal, setSubmitModal] = useState(false);
  const [storyId, setStoryId] = useState('');

  useEffect(() => {
    setLbLoading(true);
    leaderboardAPI.get(lbType)
      .then((res) => setLbData(res.data?.data || []))
      .catch(() => setLbData([]))
      .finally(() => setLbLoading(false));
  }, [lbType]);

  useEffect(() => {
    if (activeTab === 'competitions') {
      leaderboardAPI.getCompetitions(false, 1)
        .then((res) => {
          const d = res.data?.data;
          setCompetitions(d?.items || d || []);
        }).catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedComp) {
      leaderboardAPI.getEntries(selectedComp.id, entryPage)
        .then((res) => {
          const d = res.data?.data;
          setEntries(d?.items || d || []);
          setEntryTotalPages(d?.total_pages || 1);
        }).catch(() => {});
    }
  }, [selectedComp, entryPage]);

  const handleSubmitEntry = async () => {
    if (!storyId.trim()) return;
    try {
      await leaderboardAPI.submitEntry(selectedComp.id, { story_id: storyId });
      toast.success('Entry submit ho gayi!');
      setSubmitModal(false);
      setStoryId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Entry fail ho gayi.');
    }
  };

  const handleVote = async (entryId) => {
    if (!user) { toast.info('Vote karne ke liye login karo'); return; }
    try {
      await leaderboardAPI.vote(selectedComp.id, entryId);
      toast.success('Vote de diya! 🗳');
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, vote_count: (e.vote_count || 0) + 1, has_voted: true } : e));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote fail ho gaya.');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1.25rem' }}>
          🏆 <span style={{ color: 'var(--red-primary)' }}>Leaderboard</span>
        </h1>

        <div className="tabs">
          {[{ key: 'leaderboard', label: '🏆 Rankings' }, { key: 'competitions', label: '⚔️ Competitions' }].map((t) => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'leaderboard' && (
          <div>
            {/* Type selector */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {LB_TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`btn btn-sm ${lbType === t.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLbType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {lbLoading ? <Spinner size={36} /> : lbData.length === 0 ? (
              <div className="empty-state"><p>Data nahi mila.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {lbData.map((entry, i) => {
                  // FIXED: LeaderboardEntryResponse has entity_type, creator_username, story_title etc.
                  const isStory = entry.entity_type === 'story';
                  const name = isStory
                    ? (entry.story_title || 'Unknown Story')
                    : (entry.creator_display_name || entry.creator_username || 'Unknown');
                  const sub = isStory
                    ? `👁 ${(entry.story_total_views || 0).toLocaleString()} views`
                    : (entry.creator_rank?.replace(/_/g, ' ') || '');
                  const link = isStory
                    ? `/stories/${entry.entity_id}`
                    : `/profile/${entry.creator_username}`;
                  const initial = name[0]?.toUpperCase() || '?';
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                  const rankBorderColors = ['#FFD70033', '#C0C0C033', '#CD7F3233'];

                  return (
                    <Link key={entry.id || i} to={link} style={{ display: 'block', textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: i < 3 ? 'var(--bg-secondary)' : 'var(--bg-card)',
                        border: `1px solid ${i < 3 ? rankBorderColors[i] : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', padding: '0.7rem 0.875rem',
                        transition: 'border-color 0.18s',
                      }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = i < 3 ? rankBorderColors[i] : 'var(--border)'}
                      >
                        <span style={{
                          fontFamily: 'var(--font-heading)', fontSize: '1rem', minWidth: '32px', textAlign: 'center',
                          color: i < 3 ? rankColors[i] : 'var(--text-muted)',
                        }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank_position || i + 1}`}
                        </span>
                        {/* Avatar */}
                        {(isStory && entry.story_thumbnail_url) || (!isStory && entry.creator_avatar_url) ? (
                          <img
                            src={isStory ? entry.story_thumbnail_url : entry.creator_avatar_url}
                            style={{ width: '36px', height: '36px', borderRadius: isStory ? 'var(--radius-sm)' : '50%', objectFit: 'cover', flexShrink: 0 }}
                            alt=""
                          />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: isStory ? 'var(--radius-sm)' : '50%', background: 'var(--red-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {initial}
                          </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                            {entry.creator_is_verified && ' ✅'}
                          </p>
                          {sub && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', color: '#D4AF37' }}>
                            🪙 {(entry.reward_coins || entry.score || 0).toLocaleString()}
                          </p>
                          {!isStory && entry.story_total_views && (
                            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{entry.story_total_views.toLocaleString()} views</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'competitions' && (
          !selectedComp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {competitions.length === 0 ? (
                <div className="empty-state"><p>Koi competition nahi abhi.</p></div>
              ) : competitions.map((comp) => (
                <div key={comp.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '1rem',
                  cursor: 'pointer', transition: 'border-color 0.18s',
                }}
                  onClick={() => setSelectedComp(comp)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--red-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem' }}>{comp.title}</h3>
                    {/* FIXED: use comp.status directly (API provides it) */}
                    {statusBadge(comp.status)}
                  </div>
                  {comp.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{comp.description}</p>}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* FIXED: prize_pool_coins (not prize_coins) */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🏆 Prize: 🪙 {(comp.prize_pool_coins || 0).toLocaleString()}</span>
                    {/* FIXED: total_entries (not entry_count) */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📝 {comp.total_entries || 0} entries</span>
                    {/* FIXED: submission_end (not submission_end_date) */}
                    {comp.submission_end && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {new Date(comp.submission_end).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: '0.875rem' }} onClick={() => { setSelectedComp(null); setEntries([]); }}>
                ← Sab Competitions
              </button>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>{selectedComp.title}</h2>
                  {statusBadge(selectedComp.status)}
                </div>
                {selectedComp.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{selectedComp.description}</p>}
                {selectedComp.rules && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Rules: {selectedComp.rules}</p>}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>🏆 Prize: 🪙 {(selectedComp.prize_pool_coins || 0).toLocaleString()}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📝 {selectedComp.total_entries || 0} entries</span>
                  {selectedComp.submission_end && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📅 Deadline: {new Date(selectedComp.submission_end).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
                {user && selectedComp.status === 'submission_open' && !selectedComp.has_entered && (
                  <button className="btn btn-primary btn-sm" onClick={() => setSubmitModal(true)}>📝 Entry Submit Karo</button>
                )}
                {selectedComp.has_entered && <span className="badge badge-green">✓ Entry Di Hui</span>}
              </div>

              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                📋 Entries ({selectedComp.total_entries || 0})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {entries.length === 0 ? (
                  <div className="empty-state"><p>Koi entry nahi abhi.</p></div>
                ) : entries.map((e, i) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.875rem' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--red-primary)', minWidth: '22px', fontSize: '0.85rem' }}>
                      {e.final_rank ? `#${e.final_rank}` : `#${i + 1}`}
                    </span>
                    <Link to={`/stories/${e.story_id}`} style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.855rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.story_title}
                    </Link>
                    {/* FIXED: e.username (not e.author_name) — CompetitionEntryResponse.Username → username */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>by {e.username}</span>
                    <span style={{ fontSize: '0.78rem', color: '#4ade80', flexShrink: 0 }}>🗳 {e.vote_count || 0}</span>
                    {selectedComp.status === 'voting' && !e.has_voted && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleVote(e.id)} disabled={!user}>Vote</button>
                    )}
                    {e.has_voted && <span className="badge badge-green">✓</span>}
                    {e.is_winner && <span className="badge badge-gold">🏆</span>}
                  </div>
                ))}
              </div>
              <Pagination page={entryPage} totalPages={entryTotalPages} onPageChange={setEntryPage} />
            </div>
          )
        )}
      </div>

      <Modal isOpen={submitModal} onClose={() => setSubmitModal(false)} title="Entry Submit Karo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-group">
            <label className="form-label">Story ID (GUID)</label>
            <input type="text" className="form-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={storyId} onChange={(e) => setStoryId(e.target.value)} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Story detail page se ID copy karo</span>
          </div>
          <button className="btn btn-primary" onClick={handleSubmitEntry} style={{ justifyContent: 'center' }} disabled={!storyId.trim()}>
            📝 Submit Karo
          </button>
        </div>
      </Modal>
    </div>
  );
}
