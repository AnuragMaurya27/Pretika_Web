import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { storiesAPI, usersAPI } from '../../api/index';
import { getMediaUrl } from '../../utils/media';
import StoryCard from '../../components/StoryCard';
import Spinner from '../../components/Spinner';
import Pagination from '../../components/Pagination';

const API_BASE = 'https://pretika-api-1.onrender.com';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

// ── Options ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: '', label: 'Sab Categories' },
  { value: 'ghost-stories',       label: '👻 Ghost Stories' },
  { value: 'haunted-places',      label: '🏚️ Haunted Places' },
  { value: 'urban-legends',       label: '🌆 Urban Legends' },
  { value: 'real-experiences',    label: '😱 Real Experiences' },
  { value: 'paranormal',          label: '👁️ Paranormal' },
  { value: 'jinn-spirits',        label: '🕌 Jinn & Spirits' },
  { value: 'psychological-horror',label: '🧠 Psychological Horror' },
  { value: 'tantrik-black-magic', label: '🔮 Tantrik & Black Magic' },
  { value: 'village-horror',      label: '🌾 Village Horror' },
  { value: 'yakshini-stories',    label: '🌙 Yakshini Stories' },
  { value: 'mythology-horror',    label: '⚡ Mythology Horror' },
  { value: 'creepypasta',         label: '💻 Creepypasta' },
  { value: 'micro-horror',        label: '⚡ Micro Horror' },
  { value: 'serial-horror',       label: '📚 Serial Horror' },
  { value: 'scifi-horror',        label: '🚀 Sci-Fi Horror' },
  { value: 'horror-poetry',       label: '📜 Horror Poetry' },
];

const LANGUAGES = [
  { value: '',         label: 'Teeno Bhasha' },
  { value: 'hindi',   label: '🇮🇳 Hindi' },
  { value: 'hinglish',label: '🔀 Hinglish' },
  { value: 'english', label: '🇬🇧 English' },
];

const STORY_TYPES = [
  { value: '',       label: 'Sab Types' },
  { value: 'single', label: '📄 Single Story' },
  { value: 'series', label: '📚 Series' },
];

const SORTS = [
  { value: 'trending',         label: '🔥 Trending' },
  { value: 'latest',           label: '🆕 Latest' },
  { value: 'most_viewed',      label: '👁️ Most Viewed' },
  { value: 'most_liked',       label: '❤️ Most Liked' },
  { value: 'top_rated',        label: '⭐ Top Rated' },
  { value: 'recently_updated', label: '🔄 Recently Updated' },
];

// ── Creator card (search results) ─────────────────────────────────────────────
function CreatorCard({ creator }) {
  const avatarSrc = getMediaUrl(creator.avatar_url);
  return (
    <Link to={`/profile/${creator.username}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--red-dark)', border: '2px solid rgba(220,20,60,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', color: 'white', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
        }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
            : (creator.display_name || creator.username || '?')[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {creator.display_name || creator.username}
            {creator.is_verified_creator && <span style={{ color: '#4fc3f7', marginLeft: '0.3rem', fontSize: '0.75rem' }}>✅</span>}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{creator.username}</p>
          {(creator.total_followers !== undefined || creator.bio) && (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {creator.total_followers !== undefined ? `${creator.total_followers} followers` : creator.bio}
            </p>
          )}
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--red-primary)', flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

// ── Active filter chip ────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.3)',
      borderRadius: '20px', padding: '0.18rem 0.55rem',
      fontSize: '0.72rem', color: 'var(--red-primary)', fontWeight: 600,
    }}>
      {label}
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--red-primary)', fontSize: '0.75rem', padding: '0', lineHeight: 1,
        display: 'flex', alignItems: 'center',
      }}>✕</button>
    </span>
  );
}

// ── Main SearchPage ───────────────────────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  // ── State from URL ──
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [tab, setTab] = useState(searchParams.get('tab') || 'stories'); // stories | creators

  // Filter state
  const [category, setCategory]   = useState(searchParams.get('category') || '');
  const [language, setLanguage]   = useState(searchParams.get('language') || '');
  const [storyType, setStoryType] = useState(searchParams.get('type') || '');
  const [sortBy, setSortBy]       = useState(searchParams.get('sort') || 'trending');
  const [dateFrom, setDateFrom]   = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo]       = useState(searchParams.get('to') || '');
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [stories, setStories]         = useState([]);
  const [storyTotal, setStoryTotal]   = useState(0);
  const [storyPages, setStoryPages]   = useState(1);
  const [storyPage, setStoryPage]     = useState(parseInt(searchParams.get('page') || '1'));
  const [creators, setCreators]       = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  // ── Sync URL → search ──
  const syncURL = useCallback((overrides = {}) => {
    const p = new URLSearchParams();
    const q   = overrides.q          ?? query;
    const t   = overrides.tab        ?? tab;
    const cat = overrides.category   ?? category;
    const lan = overrides.language   ?? language;
    const typ = overrides.storyType  ?? storyType;
    const srt = overrides.sortBy     ?? sortBy;
    const df  = overrides.dateFrom   ?? dateFrom;
    const dt  = overrides.dateTo     ?? dateTo;
    const pg  = overrides.page       ?? 1;
    if (q)   p.set('q', q);
    if (t !== 'stories') p.set('tab', t);
    if (cat) p.set('category', cat);
    if (lan) p.set('language', lan);
    if (typ) p.set('type', typ);
    if (srt !== 'trending') p.set('sort', srt);
    if (df)  p.set('from', df);
    if (dt)  p.set('to', dt);
    if (pg > 1) p.set('page', pg);
    setSearchParams(p, { replace: true });
  }, [query, tab, category, language, storyType, sortBy, dateFrom, dateTo, setSearchParams]);

  // ── Fetch stories ──
  useEffect(() => {
    setLoadingStories(true);
    setStoryPage(1);
    const params = {
      search: debouncedQuery || undefined,
      category: category || undefined,
      language: language || undefined,
      story_type: storyType || undefined,
      sort_by: sortBy,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: 1,
      page_size: 18,
    };
    storiesAPI.list(params)
      .then((res) => {
        const d = res.data?.data;
        setStories(d?.items || d || []);
        setStoryTotal(d?.total_count || 0);
        setStoryPages(d?.total_pages || 1);
      })
      .catch(() => { setStories([]); setStoryTotal(0); })
      .finally(() => setLoadingStories(false));
  }, [debouncedQuery, category, language, storyType, sortBy, dateFrom, dateTo]);

  // ── Fetch stories on page change ──
  const fetchStoriesPage = (pg) => {
    setLoadingStories(true);
    setStoryPage(pg);
    const params = {
      search: debouncedQuery || undefined,
      category: category || undefined,
      language: language || undefined,
      story_type: storyType || undefined,
      sort_by: sortBy,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: pg,
      page_size: 18,
    };
    storiesAPI.list(params)
      .then((res) => {
        const d = res.data?.data;
        setStories(d?.items || d || []);
        setStoryTotal(d?.total_count || 0);
        setStoryPages(d?.total_pages || 1);
      })
      .catch(() => setStories([]))
      .finally(() => setLoadingStories(false));
  };

  // ── Fetch creators ──
  useEffect(() => {
    if (tab !== 'creators') return;
    if (!debouncedQuery.trim()) { setCreators([]); return; }
    setLoadingCreators(true);
    usersAPI.search(debouncedQuery.trim())
      .then((res) => setCreators(res.data?.data || []))
      .catch(() => setCreators([]))
      .finally(() => setLoadingCreators(false));
  }, [debouncedQuery, tab]);

  // ── Focus input on mount ──
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Active filter chips ──
  const activeFilters = [
    category  && { key: 'category',   label: `📂 ${CATEGORIES.find(c=>c.value===category)?.label || category}`,    clear: () => { setCategory('');  } },
    language  && { key: 'language',   label: `🗣️ ${LANGUAGES.find(l=>l.value===language)?.label || language}`,     clear: () => { setLanguage('');  } },
    storyType && { key: 'storyType',  label: `📑 ${STORY_TYPES.find(t=>t.value===storyType)?.label || storyType}`, clear: () => { setStoryType(''); } },
    dateFrom  && { key: 'dateFrom',   label: `📅 From: ${dateFrom}`,  clear: () => { setDateFrom(''); } },
    dateTo    && { key: 'dateTo',     label: `📅 To: ${dateTo}`,      clear: () => { setDateTo('');   } },
    sortBy !== 'trending' && { key: 'sort', label: `🔀 ${SORTS.find(s=>s.value===sortBy)?.label || sortBy}`, clear: () => setSortBy('trending') },
  ].filter(Boolean);

  const clearAll = () => {
    setCategory(''); setLanguage(''); setStoryType('');
    setDateFrom(''); setDateTo(''); setSortBy('trending');
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: '1100px' }}>

        {/* ── Hero Search Bar ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(220,20,60,0.08) 0%, rgba(9,1,1,0.95) 100%)',
          border: '1px solid rgba(220,20,60,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem 1.5rem 1.25rem',
          marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--red-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            🔍 Advanced Search
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', marginBottom: '0.875rem', lineHeight: 1.2 }}>
            Koi bhi kahani ya creator dhundho
          </h1>

          {/* Big search input */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              placeholder="Hindi, Hinglish ya English mein likho... (title, creator, tag)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                paddingLeft: '2.6rem', paddingRight: query ? '2.6rem' : '1rem',
                fontSize: '1rem', height: '3rem',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(220,20,60,0.3)',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{
                position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '1rem',
              }}>✕</button>
            )}
          </div>

          {/* Tabs + Filter toggle row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { key: 'stories',  label: '📚 Stories' },
                { key: 'creators', label: '👤 Creators' },
              ].map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  background: tab === t.key ? 'rgba(220,20,60,0.15)' : 'transparent',
                  border: `1px solid ${tab === t.key ? 'rgba(220,20,60,0.5)' : 'var(--border)'}`,
                  borderRadius: '20px', padding: '0.3rem 0.85rem',
                  fontSize: '0.78rem', color: tab === t.key ? 'var(--red-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: tab === t.key ? 700 : 400,
                  transition: 'all 0.15s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filter toggle button */}
            <button onClick={() => setShowFilters((v) => !v)} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: showFilters ? 'rgba(220,20,60,0.1)' : 'transparent',
              border: `1px solid ${showFilters ? 'rgba(220,20,60,0.4)' : 'var(--border)'}`,
              borderRadius: '20px', padding: '0.3rem 0.85rem',
              fontSize: '0.78rem', color: showFilters ? 'var(--red-primary)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              ⚙️ Filters{hasActiveFilters ? ` (${activeFilters.length})` : ''}
              <span style={{ fontSize: '0.65rem' }}>{showFilters ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* ── Filters Panel ── */}
        {showFilters && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
            marginBottom: '1.1rem',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem',
          }}>
            {/* Category */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Language */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bhasha / Language</label>
              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            {/* Story Type */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Story Type</label>
              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={storyType} onChange={(e) => setStoryType(e.target.value)}>
                {STORY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort By</label>
              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Published After</label>
              <input type="date" className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            {/* Date To */}
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📅 Published Before</label>
              <input type="date" className="form-input" style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {/* Clear all */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                  🗑️ Sab clear karo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Active Filter Chips ── */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active:</span>
            {activeFilters.map((f) => (
              <FilterChip key={f.key} label={f.label} onRemove={f.clear} />
            ))}
            {activeFilters.length > 1 && (
              <button onClick={clearAll} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'underline', padding: 0,
              }}>sab hatao</button>
            )}
          </div>
        )}

        {/* ── Results header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {tab === 'stories' && !loadingStories && (
              storyTotal > 0
                ? <><span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{storyTotal}</span> kahaniyaan mili{query ? ` "${query}" ke liye` : ''}</>
                : query ? `"${query}" ke liye koi kahani nahi mili` : 'Sab published kahaniyaan'
            )}
            {tab === 'creators' && !loadingCreators && (
              creators.length > 0
                ? <><span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{creators.length}</span> creators mile{query ? ` "${query}" ke liye` : ''}</>
                : query ? `"${query}" naam ka creator nahi mila` : 'Creator dhundhne ke liye kuch likho'
            )}
          </p>

          {/* Quick sort pills (stories tab only) */}
          {tab === 'stories' && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {SORTS.slice(0, 4).map((s) => (
                <button key={s.value} onClick={() => setSortBy(s.value)} style={{
                  background: sortBy === s.value ? 'rgba(220,20,60,0.15)' : 'transparent',
                  border: `1px solid ${sortBy === s.value ? 'rgba(220,20,60,0.4)' : 'var(--border)'}`,
                  borderRadius: '20px', padding: '0.2rem 0.6rem',
                  fontSize: '0.68rem', color: sortBy === s.value ? 'var(--red-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Stories Results ── */}
        {tab === 'stories' && (
          <>
            {loadingStories ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                <Spinner size={44} />
              </div>
            ) : stories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👻</div>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  {query ? `"${query}" nahi mila` : 'Koi kahani nahi'}
                </p>
                <p style={{ fontSize: '0.82rem' }}>
                  {query ? 'Alag spelling try karo, ya filters hatao' : 'Filters change karo'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearAll} className="btn btn-ghost" style={{ marginTop: '1rem', fontSize: '0.82rem' }}>
                    🗑️ Sab filters hatao
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {stories.map((s) => <StoryCard key={s.id} story={s} />)}
                </div>
                <Pagination page={storyPage} totalPages={storyPages} onPageChange={fetchStoriesPage} />
              </>
            )}
          </>
        )}

        {/* ── Creators Results ── */}
        {tab === 'creators' && (
          <>
            {loadingCreators ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                <Spinner size={44} />
              </div>
            ) : !query.trim() ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👤</div>
                <p style={{ fontSize: '0.9rem' }}>Creator ka naam ya username likho upar search mein</p>
              </div>
            ) : creators.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>😶</div>
                <p style={{ fontSize: '0.9rem' }}>{`"${query}" naam ka koi creator nahi mila`}</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '0.75rem',
              }}>
                {creators.map((c) => <CreatorCard key={c.id} creator={c} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
