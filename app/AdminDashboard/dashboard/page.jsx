'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, GraduationCap, Users } from 'lucide-react';
import { showToast } from '../../utils/helpers';
import { hasPermission, readStoredAuth } from '../authservice/auth';
import studentService from '../../services/studentService';
import teacherService from '../../services/teacherService';
import classService from '../../services/classService';
import attendanceService from '../../services/attendanceService';

function normalizeTeacher(teacher = {}) {
  return {
    ...teacher,
    id: teacher.id,
    name: teacher.name || teacher.personalInfo?.name || 'Unknown Teacher',
  };
}

function normalizeClassStats(classItem = {}, students = [], attendanceRecords = []) {
  const classStudents = students.filter(
    (student) => student.class === classItem.name && student.section === classItem.section
  );
  const presentCount = attendanceRecords.filter(
    (record) =>
      record.class === classItem.name &&
      record.section === classItem.section &&
      record.status === 'Present'
  ).length;
  const absentCount = attendanceRecords.filter(
    (record) =>
      record.class === classItem.name &&
      record.section === classItem.section &&
      record.status === 'Absent'
  ).length;
  const totalMarked = presentCount + absentCount;

  return {
    ...classItem,
    studentCount: classStudents.length,
    presentCount,
    absentCount,
    attendanceRate: totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0,
  };
}

function createDashboardFallback(message, data) {
  return {
    success: false,
    message,
    data,
  };
}

async function withDashboardTimeout(promise, fallback, timeoutMs = 8000) {
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  }
}

const STAT_CARDS = [
  {
    label: 'Students',
    key: 'students',
    icon: GraduationCap,
    shellClass: 'border-blue-400 bg-blue-400 text-white',
    badgeClass: 'bg-white/85 text-blue-600',
    hint: 'Active enrolments',
  },
  {
    label: 'Teachers',
    key: 'teachers',
    icon: Users,
    shellClass: 'border-purple-400 bg-purple-400 text-white',
    badgeClass: 'bg-white/85 text-purple-600',
    hint: 'Faculty strength',
  },
  {
    label: 'Attendance',
    key: 'attendance',
    icon: Activity,
    shellClass: 'border-red-400 bg-red-400 text-white',
    badgeClass: 'bg-white/85 text-red-600',
    hint: 'Today performance',
  },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [forceResolved, setForceResolved] = useState(false);
  const [user, setUser] = useState(null);
  const [canViewDashboard, setCanViewDashboard] = useState(false);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, total: 0, rate: 0 });

  useEffect(() => {
    try {
      const auth = readStoredAuth();
      let storedUser = null;
      if (typeof window !== 'undefined') {
        try {
          storedUser = JSON.parse(sessionStorage.getItem('user') || 'null');
        } catch {
          storedUser = null;
        }
      }

      setUser(storedUser);
      setCanViewDashboard(hasPermission(auth?.permissions || [], 'DASHBOARD_VIEW'));
      setAuthReady(true);
    } catch (error) {
      console.error('Dashboard auth init error:', error);
      setAuthReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceResolved(true);
      setAuthReady(true);
      setLoading(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authReady || !canViewDashboard) return;

    const loadDashboardData = async () => {
      setLoading(true);

      try {
        const [studentsResult, teachersResult, classesResult] = await Promise.all([
          withDashboardTimeout(
            studentService.getAll(),
            createDashboardFallback('Students request timed out', [])
          ),
          withDashboardTimeout(
            teacherService.getAll(),
            createDashboardFallback('Teachers request timed out', [])
          ),
          withDashboardTimeout(
            classService.getAll(),
            createDashboardFallback('Classes request timed out', [])
          ),
        ]);

        const allStudents = studentsResult.success ? studentsResult.data : [];
        const allTeachers = teachersResult.success ? teachersResult.data.map(normalizeTeacher) : [];
        const allClasses = classesResult.success ? classesResult.data : [];

        const todayDate = new Date().toISOString().split('T')[0];
        const attendanceResult = await withDashboardTimeout(
          attendanceService.getAttendanceByDate(todayDate),
          createDashboardFallback('Attendance request timed out', {
            attendance: [],
            stats: { present: 0, absent: 0, total: 0 },
          })
        );
        const attendanceData = attendanceResult.success ? attendanceResult.data : { attendance: [], stats: { present: 0, absent: 0, total: 0 } };

        const normalizedClasses = allClasses.map((classItem) =>
          normalizeClassStats(classItem, allStudents, attendanceData.attendance || [])
        );

        const present = Number(attendanceData.stats?.present || 0);
        const absent = Number(attendanceData.stats?.absent || 0);
        const total = Number(attendanceData.stats?.total || 0);

        setStudents(allStudents);
        setTeachers(allTeachers);
        setClasses(normalizedClasses);
        setAttendanceStats({
          present,
          absent,
          total,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        });
        const failedSources = [
          studentsResult,
          teachersResult,
          classesResult,
          attendanceResult,
        ].filter((result) => !result?.success);

        if (failedSources.length > 0) {
          showToast('Some dashboard data could not be loaded. Showing available data.', 'error');
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    const handleDataUpdate = () => loadDashboardData();
    window.addEventListener('studentEnrolled', handleDataUpdate);
    window.addEventListener('studentUpdated', handleDataUpdate);
    window.addEventListener('teachersUpdated', handleDataUpdate);
    window.addEventListener('classesUpdated', handleDataUpdate);

    return () => {
      window.removeEventListener('studentEnrolled', handleDataUpdate);
      window.removeEventListener('studentUpdated', handleDataUpdate);
      window.removeEventListener('teachersUpdated', handleDataUpdate);
      window.removeEventListener('classesUpdated', handleDataUpdate);
    };
  }, [authReady, canViewDashboard]);

  const topClasses = useMemo(() => {
    return [...classes]
      .sort((left, right) => (right.studentCount || 0) - (left.studentCount || 0))
      .slice(0, 5);
  }, [classes]);

  const dashboardStats = useMemo(
    () => ({
      students: students.length,
      teachers: teachers.length,
      attendance: `${attendanceStats.rate}%`,
    }),
    [students.length, teachers.length, attendanceStats.rate]
  );

  if ((!authReady || loading) && !forceResolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard Access Required</h2>
          <p className="mt-3 text-sm text-slate-500">
            This dashboard is available only for roles with dashboard permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 pb-6 pt-0 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6 font-sans">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mb-6 flex flex-col gap-2">
              <p className="text-sm font-medium text-sky-600">Overview</p>
              <h2 className="text-2xl font-semibold text-slate-900">School performance at a glance</h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <HeroMetric
                label="Total classes"
                value={classes.length}
                detail="Running sections"
                gradientClass="border-pink-200 bg-pink-400"
                textClass="text-black"
                icon={BookOpen}
                iconBadgeClass="bg-white"
                iconClass="text-pink-400"
              />
              {STAT_CARDS.map((card) => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={dashboardStats[card.key]}
                  icon={card.icon}
                  shellClass={card.shellClass}
                  badgeClass={card.badgeClass}
                  hint={card.hint}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-emerald-600">Attendance Summary</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Today&apos;s attendance</h2>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                {attendanceStats.rate}% attendance
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoTile label="Present" value={attendanceStats.present} tone="emerald" />
              <InfoTile label="Absent" value={attendanceStats.absent} tone="rose" />
              <InfoTile label="Total" value={attendanceStats.total} tone="sky" />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-violet-600">Class Overview</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Top classes by strength</h2>
              </div>
              <span className="rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-bold text-black">
                {classes.length} classes
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {topClasses.map((classItem) => (
                <div
                  key={classItem.id || `${classItem.name}-${classItem.section}`}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 transition-colors duration-200 hover:bg-white"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <p className="font-semibold text-slate-900">
                          {classItem.name} - Section {classItem.section}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Attendance: {classItem.attendanceRate || 0}% today
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-left sm:text-right">
                      <p className="text-sm font-semibold text-slate-900">{classItem.studentCount || 0} students</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {classItem.presentCount || 0} present / {classItem.absentCount || 0} absent
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {topClasses.length === 0 && (
                <p className="rounded-[24px] border border-dashed border-violet-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                  No class data available yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  detail,
  gradientClass = 'border-pink-200 bg-pink-100',
  textClass = 'text-slate-900',
  icon: Icon,
  iconBadgeClass = 'bg-black/10',
  iconClass = 'text-black',
}) {
  return (
    <div className={`rounded-[20px] border px-4 py-4 shadow-sm ${gradientClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${textClass}`}>{label}</p>
          <p className={`mt-2 text-2xl font-bold ${textClass}`}>{value}</p>
          <p className={`mt-1 text-sm font-semibold ${textClass}`}>{detail}</p>
        </div>
        {Icon ? (
          <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass} ${iconBadgeClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, shellClass, badgeClass, hint }) {
  return (
    <div className={`group relative overflow-hidden rounded-[22px] border px-4 py-5 shadow-sm transition duration-200 hover:shadow-md ${shellClass}`}>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-black">{label}</p>
          <p className="mt-3 text-3xl font-bold text-black">{value}</p>
          <p className="mt-2 text-sm font-semibold text-black">{hint}</p>
        </div>
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${badgeClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value, tone = 'sky' }) {
  const styles = {
    emerald:
      'border-emerald-400 bg-emerald-400',
    rose:
      'border-rose-400 bg-rose-400',
    sky:
      'border-sky-400 bg-sky-400',
  };

  return (
    <div className={`rounded-[20px] border px-4 py-5 text-center ${styles[tone] || styles.sky}`}>
      <p className="text-sm font-semibold text-black">{label}</p>
      <p className="mt-2 text-3xl font-bold text-black">{value}</p>
    </div>
  );
}
