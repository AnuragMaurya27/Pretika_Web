import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storiesAPI } from '../../api/index';
import Spinner from '../../components/Spinner';
import { useToast } from '../../components/Toast';

export default function EpisodeReader() {
  // Route: /stories/:storyId/episodes/:episodeId
  const { id: storyId, episodeId } = useParams();
  const toast = useToast();
  const [story, setStory] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(17);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storiesAPI.getById(storyId),
      storiesAPI.getEpisode(storyId, episodeId),
      storiesAPI.getEpisodes(storyId),
    ]).then(([sRes, eRes, esRes]) => {
      setStory(sRes.data?.data);
      setEpisode(eRes.data?.data);
      const eps = esRes.data?.data;
      setEpisodes(Array.isArray(eps) ? eps : (eps?.items || []));
      setLoading(false);
    }).catch(() => {
      toast.error('Episode load nahi hua.');
      setLoading(false);
    });
  }, [storyId, episodeId]);

  if (loading) return <Spinner fullPage />;
  if (!episode) return <div className="page-wrapper"><div className="container empty-state"><p>Episode nahi mila.</p></div></div>;

  const currentIndex = episodes.findIndex((e) => e.id === episodeId);
  const prevEp = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEp = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
  const readTime = episode.estimated_read_time_seconds
    ? Math.ceil(episode.estimated_read_time_seconds / 60)
    : episode.word_count ? Math.ceil(episode.word_count / 250) : null;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '700px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <Link to="/stories" style={{ color: 'var(--red-primary)' }}>Stories</Link>
          <span>›</span>
          <Link to={`/stories/${storyId}`} style={{ color: 'var(--red-primary)' }}>{story?.title}</Link>
          <span>›</span>
          <span>{episode.title}</span>
        </div>

        {/* Font controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Aa</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setFontSize(Math.max(13, fontSize - 1))}>−</button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '24px', textAlign: 'center' }}>{fontSize}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setFontSize(Math.min(24, fontSize + 1))}>+</button>
        </div>

        {/* Episode header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--red-primary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Episode {episode.episode_number || currentIndex + 1} / {episodes.length}
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            {episode.title}
          </h1>
          {readTime && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>~{readTime} min padhne mein</p>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2rem' }} />

        {/* Content */}
        <div style={{
          fontSize: `${fontSize}px`, lineHeight: 1.9,
          color: 'var(--text-primary)', fontFamily: 'Georgia, serif',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {episode.content || 'Content yahan aayega...'}
        </div>

        <div style={{ height: '1px', background: 'var(--border)', margin: '2.5rem 0 1.75rem' }} />

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          {prevEp
            ? <Link to={`/stories/${storyId}/episodes/${prevEp.id}`} className="btn btn-ghost btn-sm">← {prevEp.title}</Link>
            : <Link to={`/stories/${storyId}`} className="btn btn-ghost btn-sm">← Story</Link>
          }
          <Link to={`/stories/${storyId}`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📚 Sab Episodes</Link>
          {nextEp
            ? <Link to={`/stories/${storyId}/episodes/${nextEp.id}`} className="btn btn-primary btn-sm">{nextEp.title} →</Link>
            : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aakhri episode 🎭</span>
          }
        </div>
      </div>
    </div>
  );
}
