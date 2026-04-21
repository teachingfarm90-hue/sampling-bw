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

  const handleLogout = () => {
    if (confirm('Yakin ingin logout?')) {
      logout();
      navigate('/login');
    }
  };

  // Desktop nav links
  const desktopLinks = [
    { to: '/kandang', label: 'Kandang' },
    { to: '/input', label: 'Input' },
    { to: '/sebaran', label: 'Sebaran' },
    { to: '/dashboard', label: 'Dashboard' },
    ...(isAdmin() ? [
      { to: '/users', label: 'Users' },
      { to: '/admin', label: 'Audit' }
    ] : [])
  ];

  // Mobile bottom nav — 4 menu utama yang paling sering dipakai
  const bottomNavLinks = [
    {
      to: '/kandang',
      label: 'Kandang',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: '/input',
      label: 'Input',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      to: '/sebaran',
      label: 'Sebaran',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
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
              {desktopLinks.map(link => (
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

            {/* Mobile: Logout button di top nav */}
            <button
              className="md:hidden px-3 py-1.5 rounded text-xs bg-red-500 hover:bg-red-600 font-medium"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content — padding bawah lebih besar untuk bottom nav */}
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex">
          {bottomNavLinks.map(link => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  active
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {link.icon}
                <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
