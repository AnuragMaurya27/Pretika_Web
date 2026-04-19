import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BottomNav from './components/BottomNav';
import Spinner from './components/Spinner';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import StoriesPage from './pages/Stories/StoriesPage';
import StoryDetail from './pages/Stories/StoryDetail';
import ChapterReader from './pages/Stories/ChapterReader';
import ProfilePage from './pages/Profile/ProfilePage';
import WalletPage from './pages/Wallet/WalletPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage';
import ChatPage from './pages/Chat/ChatPage';
import SupportPage from './pages/Support/SupportPage';
import AdminDashboard from './pages/Admin/AdminDashboard';
import CreatorDashboard from './pages/Creator/CreatorDashboard';
import SearchPage from './pages/Search/SearchPage';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner fullPage />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

// Redirect if already logged in
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

// Full-screen pages (no navbar/footer)
const FULL_SCREEN_PATHS = ['/chat'];
const NO_FOOTER_PATHS = ['/chat'];

function Layout({ children }) {
  const location = useLocation();
  const isFullScreen = FULL_SCREEN_PATHS.some((p) => location.pathname.startsWith(p));
  const noFooter = NO_FOOTER_PATHS.some((p) => location.pathname.startsWith(p));
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isFullScreen && !isAuthPage && <Navbar />}
      <main style={{ flex: 1 }}>
        {children}
      </main>
      {!isAuthPage && !noFooter && <Footer />}
      {!isFullScreen && !isAuthPage && <BottomNav />}
    </div>
  );
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/stories/:id" element={<StoryDetail />} />
        <Route path="/stories/:id/episodes/:episodeId" element={<ChapterReader />} />
        {/* backward compat */}
        <Route path="/stories/:id/chapters/:episodeId" element={<ChapterReader />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />

        {/* Auth (guest only) */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

        {/* Protected */}
        <Route path="/write" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '4rem' }}>👻</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--red-primary)' }}>404</h1>
            <p style={{ color: 'var(--text-muted)' }}>Yeh page andheron mein kho gaya.</p>
            <a href="/" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>🏠 Ghar Wapas Jao</a>
          </div>
        } />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
