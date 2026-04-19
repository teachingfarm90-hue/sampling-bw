import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isAdmin } from '../lib/auth';
import { useEffect, useState } from 'react';
import { syncToSupabase } from '../lib/sync';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncing(true);
      syncToSupabase().finally(() => setSyncing(false));
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tutup menu saat navigasi
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    if (confirm('Yakin ingin logout?')) {
      logout();
      navigate('/login');
    }
  };

  const isMobile = window.innerWidth < 768;

  const navLinks = [
    { to: '/kandang', label: 'Kandang' },
    { to: '/input', label: 'Input' },
    // Dashboard, Users, Audit hanya untuk desktop
    ...(!isMobile ? [
      { to: '/dashboard', label: 'Dashboard' },
      ...(isAdmin() ? [
        { to: '/users', label: 'Users' },
        { to: '/admin', label: 'Audit' }
      ] : [])
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">

            {/* Logo & Status */}
            <div>
              <h1 className="text-base md:text-xl font-bold leading-tight">🐔 Smart Farm</h1>
              {user && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-xs text-green-100 truncate max-w-[130px] md:max-w-none">
                    {user.nama} {user.role === 'admin' ? '👑' : '👤'}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                    syncing ? 'bg-yellow-400 text-yellow-900'
                    : isOnline ? 'bg-green-300 text-green-900'
                    : 'bg-red-400 text-red-900'
                  }`}>
                    {syncing ? '⟳' : isOnline ? '●' : '○'}
                    <span className="hidden sm:inline ml-1">
                      {syncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex gap-2 items-center">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded text-sm ${location.pathname === link.to ? 'bg-green-700' : 'hover:bg-green-500'}`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded text-sm bg-red-500 hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button
              className="md:hidden p-2 rounded hover:bg-green-500"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Dropdown */}
          {menuOpen && (
            <div className="md:hidden mt-2 pb-1 border-t border-green-500 pt-2 flex flex-col gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-3 rounded text-sm font-medium ${location.pathname === link.to ? 'bg-green-700' : 'hover:bg-green-500'}`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="mt-1 px-4 py-3 rounded text-sm font-medium bg-red-500 hover:bg-red-600 text-left"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 pb-20">
        <Outlet />
      </main>

      {/* Shaka Digital Branding */}
      <div className="fixed bottom-4 left-4 z-50">
        <a
          href="https://shakadigital.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <img src="/shaka-logo.svg" alt="Shaka Digital" className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
            shakadigital.com
          </span>
        </a>
      </div>
    </div>
  );
}
