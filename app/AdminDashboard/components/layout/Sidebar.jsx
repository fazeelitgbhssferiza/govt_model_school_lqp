'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Landmark,
  UserCog,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../authservice/useAuth';
import { clearAuthSessionCookies, hasAnyPermission } from '../../authservice/auth';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissions, logout } = useAuth();
  const isCollapsed = !isOpen;

  const navigation = [
    {
      name: 'Dashboard',
      href: '/AdminDashboard/dashboard',
      Icon: LayoutDashboard,
      requiredPermissions: ['DASHBOARD_VIEW'],
    },
    {
      name: 'Classes',
      href: '/AdminDashboard/classes',
      Icon: BookOpen,
      requiredPermissions: ['CLASSES_VIEW'],
    },
    {
      name: 'Students',
      href: '/AdminDashboard/students',
      Icon: Users,
      requiredPermissions: ['STUDENTS_VIEW'],
    },
    {
      name: 'Teachers',
      href: '/AdminDashboard/teachers',
      Icon: GraduationCap,
      requiredPermissions: ['TEACHERS_VIEW'],
    },
    {
      name: 'Results',
      href: '/AdminDashboard/results',
      Icon: BarChart3,
      requiredPermissions: ['RESULTS_VIEW'],
    },
    {
      name: 'Attendance',
      href: '/AdminDashboard/attendance',
      Icon: CalendarCheck,
      requiredPermissions: ['ATTENDANCE_VIEW'],
    },
    {
      name: 'Time Table',
      href: '/AdminDashboard/timetable',
      Icon: CalendarDays,
      requiredPermissions: ['TIMETABLE_VIEW'],
    },
    {
      name: 'Monthly Expenses',
      href: '/AdminDashboard/monthly-expenses',
      Icon: Receipt,
      requiredPermissions: ['MONTHLY_EXPENSES_VIEW'],
    },
    {
      name: 'Financial Administration',
      href: '/AdminDashboard/admin',
      Icon: Landmark,
      requiredPermissions: ['FINANCIAL_ADMINISTRATION_VIEW'],
    },
    {
      name: 'Users',
      href: '/AdminDashboard/users',
      Icon: UserCog,
      requiredPermissions: ['USERS_VIEW'],
    },
    {
      name: 'Roles',
      href: '/AdminDashboard/roles',
      Icon: ShieldCheck,
      requiredPermissions: ['ROLES_VIEW'],
    },
  ];

  const filteredNav = navigation.filter((item) =>
    hasAnyPermission(permissions, item.requiredPermissions)
  );

  const handleLogout = () => {
    clearAuthSessionCookies();
    logout?.();
    setIsOpen(false);
    router.replace('/auth/login');
  };

  return (
    <>
      <aside 
        className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-all duration-300 ease-in-out z-40 w-[min(18rem,calc(100vw-1rem))] ${
          isCollapsed ? 'lg:w-14' : 'lg:w-64'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col`}
      >
        {/* Logo Section with Gradient */}
        <div className={`relative flex items-center justify-between h-20 border-b border-white/10 ${isCollapsed ? 'px-2' : 'px-6'}`}>
          {/* Background Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10"></div>
          
          {!isCollapsed && (
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-xl blur-md opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth="1.5"/>
                    <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth="1.5"/>
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>
              <div className="mt-8 mb-8">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Govt. Model Secondary School LQP
                </h1>               
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <div className="relative w-full flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-xl blur-md opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-2.5 pb-4 custom-scrollbar lg:px-3">
          {!isCollapsed && (
            <div className="px-3 pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Main Navigation
              </p>
            </div>
          )}
          
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex items-center transition-all duration-200 rounded-xl ${
                  isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
                } ${
                  isActive 
                    ? 'bg-blue-500 text-white border-l-2 border-blue-300 shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                {/* Active Indicator Bar */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 w-1 h-8 bg-white rounded-full"></div>
                )}

                {/* Icon Container */}
                <div className={`relative ${isCollapsed ? '' : 'mr-3'}`}>
                  <div className={`absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-lg blur-md transition-opacity duration-200 ${
                    isActive ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'
                  }`}></div>
                  <item.Icon
                    className={`relative w-5 h-5 transition-all duration-200 ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-white'
                    }`}
                    strokeWidth={1.6}
                  />
                </div>
                
                {!isCollapsed && (
                  <span className={`pr-2 text-sm font-medium transition-colors duration-200 sm:text-base ${
                    isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {item.name}
                  </span>
                )}
                
                {/* Hover Tooltip for Collapsed Mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-lg">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}

        </nav>

        {/* User Profile Section */}
        <div className="relative mt-auto border-t border-white/10 p-4">
          {/* Decorative Gradient Line */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
          
          {!isCollapsed ? (
            <div className="relative flex items-center gap-3">
              {/* Avatar with Status */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full blur-sm opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-base font-bold">AD</span>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
                
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate">Admin User</p>
                <p className="text-sm text-slate-400 truncate">admin@edumanager.com</p>
              </div>
                
              <button
                type="button"
                onClick={handleLogout}
                className="p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                aria-label="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full blur-sm opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AD</span>
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
              </div>
                
              <button
                type="button"
                onClick={handleLogout}
                className="p-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                aria-label="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Decorative Element */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500"></div>
      </aside>

      {/* Mobile Overlay with Blur */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fadeIn" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}
