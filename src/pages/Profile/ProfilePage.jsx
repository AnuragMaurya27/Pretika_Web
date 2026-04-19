import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersAPI, storiesAPI, chatAPI } from '../../api/index';
import { getMediaUrl } from '../../utils/media';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import StoryCard from '../../components/StoryCard';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('stories');

  const isOwnProfile = currentUser?.username === username;
  const avatarInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const API_BASE = 'https://pretika-api-1.onrender.com';

  useEffect(() => {
    setLoading(true);
    usersAPI.getProfile(username)
      .then((res) => {
        const p = res.data?.data;
        setProfile(p);
        setFollowing(p?.is_following || false);
        setEditForm({ display_name: p?.display_name || '', bio: p?.bio || '' });
        // FIXED: use getCreatorStories with creator's user ID
        return storiesAPI.getCreatorStories(p?.id, { page_size: 12 });
      })
      .then((res) => setStories(res.data?.data?.items || res.data?.data || []))
      .catch(() => toast.error('Profile not found.'))
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser) { toast.info('Login to follow'); return; }
    try {
      if (following) {
        await usersAPI.unfollow(profile.id);
        setFollowing(false);
        setProfile((p) => ({ ...p, total_followers: (p.total_followers || 1) - 1 }));
        toast.info('Unfollowed.');
      } else {
        await usersAPI.follow(profile.id);
        setFollowing(true);
        setProfile((p) => ({ ...p, total_followers: (p.total_followers || 0) + 1 }));
        toast.success('Followed successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    }
  };

  const handleMessage = async () => {
    if (!currentUser) { toast.info('Login to message'); return; }
    try {
      const res = await chatAPI.startPrivateChat({ target_user_id: profile.id });
      const room = res.data?.data;
      navigate(`/chat?room=${room.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start chat.');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await usersAPI.updateProfile(editForm);
      updateUser(editForm);
      setProfile((p) => ({ ...p, ...editForm }));
      setEditModal(false);
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Profile update failed.');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, WebP, or GIF allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setAvatarUploading(true);
    try {
      const res = await usersAPI.updateAvatar(file);
      const url = res.data?.data?.avatar_url;
      if (url) {
        setProfile((p) => ({ ...p, avatar_url: url }));
        updateUser({ avatar_url: url });
        toast.success('Avatar updated! 🎉');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Avatar upload failed.');
    } finally { setAvatarUploading(false); e.target.value = ''; }
  };

  if (loading) return <Spinner fullPage />;
  if (!profile) return <div className="page-wrapper"><div className="container empty-state"><p>User not found.</p></div></div>;

  const rankColors = { mahakaal_katha_samrat: '#FFD700', bhoot_lekhak: '#C0C0C0', pret_aatma: '#CD7F32' };
  const rankColor = rankColors[profile.creator_rank] || 'var(--red-primary)';

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Profile Header */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background blob */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '100px',
            background: 'linear-gradient(135deg, var(--red-deep) 0%, transparent 100%)',
            opacity: 0.4,
          }} />

          <div style={{ position: 'relative', display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: '88px', height: '88px', borderRadius: '50%',
                  background: 'var(--red-dark)', border: '3px solid var(--red-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 700, color: 'white',
                  overflow: 'hidden', cursor: isOwnProfile ? 'pointer' : 'default',
                  position: 'relative',
                }}
                onClick={() => isOwnProfile && avatarInputRef.current?.click()}
                title={isOwnProfile ? 'Change avatar' : ''}
              >
                {profile.avatar_url ? (
                  <img
                    src={getMediaUrl(profile.avatar_url)}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  (profile.display_name || profile.username || 'U')[0].toUpperCase()
                )}
                {isOwnProfile && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', borderRadius: '50%' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  >
                    <span style={{ fontSize: '1.2rem', opacity: 0 }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                    >📷</span>
                  </div>
                )}
              </div>
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>⏳</div>
              )}
              {/* Hidden file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>
                    {profile.display_name || profile.username}
                    {profile.is_verified && <span style={{ marginLeft: '0.4rem', fontSize: '1rem' }}>✅</span>}
                  </h1>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{profile.username}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {isOwnProfile ? (
                    <button className="btn btn-outline btn-sm" onClick={() => setEditModal(true)}>
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={handleFollow}
                      >
                        {following ? '✓ Following' : '+ Follow'}
                      </button>
                      {currentUser && (
                        <button className="btn btn-sm btn-outline" onClick={handleMessage}>
                          💬 Message
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {profile.creator_rank && (
                <span style={{
                  display: 'inline-block', marginTop: '0.5rem',
                  padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem',
                  background: `${rankColor}22`, color: rankColor, border: `1px solid ${rankColor}44`,
                  fontWeight: 600,
                }}>
                  ⚡ {profile.creator_rank?.replace(/_/g, ' ')}
                </span>
              )}

              {profile.bio && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Followers', value: profile.total_followers || 0 },
                  { label: 'Following', value: profile.total_following || 0 },
                  { label: 'Stories', value: profile.total_stories_published || stories.length },
                  { label: 'Total Views', value: (profile.total_views_received || 0).toLocaleString() },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[{ key: 'stories', label: '📚 Stories' }, { key: 'about', label: '👤 About' }].map((t) => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'stories' && (
          stories.length === 0 ? (
            <div className="empty-state"><p>No stories yet. 👻</p></div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {stories.map((s) => <StoryCard key={s.id} story={s} />)}
            </div>
          )
        )}

        {activeTab === 'about' && (
          <div className="card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Username:</span> <span style={{ fontSize: '0.9rem' }}>@{profile.username}</span></div>
              {profile.reader_rank && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Reader Rank:</span> <span style={{ fontSize: '0.9rem', color: 'var(--red-primary)' }}>{profile.reader_rank?.replace(/_/g, ' ')}</span></div>}
              <div><span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Join Date:</span> <span style={{ fontSize: '0.9rem' }}>{new Date(profile.created_at).toLocaleDateString('hi-IN')}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Profile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input type="text" className="form-input" value={editForm.display_name || ''} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-input" value={editForm.bio || ''} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} placeholder="Write something about yourself..." />
          </div>
          <button className="btn btn-primary" onClick={handleSaveProfile}>💾 Save</button>
        </div>
      </Modal>
    </div>
  );
}
