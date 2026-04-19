import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storiesAPI } from '../../api/index';
import StoryCard from '../../components/StoryCard';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';

const CATEGORIES = [
  { value: '', label: '🩸 All Genres' },
  { value: 'horror', label: '👻 Horror' },
  { value: 'thriller', label: '🔪 Thriller' },
  { value: 'supernatural', label: '👁 Supernatural' },
  { value: 'mystery', label: '🕵️ Mystery' },
  { value: 'psychological', label: '🧠 Psychological' },
  { value: 'paranormal', label: '👁‍🗨 Paranormal' },
  { value: 'dark_fantasy', label: '🌑 Dark Fantasy' },
];
const SORTS = [
  { value: 'trending', label: '🔥 Trending' },
  { value: 'latest', label: '🆕 Latest' },
  { value: 'most_viewed', label: '👁 Most Viewed' },
  { value: 'most_appreciated', label: '💰 Most Appreciated' },
  { value: 'top_rated', label: '⭐ Top Rated' },
];

export default function StoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stories, setStories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort_by') || 'trending';
  const featured = searchParams.get('featured') || '';

  useEffect(() => {
    setLoading(true);
    const params = { page, page_size: 12, sort_by: sortBy };
    if (category) params.category = category;
    if (search) params.search = search;
    if (featured) params.is_featured = true;

    storiesAPI.list(params)
      .then((res) => {
        const data = res.data?.data;
        setStories(data?.items || data || []);
        setTotalPages(data?.total_pages || 1);
      })
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [page, category, sortBy, search, featured]);

  const updateParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParam('q', search);
  };

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* ── Header ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            🩸 <span style={{ color: 'var(--red-primary)' }}>Horror</span> Stories
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Welcome to the world of fear — stories of the dark nights
          </p>
        </div>

        {/* ── Filters Bar ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.875rem 1rem',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '0.65rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search stories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm">Khojo</button>
          </form>

          {/* Category */}
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '158px' }}
            value={category}
            onChange={(e) => updateParam('category', e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '158px' }}
            value={sortBy}
            onChange={(e) => updateParam('sort_by', e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Featured toggle */}
          <button
            className={`btn btn-sm ${featured ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateParam('featured', featured ? '' : '1')}
          >
            ⭐ Featured
          </button>
        </div>

        {/* ── Results info ── */}
        {!loading && stories.length > 0 && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            {category ? `In "${category}" ` : 'Total '}{stories.length} stories • Page {page}
          </p>
        )}

        {/* ── Stories Grid ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size={48} />
          </div>
        ) : stories.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👻</div>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No stories found</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filters badlo ya alag genre chunno</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {stories.map((s) => <StoryCard key={s.id} story={s} />)}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                const params = new URLSearchParams(searchParams);
                params.set('page', p);
                setSearchParams(params);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
