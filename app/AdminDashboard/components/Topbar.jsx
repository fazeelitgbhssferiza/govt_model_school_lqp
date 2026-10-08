"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Menu,
  Receipt,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

const titleIconMap = {
  Dashboard: LayoutDashboard,
  Classes: BookOpen,
  Students: Users,
  Teachers: GraduationCap,
  Results: BarChart3,
  Fees: Wallet,
  Attendance: CalendarCheck,
  "Time Table": CalendarDays,
  "Monthly Expenses": Receipt,
  "Financial Administration": Landmark,
  Users: UserCog,
  Roles: ShieldCheck,
};

const routeTitleMap = {
  dashboard: "Dashboard",
  classes: "Classes",
  students: "Students",
  teachers: "Teachers",
  results: "Results",
  fee: "Fees",
  attendance: "Attendance",
  timetable: "Time Table",
  "monthly-expenses": "Monthly Expenses",
  admin: "Financial Administration",
  users: "Users",
  roles: "Roles",
};

export default function Topbar({ onToggleSidebar, isSidebarOpen }) {
  const pathname = usePathname();
  const slug = pathname?.split("/").filter(Boolean)[1] || "dashboard";
  const title = routeTitleMap[slug] || "Dashboard";
  const TitleIcon = titleIconMap[title] || BarChart3;

  return (
    <header className={`fixed top-0 right-0 left-0 z-30 border-b border-slate-200/70 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 shadow-[0_8px_20px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'lg:left-64' : 'lg:left-14'}`}>
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-blue-700 bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 dark:border-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 sm:h-10 sm:w-10"
            aria-label="Toggle sidebar menu"
          >
          <Menu className="h-4 w-4" strokeWidth={2} />
          </button>
          <TitleIcon className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-400" strokeWidth={2} />
          <h1 className="truncate text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg md:text-xl">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
}
