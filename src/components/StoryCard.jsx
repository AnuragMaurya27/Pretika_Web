import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/media';

const API = 'https://pretika-api-1.onrender.com';

function fmt(n = 0) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

const BG_GRADIENT = 'linear-gradient(160deg, #2d0000 0%, #1a0000 55%, #000 100%)';
const EMOJIS = ['👻','🕸️','💀','🩸','🌑','👁','🦇','🕯️','⚰️','🌫️'];

export default function StoryCard({ story }) {
  if (!story) return null;

  const author   = story.creator_display_name || story.creator_username || 'Unknown';
  const emojiIdx = story.id ? story.id.charCodeAt(0) % EMOJIS.length : 0;

  const rawThumb = story.thumbnail_url;
  const thumb = getMediaUrl(rawThumb);

  return (
    <Link to={`/stories/${story.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        style={{
          width: '160px',
          height: '230px',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
          background: BG_GRADIENT,
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px) scale(1.03)';
          e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(220,20,60,0.45)';
          e.currentTarget.style.borderColor = 'rgba(220,20,60,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        }}
      >
        {/* Cover image */}
        {thumb ? (
          <img
            src={thumb}
            alt={story.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', opacity: 0.1 }}>
            {EMOJIS[emojiIdx]}
          </div>
        )}

        {/* Gradient overlay — stronger at bottom */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.05) 100%)' }} />

        {/* Top badges */}
        <div style={{ position: 'absolute', top: '0.35rem', left: '0.35rem', right: '0.35rem', display: 'flex', justifyContent: 'space-between', gap: '0.25rem', zIndex: 2 }}>
          {story.story_type === 'series' && (
            <span style={{ background: 'rgba(0,0,0,0.8)', color: '#ccc', fontSize: '0.48rem', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.5px' }}>
              📚 SERIES
            </span>
          )}
          {story.is_editor_pick && (
            <span style={{ background: 'rgba(212,175,55,0.92)', color: '#000', fontSize: '0.48rem', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 800, marginLeft: 'auto' }}>
              ⭐ PICK
            </span>
          )}
        </div>

        {/* Bottom content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.6rem 0.55rem 0.5rem', zIndex: 2 }}>
          {/* Category badge */}
          {story.category_name && (
            <span style={{ display: 'inline-block', background: 'rgba(220,20,60,0.9)', color: '#fff', fontSize: '0.48rem', padding: '0.08rem 0.32rem', borderRadius: '3px', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
              {story.category_name}
            </span>
          )}

          {/* Title — large, bold, high contrast */}
          <p style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.88rem',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 6px rgba(0,0,0,1), 0 2px 12px rgba(0,0,0,0.9)',
            marginBottom: '0.35rem',
            letterSpacing: '0.02em',
          }}>
            {story.title}
          </p>

          {/* Author + Stats row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 500 }}>
              {story.is_verified_creator && <span style={{ color: '#ff4466', marginRight: '0.12rem' }}>✓</span>}
              {author}
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, alignItems: 'center' }}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.62rem' }}>👁</span>{fmt(story.total_views || 0)}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,200,200,0.9)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                <span style={{ fontSize: '0.62rem' }}>❤</span>{fmt(story.total_likes || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
