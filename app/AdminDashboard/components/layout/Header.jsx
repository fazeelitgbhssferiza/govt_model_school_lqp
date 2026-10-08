'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../authservice/useAuth';
import { useTheme } from '../../../context/ThemeContext';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';

const topbarMenu = [
  { label: 'Dashboard', href: '/AdminDashboard/dashboard' },
  { label: 'Students', href: '/AdminDashboard/students' },
  { label: 'Teachers', href: '/AdminDashboard/teachers' },
  { label: 'Attendance', href: '/AdminDashboard/attendance' },
  { label: 'Results', href: '/AdminDashboard/results' },
];

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const pageTitle =
    pathname
      ?.split('/')
      .filter(Boolean)
      .at(-1)
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Dashboard';
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfile(false);
    logout?.();
  };

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg'
          : 'bg-white dark:bg-slate-900'
      } border-b border-slate-200/50 dark:border-slate-800/50`}
    >
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative inline-flex items-center gap-2 rounded-xl p-2.5 md:px-3 text-slate-500 transition-all duration-200 group hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              aria-label={sidebarOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-10"></div>
              <Menu className="relative z-10 h-5 w-5" strokeWidth={1.8} />
              <span className="relative z-10 hidden md:inline text-sm font-semibold">Menu</span>
            </button>

            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 blur-md opacity-30"></div>
                  <div className="relative text-2xl md:text-3xl">👋</div>
                </div>
                <div className="min-w-0">
                  <h2 className="truncate bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-lg md:text-xl font-bold text-transparent dark:from-white dark:to-slate-300">
                    {greeting}, {user?.name ? user.name.split(' ')[0] : 'User'}!
                  </h2>
                  <p className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {user?.role ? user.role : 'User'} Dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                {pageTitle}
              </p>
            </div>
          </div>

          <nav className="hidden xl:flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 px-2 py-2 dark:border-slate-700/80 dark:bg-slate-800/70">
            {topbarMenu.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700/70'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <button className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-500 transition-all duration-200 group hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
              <Search className="h-4 w-4" strokeWidth={1.8} />
              <span className="text-sm">Search...</span>
              <kbd className="ml-2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-700">
                ⌘K
              </kbd>
            </button>

            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfile(false);
                }}
                className="relative rounded-xl p-2.5 text-slate-500 transition-all duration-200 group hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-10"></div>
                <Bell className="relative h-5 w-5" strokeWidth={1.7} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {notifications > 9 ? '9+' : notifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-20 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 md:w-96">
                  <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-4 dark:border-slate-700 dark:from-blue-900/20 dark:to-emerald-900/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 dark:text-white">Notifications</h3>
                      <button
                        onClick={() => setNotifications(0)}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="cursor-pointer border-b border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                          <span className="text-xl">📝</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">New assignment added</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mathematics homework for Class 10</p>
                          <p className="mt-1 text-[10px] text-slate-400">5 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="cursor-pointer border-b border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                          <span className="text-xl">🎓</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">Student performance report</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Monthly report is ready to review</p>
                          <p className="mt-1 text-[10px] text-slate-400">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="cursor-pointer p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                          <span className="text-xl">💰</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">Fee submission deadline</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">3 days left for fee submission</p>
                          <p className="mt-1 text-[10px] text-slate-400">Yesterday</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                    <button className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="relative overflow-hidden rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-all duration-200 group hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-10"></div>
              <div className="relative transition-transform duration-500 group-hover:rotate-12">
                {darkMode ? <Sun className="h-5 w-5" strokeWidth={1.8} /> : <Moon className="h-5 w-5" strokeWidth={1.8} />}
              </div>
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                }}
                className={`flex items-center gap-2 border border-transparent rounded-xl p-1.5 transition-all duration-300 hover:border-blue-500/30 md:gap-3 md:p-2 ${
                  showProfile
                    ? 'bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-blue-500 shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400 blur-md opacity-0 transition-opacity group-hover:opacity-50"></div>
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-sm font-bold text-white shadow-md md:h-10 md:w-10 md:text-base">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 animate-pulse dark:border-slate-800"></div>
                </div>

                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.role || 'Member'}</p>
                </div>

                <ChevronDown
                  className={`hidden h-4 w-4 text-slate-400 transition-transform duration-300 md:block ${showProfile ? 'rotate-180' : ''}`}
                  strokeWidth={1.8}
                />
              </button>

              {showProfile && (
                <div className="absolute right-0 z-20 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                  <div className="relative bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-blue-500/10 p-5 dark:from-blue-500/5 dark:via-emerald-500/5 dark:to-blue-500/5">
                    <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400/20 to-emerald-400/20 blur-2xl"></div>
                    <div className="relative flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-xl font-bold text-white shadow-lg">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-800"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{user?.name || 'User'}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{user?.email || 'user@example.com'}</p>
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {user?.role || 'Member'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button className="group w-full rounded-xl px-4 py-2.5 text-sm text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50">
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-blue-100 dark:bg-slate-700 dark:group-hover:bg-blue-900/30">
                          <User className="h-4 w-4 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" strokeWidth={1.8} />
                        </span>
                        <span className="flex-1 text-left">My Profile</span>
                        <span className="text-xs text-slate-400">⌘P</span>
                      </span>
                    </button>

                    <button className="group w-full rounded-xl px-4 py-2.5 text-sm text-slate-600 transition-all duration-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50">
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-blue-100 dark:bg-slate-700 dark:group-hover:bg-blue-900/30">
                          <Settings className="h-4 w-4 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" strokeWidth={1.8} />
                        </span>
                        <span className="flex-1 text-left">Settings</span>
                        <span className="text-xs text-slate-400">⌘,</span>
                      </span>
                    </button>

                    <div className="my-2 h-px bg-slate-200 dark:bg-slate-700"></div>

                    <button
                      onClick={handleLogout}
                      className="group w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 transition-colors group-hover:bg-red-100 dark:bg-red-900/20 dark:group-hover:bg-red-900/30">
                          <LogOut className="h-4 w-4" strokeWidth={1.8} />
                        </span>
                        <span className="flex-1 text-left">Sign Out</span>
                        <span className="text-xs text-red-400">⌘⇧Q</span>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 transition-all duration-500 ${scrolled ? 'opacity-100' : 'opacity-0'}`}></div>
    </header>
  );
}
