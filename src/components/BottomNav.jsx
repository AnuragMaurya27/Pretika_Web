import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { to: '/', icon: '🏠', label: 'Home' },
    { to: '/stories', icon: '📚', label: 'Stories' },
    { to: '/search', icon: '🔍', label: 'Search' },
    { to: '/write', icon: '✍️', label: 'Create' },
    { to: '/chat', icon: '💬', label: 'Chat' },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <Link key={item.to} to={item.to} className={`bottom-nav-item ${isActive(item.to) ? 'active' : ''}`}>
          <div className="icon">
            {item.icon}
          </div>
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
