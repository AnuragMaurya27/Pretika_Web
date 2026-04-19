import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storiesAPI, notificationsAPI, usersAPI } from '../api/index';
import { getMediaUrl } from '../utils/media';
import StoryCard from '../components/StoryCard';
import Spinner from '../components/Spinner';
import BloodDropLogo from '../components/BloodDropLogo';

// Creator Suggestion Card matching Flutter's CreatorSuggestionCard
function CreatorCard({ creator }) {
  const avatarSrc = getMediaUrl(creator.avatar_url);
  const initial = (creator.display_name || creator.username || '?')[0].toUpperCase();
  
  return (
    <Link to={`/profile/${creator.username}`} style={{ textDecoration: 'none' }}>
      <div style={{
        width: '160px',
        height: '230px',
        padding: '1.5rem 1rem',
        borderRadius: '10px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        flexShrink: 0,
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--red-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      >
        <div style={{
          width: '75px', height: '75px', borderRadius: '50%', overflow: 'hidden',
          marginBottom: '1rem', border: '3px solid var(--red-light)',
          background: 'var(--red-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.8rem', fontWeight: 700
        }}>
          {avatarSrc ? (
            <img src={avatarSrc} alt={creator.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
          ) : initial}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {creator.display_name || creator.username}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {creator.total_followers || 0} Followers
        </div>
        <div style={{ marginTop: 'auto', padding: '0.3rem 0.8rem', background: 'var(--red-glow)', color: 'var(--red-primary)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
          View Profile
        </div>
      </div>
    </Link>
  );
}

function SectionHeader({ title, icon, path }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.25rem 0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
        {icon} {title}
      </h2>
      {path && (
        <span onClick={() => navigate(path)} style={{ fontSize: '0.85rem', color: 'var(--red-primary)', cursor: 'pointer', fontWeight: 600 }}>
          See All →
        </span>
      )}
    </div>
  );
}

function SectionDivider() {
  return <div style={{ height: '6px', marginTop: '1.5rem', marginBottom: '0.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />;
}

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categoryStories, setCategoryStories] = useState({});
  const [creators, setCreators] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const sectionRefs = useRef({});

  const extractList = (res) => {
    const d = res?.data?.data;
    if (Array.isArray(d)) return d;
    if (d?.items && Array.isArray(d.items)) return d.items;
    return [];
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [catRes, trendRes, recRes, creatRes, annRes] = await Promise.all([
          storiesAPI.getCategories().catch(() => null),
          storiesAPI.list({ sort_by: 'trending', page_size: 10 }).catch(() => null),
          storiesAPI.list({ sort_by: 'latest', page_size: 10 }).catch(() => null),
          usersAPI.search('a', 1).catch(() => null),
          notificationsAPI.getAnnouncements().catch(() => null),
        ]);

        const cats = extractList(catRes);
        setCategories(cats);
        setTrending(extractList(trendRes));
        setRecent(extractList(recRes));
        setAnnouncements(annRes?.data?.data || []);
        
        const searchList = extractList(creatRes);
        setCreators(searchList.filter(u => u.is_creator).slice(0, 10));

        const catStoriesTemp = {};
        await Promise.all(
          cats.map(async (cat) => {
            try {
              const res = await storiesAPI.list({ category: cat.slug, page_size: 10 });
              catStoriesTemp[cat.slug] = extractList(res);
            } catch (e) {
              catStoriesTemp[cat.slug] = [];
            }
          })
        );
        setCategoryStories(catStoriesTemp);
      } catch (err) {
        console.error('Error fetching home data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const scrollToSection = (slug) => {
    setActiveTab(slug);
    if (slug === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = sectionRefs.current[slug];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120; 
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  if (loading) return <Spinner fullPage />;

  const activeCats = categories.filter(c => categoryStories[c.slug]?.length > 0);

  return (
    <div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Hero Section */}
      <section style={{
        minHeight: '88vh',
        background: 'linear-gradient(160deg, #FFF5F5 0%, #FFE8EC 45%, #FFF8F6 100%)',
        display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
        paddingTop: 'var(--navbar-height)'
      }}>
        <div style={{
          position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,20,60,0.08) 0%, transparent 70%)',
          top: '-100px', right: '-80px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: '350px', height: '350px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,20,60,0.05) 0%, transparent 70%)',
          bottom: '-50px', left: '5%', pointerEvents: 'none',
        }} />
        <div style={{ position: 'absolute', top: '10%', left: '2%', fontSize: '6rem', opacity: 0.04, userSelect: 'none', pointerEvents: 'none', transform: 'rotate(-15deg)' }}>💀</div>
        <div style={{ position: 'absolute', bottom: '8%', right: '3%', fontSize: '5rem', opacity: 0.04, userSelect: 'none', pointerEvents: 'none', transform: 'rotate(10deg)' }}>👁</div>

        <div className="container" style={{ zIndex: 1, textAlign: 'center', padding: '5rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <BloodDropLogo size={64} />
          </div>
          <p style={{ fontSize: '0.75rem', letterSpacing: '4px', color: 'var(--red-primary)', textTransform: 'uppercase', marginBottom: '0.875rem', fontWeight: 700 }}>
            India's Horror Universe
          </p>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(2rem, 5.5vw, 3.8rem)',
            color: 'var(--text-primary)', marginBottom: '1.25rem', lineHeight: 1.2,
          }}>
            Welcome to the World of<br />
            <span style={{ color: 'var(--red-primary)' }}>Horror</span>
          </h1>
          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: 'var(--text-muted)',
            maxWidth: '540px', margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            Step into the world of horror stories, supernatural tales, and psychological thrillers. 
            Become a reader, become a creator.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/stories" className="btn btn-primary btn-lg">
              🩸 Read Stories
            </Link>
            <Link to="/write" className="btn btn-outline btn-lg">
              ✍️ Write Your Story
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
            {[
              { num: '10K+', label: 'Horror Stories' },
              { num: '50K+', label: 'Readers' },
              { num: '5K+', label: 'Creators' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.7rem', color: 'var(--red-primary)', fontWeight: 700 }}>{s.num}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section style={{ background: 'rgba(220,20,60,0.04)', borderBottom: '1px solid var(--border)', padding: '0.7rem 0' }}>
          <div className="container">
            <div className="hide-scrollbar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', overflowX: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--red-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>📢 NEWS:</span>
              {announcements.slice(0, 3).map((a) => (
                <span key={a.id} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {a.title} •
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky Category Tabs */}
      <div style={{
        position: 'sticky',
        top: 'var(--navbar-height)',
        zIndex: 40,
        background: 'var(--bg-primary)',
        padding: '0.8rem 0',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '0.6rem', padding: '0 1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div 
            onClick={() => scrollToSection('all')}
            style={{
              padding: '0.45rem 1.2rem', borderRadius: '20px',
              border: `1px solid ${activeTab === 'all' ? 'var(--red-primary)' : 'var(--border)'}`,
              background: activeTab === 'all' ? 'var(--red-primary)' : 'var(--bg-card)',
              color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            All
          </div>
          {activeCats.map(cat => (
            <div
              key={cat.id}
              onClick={() => scrollToSection(cat.slug)}
              style={{
                padding: '0.45rem 1.2rem', borderRadius: '20px',
                border: `1px solid ${activeTab === cat.slug ? 'var(--red-primary)' : 'var(--border)'}`,
                background: activeTab === cat.slug ? 'var(--red-primary)' : 'var(--bg-card)',
                color: activeTab === cat.slug ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {cat.name}
            </div>
          ))}
        </div>
      </div>

      <main style={{ padding: '0', background: 'var(--bg-primary)' }}>
        {/* Trending Section */}
        {trending.length > 0 && (
          <div>
            <SectionHeader title="Trending Stories" icon="🔥" path="/stories?sort_by=trending" />
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', padding: '0.5rem 1.25rem 1.5rem', gap: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {trending.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 && <SectionDivider />}

        {/* Nayi Kahaniyan Section */}
        {recent.length > 0 && (
          <div>
            <SectionHeader title="New Stories" icon="📖" path="/stories?sort_by=latest" />
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', padding: '0.5rem 1.25rem 1.5rem', gap: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {recent.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        )}

        {/* Category Sections */}
        {activeCats.map((cat) => (
          <div key={cat.id} ref={el => sectionRefs.current[cat.slug] = el}>
            <SectionDivider />
            <SectionHeader title={cat.name} icon="📚" path={`/stories?category=${cat.slug}`} />
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', padding: '0.5rem 1.25rem 1.5rem', gap: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {categoryStories[cat.slug].map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        ))}

        {/* New Creators Section */}
        {creators.length > 0 && (
          <div>
            <SectionDivider />
            <SectionHeader title="New Creators" icon="✨" />
            <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', padding: '0.5rem 1.25rem 1.5rem', gap: '1.2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {creators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="container" style={{ paddingBottom: '3.5rem', paddingTop: '1rem' }}>
          <section style={{
            marginTop: '2rem', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(220,20,60,0.06) 0%, var(--bg-secondary) 50%, rgba(220,20,60,0.04) 100%)',
            border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,20,60,0.08) 0%, transparent 70%)', top: '-100px', right: '-50px', pointerEvents: 'none' }} />

            <div style={{ fontSize: '3rem', margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>✍️</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', marginBottom: '0.75rem', position: 'relative' }}>
              Become a <span style={{ color: 'var(--red-primary)' }}>Horror Creator</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.7, position: 'relative' }}>
              Write your horror stories, earn coins, and become part of India's largest horror community.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                🩸 Join Now — It's Free!
              </Link>
              <Link to="/stories" className="btn btn-ghost btn-lg">
                📚 Read First
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
