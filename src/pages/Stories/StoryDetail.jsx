import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storiesAPI, commentsAPI, walletAPI } from '../../api/index';
import { getMediaUrl } from '../../utils/media';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/Toast';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

const API_BASE = 'https://pretika-api-1.onrender.com';

function fmt(n = 0) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

// ── Star Rating component ────────────────────────────────────────────────────
function StarRating({ value = 0, onChange, readonly = false, size = '1.2rem' }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <span
            key={star}
            style={{
              fontSize: size,
              cursor: readonly ? 'default' : 'pointer',
              color: filled ? '#FFD700' : 'rgba(255,255,255,0.2)',
              transition: 'color 0.1s, transform 0.1s',
              display: 'inline-block',
              transform: !readonly && hover === star ? 'scale(1.25)' : 'scale(1)',
              userSelect: 'none',
            }}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => !readonly && onChange && onChange(star)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = 26 }) {
  const src = getMediaUrl(url);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--red-dark)', border: '1px solid rgba(220,20,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42 + 'px', color: 'white', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} /> : (name || '?')[0]?.toUpperCase()}
    </div>
  );
}

// ── Format timestamp ─────────────────────────────────────────────────────────
function fmtCommentTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isToday) return time;
  return d.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' }) + ' · ' + time;
}

// ── Single Reply item (with like) ────────────────────────────────────────────
function ReplyItem({ reply, user, parentAuthorName, isLast }) {
  const toast = useToast();
  const [liked, setLiked] = useState(reply.is_liked_by_me || false);
  const [likeCount, setLikeCount] = useState(reply.likes_count || 0);
  const replyAuthor = reply.author_display_name || reply.author_username || 'User';

  const toggleLike = async () => {
    if (!user) { toast.info('Login to perform action'); return; }
    try {
      if (liked) { await commentsAPI.unlike(reply.id); setLiked(false); setLikeCount((n) => Math.max(0, n - 1)); }
      else { await commentsAPI.like(reply.id); setLiked(true); setLikeCount((n) => n + 1); }
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', gap: '0' }}>
      {/* Left: thread line column (28px wide = parent avatar width) */}
      <div style={{ width: '28px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Vertical line segment */}
        <div style={{ width: '2px', height: '18px', background: 'rgba(220,20,60,0.25)', flexShrink: 0 }} />
        {/* L-bend — horizontal arm */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ width: '2px', height: isLast ? '10px' : '100%', background: 'rgba(220,20,60,0.25)', flexShrink: 0 }} />
          <div style={{ width: '12px', height: '2px', background: 'rgba(220,20,60,0.25)', marginTop: '10px', flexShrink: 0 }} />
        </div>
        {/* Vertical continuation (only if not last reply) */}
        {!isLast && (
          <div style={{ width: '2px', flex: 1, background: 'rgba(220,20,60,0.25)' }} />
        )}
      </div>

      {/* Right: reply content */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.45rem', paddingTop: '0.1rem', paddingBottom: isLast ? '0' : '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <Avatar url={reply.author_avatar_url} name={replyAuthor} size={22} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Reply bubble */}
            <div style={{
              background: 'rgba(220,20,60,0.04)',
              border: '1px solid rgba(220,20,60,0.12)',
              borderRadius: '0 8px 8px 8px',
              padding: '0.4rem 0.65rem',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.18rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {replyAuthor}
                </span>
                {reply.author_is_creator && (
                  <span style={{ fontSize: '0.58rem', background: 'rgba(220,20,60,0.15)', color: 'var(--red-primary)', padding: '0.03rem 0.28rem', borderRadius: '3px', fontWeight: 700 }}>Creator</span>
                )}
                {/* Who they replied to */}
                <span style={{ fontSize: '0.65rem', color: 'var(--red-primary)', fontWeight: 600 }}>
                  ↩ @{parentAuthorName}
                </span>
                {/* Timestamp — pushed right */}
                <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {fmtCommentTime(reply.created_at)}
                </span>
              </div>
              {/* Content */}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{reply.content}</p>
            </div>
            {/* Like action */}
            <button
              onClick={toggleLike}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.68rem',
                color: liked ? 'var(--red-primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '0.2rem',
                padding: '0.2rem 0.1rem',
                fontWeight: liked ? 700 : 400,
                marginTop: '0.15rem',
              }}
            >
              {liked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : 'Like'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Single Comment (with replies) ────────────────────────────────────────────
function CommentItem({ comment, storyId, user, onReplyPosted }) {
  const toast = useToast();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [liked, setLiked] = useState(comment.is_liked_by_me || false);
  const [likeCount, setLikeCount] = useState(comment.likes_count || 0);
  const [totalReplies, setTotalReplies] = useState(comment.replies_count || 0);
  const replyRef = useRef(null);

  const authorName = comment.author_display_name || comment.author_username || 'User';
  const avatarUrl = comment.author_avatar_url || null;

  // ── helper: extract items from paginated or plain response ──
  const extractReplies = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  };

  const loadReplies = async () => {
    if (repliesLoaded) return;
    try {
      const res = await commentsAPI.getReplies(comment.id);
      const items = extractReplies(res.data?.data);
      setReplies(items);
      setRepliesLoaded(true);
    } catch { setReplies([]); setRepliesLoaded(true); }
  };

  const toggleReplies = async () => {
    if (!showReplies && !repliesLoaded) await loadReplies();
    setShowReplies((v) => !v);
  };

  const postReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await commentsAPI.create(storyId, { content: replyText.trim(), parent_comment_id: comment.id });
      setReplyText('');
      setShowReplyBox(false);
      // Reload replies fresh
      const res = await commentsAPI.getReplies(comment.id);
      const items = extractReplies(res.data?.data);
      setReplies(items);
      setTotalReplies(items.length);
      setRepliesLoaded(true);
      setShowReplies(true);
      onReplyPosted?.();
      toast.success('Reply post ho gayi! ✅');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reply.');
    }
  };

  const toggleLike = async () => {
    if (!user) { toast.info('Login to perform action'); return; }
    try {
      if (liked) { await commentsAPI.unlike(comment.id); setLiked(false); setLikeCount((n) => Math.max(0, n - 1)); }
      else { await commentsAPI.like(comment.id); setLiked(true); setLikeCount((n) => n + 1); }
    } catch { /* ignore */ }
  };

  const showRepliesSection = showReplies && replies.length > 0;

  return (
    <div style={{ display: 'flex', gap: '0' }}>
      {/* Left column: avatar + vertical thread line */}
      <div style={{ width: '28px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar url={avatarUrl} name={authorName} size={28} />
        {/* Vertical line that runs down to replies */}
        {showRepliesSection && (
          <div style={{ width: '2px', flex: 1, background: 'rgba(220,20,60,0.25)', marginTop: '3px', borderRadius: '1px' }} />
        )}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '0.55rem' }}>
        {/* Comment bubble */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) var(--radius-sm)',
          padding: '0.5rem 0.7rem',
          marginBottom: '0.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{authorName}</span>
              {comment.author_is_creator && (
                <span style={{ fontSize: '0.6rem', background: 'rgba(220,20,60,0.15)', color: 'var(--red-primary)', padding: '0.05rem 0.3rem', borderRadius: '3px', fontWeight: 700 }}>Creator</span>
              )}
              {comment.is_pinned && <span style={{ fontSize: '0.6rem', color: '#FFD700' }}>📌</span>}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {fmtCommentTime(comment.created_at)}
            </span>
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{comment.content}</p>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.1rem', marginBottom: '0.1rem' }}>
          <button
            onClick={toggleLike}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: liked ? 'var(--red-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0', fontWeight: liked ? 700 : 400 }}
          >
            {liked ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
          </button>
          {user && (
            <button
              onClick={() => { setShowReplyBox((v) => !v); setTimeout(() => replyRef.current?.focus(), 50); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: showReplyBox ? 'var(--red-primary)' : 'var(--text-muted)', padding: '0.15rem 0', fontWeight: 600 }}
            >
              ↩ Reply
            </button>
          )}
          {totalReplies > 0 && (
            <button
              onClick={toggleReplies}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--red-primary)', padding: '0.15rem 0', fontWeight: 600 }}
            >
              {showReplies
                ? `▲ Replies chhupao`
                : `▼ ${totalReplies} repl${totalReplies === 1 ? 'y' : 'ies'} dekho`}
            </button>
          )}
        </div>

        {/* Reply input box */}
        {showReplyBox && user && (
          <form onSubmit={postReply} style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', marginBottom: '0.4rem', alignItems: 'center' }}>
            <Avatar url={null} name={user.display_name || user.username} size={22} />
            <input
              ref={replyRef}
              type="text"
              className="form-input"
              placeholder={`Reply to @${authorName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{ flex: 1, fontSize: '0.8rem', padding: '0.3rem 0.55rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }} disabled={!replyText.trim()}>
              Send
            </button>
          </form>
        )}

        {/* Nested replies with thread lines */}
        {showRepliesSection && (
          <div style={{ marginTop: '0.25rem' }}>
            {replies.map((reply, idx) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                user={user}
                parentAuthorName={authorName}
                isLast={idx === replies.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main StoryDetail page ─────────────────────────────────────────────────────
export default function StoryDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refreshWallet } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [appreciateModal, setAppreciateModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState(50);
  const [appreciating, setAppreciating] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Rating state
  const [myRating, setMyRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storiesAPI.getById(id),
      storiesAPI.getEpisodes(id),
    ]).then(([sRes, eRes]) => {
      const s = sRes.data?.data;
      setStory(s);
      setLiked(s?.is_liked || false);
      setBookmarked(s?.is_bookmarked || false);
      setMyRating(s?.my_rating || 0);
      setAvgRating(s?.average_rating || 0);
      setRatingCount(s?.rating_count || 0);
      if (s?.my_rating) setRatingDone(true);
      const eps = eRes.data?.data;
      setEpisodes(Array.isArray(eps) ? eps : (eps?.items || []));
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load story.');
      navigate('/stories');
    });
  }, [id]);

  useEffect(() => {
    commentsAPI.getStoryComments(id, commentPage).then((res) => {
      const d = res.data?.data;
      setComments(Array.isArray(d) ? d : (d?.items || []));
      setCommentTotalPages(d?.total_pages || 1);
    }).catch(() => {});
  }, [id, commentPage]);

  const postComment = async (e) => {
    e.preventDefault();
    if (!user) { toast.info('Login to comment'); return; }
    if (!commentText.trim()) return;
    try {
      await commentsAPI.create(id, { content: commentText.trim() });
      setCommentText('');
      toast.success('Comment post ho gaya!');
      const res = await commentsAPI.getStoryComments(id, 1);
      const d = res.data?.data;
      setComments(Array.isArray(d) ? d : (d?.items || []));
      setCommentPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment.');
    }
  };

  const handleRate = async (stars) => {
    if (!user) { toast.info('Login to rate'); return; }
    setMyRating(stars);
    try {
      const res = await storiesAPI.rate(id, stars);
      const d = res.data?.data;
      if (d) { setAvgRating(d.average_rating); setRatingCount(d.rating_count); setRatingDone(true); }
      toast.success(`${stars} star diya! ⭐`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating.');
      setMyRating(0);
    }
  };

  const toggleLike = async () => {
    if (!user) { toast.info('Login to perform action'); return; }
    try {
      if (liked) { await storiesAPI.unlike(id); setLiked(false); }
      else { await storiesAPI.like(id); setLiked(true); }
    } catch { /* ignore */ }
  };

  const toggleBookmark = async () => {
    if (!user) { toast.info('Login to perform action'); return; }
    try {
      if (bookmarked) { await storiesAPI.unbookmark(id); setBookmarked(false); toast.info('Bookmark hataya.'); }
      else { await storiesAPI.bookmark(id); setBookmarked(true); toast.success('Bookmark ho gaya!'); }
    } catch { /* ignore */ }
  };

  const handleAppreciate = async () => {
    if (!user) { toast.info('Login to appreciate'); return; }
    if (!story?.creator_id) { toast.error('Creator ID not found.'); return; }
    setAppreciating(true);
    try {
      await walletAPI.appreciate({ receiver_id: story.creator_id, story_id: story.id, coin_amount: coinAmount });
      await refreshWallet();
      toast.success(`🪙 ${coinAmount} coins bhej diye!`);
      setAppreciateModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Appreciation fail ho gayi.');
    } finally { setAppreciating(false); }
  };

  const refreshComments = () => {
    commentsAPI.getStoryComments(id, commentPage).then((res) => {
      const d = res.data?.data;
      setComments(Array.isArray(d) ? d : (d?.items || []));
    }).catch(() => {});
  };

  if (loading) return <Spinner fullPage />;
  if (!story) return <div className="page-wrapper"><div className="container empty-state"><p>Story not found.</p></div></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Main ── */}
          <div>
            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {story.category_name && <span className="badge badge-red">{story.category_name}</span>}
              {story.is_editor_pick && <span className="badge badge-gold">⭐ Editor's Pick</span>}
              {story.age_rating === '18+' && <span className="badge badge-muted">⚠️ 18+</span>}
            </div>

            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', lineHeight: 1.25 }}>
              {story.title}
            </h1>

            {/* Author + date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <Link to={`/profile/${story.creator_username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}>
                <Avatar url={story.creator_avatar_url} name={story.creator_display_name || story.creator_username} size={24} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {story.creator_display_name || story.creator_username}
                  {story.is_verified_creator && ' ✅'}
                </span>
              </Link>
              {story.published_at && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(story.published_at).toLocaleDateString('hi-IN')}
                </span>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              {[{ i: '👁', v: fmt(story.total_views) }, { i: '❤️', v: fmt(story.total_likes) }, { i: '💬', v: fmt(story.total_comments) }, { i: '📖', v: `${episodes.length} ep` }].map((s) => (
                <span key={s.i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {s.i} {s.v}
                </span>
              ))}
              {/* Avg rating display */}
              {ratingCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#FFD700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  ★ {avgRating.toFixed(1)} ({ratingCount})
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
              <button className={`btn btn-sm ${liked ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleLike}>
                {liked ? '❤️ Liked' : '🤍 Like'}
              </button>
              <button className={`btn btn-sm ${bookmarked ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleBookmark}>
                {bookmarked ? '🔖 Saved' : '📌 Save'}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => user ? setAppreciateModal(true) : toast.info('Login to perform action')}>
                🪙 Appreciate
              </button>
            </div>

            {/* ── Star Rating ── */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                  {ratingDone ? '✅ Your Rating' : '⭐ Rate this story'}
                </p>
                <StarRating value={myRating} onChange={user ? handleRate : () => toast.info('Login to perform action')} size="1.4rem" />
              </div>
              {ratingCount > 0 && (
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Average</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <StarRating value={Math.round(avgRating)} readonly size="0.9rem" />
                    <span style={{ fontSize: '0.8rem', color: '#FFD700', fontWeight: 700 }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({ratingCount})</span>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {story.summary && (
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: '3px solid var(--red-primary)',
                borderRadius: 'var(--radius-sm)', padding: '0.8rem 1rem',
                fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.25rem',
              }}>
                {story.summary}
              </div>
            )}

            {/* Tags */}
            {story.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {story.tags.map((t) => (
                  <span key={t} style={{ padding: '0.12rem 0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* ── Comments ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', marginBottom: '0.875rem' }}>
                💬 Comments ({story.total_comments || 0})
              </h2>

              {/* Comment input */}
              {user ? (
                <form onSubmit={postComment} style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                  <Avatar url={null} name={user.display_name || user.username} size={28} />
                  <input type="text" className="form-input" placeholder="Share your thoughts... 👻" value={commentText} onChange={(e) => setCommentText(e.target.value)} style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!commentText.trim()}>Post</button>
                </form>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <Link to="/login" style={{ color: 'var(--red-primary)' }}>Login</Link> to post a comment
                </p>
              )}

              {/* Comment list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {comments.length === 0
                  ? <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Be the first to comment! 👻</p>
                  : comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      storyId={id}
                      user={user}
                      onReplyPosted={refreshComments}
                    />
                  ))
                }
              </div>
              <Pagination page={commentPage} totalPages={commentTotalPages} onPageChange={setCommentPage} />
            </div>
          </div>

          {/* ── Sidebar: Episodes ── */}
          <div style={{ position: 'sticky', top: 'calc(var(--navbar-height) + 1rem)' }}>
            {/* Story cover (small) in sidebar */}
            {story.thumbnail_url && (
              <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.75rem', position: 'relative', height: '180px' }}>
                <img
                  src={getMediaUrl(story.thumbnail_url)}
                  alt={story.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9,1,1,0.9) 0%, transparent 55%)' }} />
                <p style={{ position: 'absolute', bottom: '0.5rem', left: '0.6rem', right: '0.6rem', fontSize: '0.72rem', color: 'white', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                  {story.title}
                </p>
              </div>
            )}

            <div className="card" style={{ padding: '0.875rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                📚 Episodes ({episodes.length})
              </h3>
              {episodes.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No episodes yet.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {episodes.map((ep, i) => (
                      <Link key={ep.id} to={`/stories/${id}/episodes/${ep.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.45rem 0.55rem',
                          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', transition: 'border-color 0.15s',
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--red-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <span style={{ fontSize: '0.65rem', color: 'var(--red-primary)', minWidth: '16px', fontWeight: 700 }}>{ep.episode_number || i + 1}</span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</p>
                            {ep.word_count > 0 && <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{ep.word_count} words</p>}
                          </div>
                          {ep.access_type !== 'free' && <span style={{ fontSize: '0.6rem', color: '#D4AF37' }}>🔒</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </div>

      {/* Appreciate Modal */}
      <Modal isOpen={appreciateModal} onClose={() => setAppreciateModal(false)} title="🪙 Appreciate Creator">
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.875rem', fontSize: '0.85rem' }}>
          How many coins do you want to send to {story.creator_display_name || story.creator_username}?
        </p>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          {[10, 25, 50, 100, 250, 500].map((amt) => (
            <button key={amt} onClick={() => setCoinAmount(amt)} className={`btn btn-sm ${coinAmount === amt ? 'btn-primary' : 'btn-ghost'}`}>
              🪙 {amt}
            </button>
          ))}
        </div>
        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label className="form-label">Custom amount</label>
          <input type="number" className="form-input" min={1} max={10000} value={coinAmount} onChange={(e) => setCoinAmount(Number(e.target.value))} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleAppreciate} disabled={appreciating || coinAmount < 1}>
          {appreciating ? 'Bhej raha hai...' : `🪙 ${coinAmount} Coins Bhejo`}
        </button>
      </Modal>
    </div>
  );
}
