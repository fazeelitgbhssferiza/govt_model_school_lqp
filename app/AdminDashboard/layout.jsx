'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from '../context/ThemeContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/Topbar.jsx';
import {
  canAccessDashboardPath,
  clearAuthSessionCookies,
  clearStoredAuth,
  getFirstAccessibleDashboardRoute,
  isAllowedRole,
  readStoredAuth,
} from './authservice/auth';

export default function AdminDashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccessiblePage, setHasAccessiblePage] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname?.startsWith('/auth/login');

  useEffect(() => {
    if (isLoginRoute) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncSidebarMode = (event) => {
      setSidebarOpen(event.matches);
    };

    syncSidebarMode(mediaQuery);
    mediaQuery.addEventListener('change', syncSidebarMode);

    return () => mediaQuery.removeEventListener('change', syncSidebarMode);
  }, [isLoginRoute]);

  useEffect(() => {
    if (isLoginRoute) {
      return;
    }

    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [isLoginRoute, pathname]);

  useEffect(() => {
    if (isLoginRoute) {
      return;
    }

    const syncAuth = () => {
      const { token, role, permissions } = readStoredAuth();
      if (!token || !isAllowedRole(role)) {
        clearStoredAuth();
        clearAuthSessionCookies();
        setCheckingAuth(true);
        setHasAccessiblePage(true);
        router.replace('/auth/login');
        return;
      }

      if (!canAccessDashboardPath(pathname, permissions)) {
        const nextRoute = getFirstAccessibleDashboardRoute(role, permissions);
        if (nextRoute) {
          setHasAccessiblePage(true);
          router.replace(nextRoute);
          return;
        }
        setHasAccessiblePage(false);
        setCheckingAuth(false);
        return;
      }
      setHasAccessiblePage(true);
      setCheckingAuth(false);
    };

    syncAuth();
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, [isLoginRoute, pathname, router]);

  useEffect(() => {
    if (isLoginRoute) {
      return undefined;
    }

    const expireBrowserSession = () => {
      clearStoredAuth();
      clearAuthSessionCookies();
    };

    window.addEventListener('pagehide', expireBrowserSession);
    return () => window.removeEventListener('pagehide', expireBrowserSession);
  }, [isLoginRoute]);

  if (isLoginRoute) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  if (checkingAuth) {
    return (
      <ThemeProvider>
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-500"></div>
            <p className="mt-4 text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!hasAccessiblePage) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-white" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="h-screen bg-slate-50 font-sans text-slate-800">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className={`flex h-screen flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-14'}`}>
          <Topbar
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((current) => !current)}
          />
          <main className="flex-1 overflow-y-auto px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:pb-8 lg:pt-24">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
