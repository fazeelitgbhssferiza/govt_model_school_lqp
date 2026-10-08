'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddNewTeacher from '../components/teachers/AddNewTeacher';
import { hasPermission } from '../authservice/auth';
import { useAuth } from '../authservice/useAuth';
import teacherService from '../../services/teacherService';
import { showToast } from '../../utils/helpers';

const TEACHERS_REFRESH_KEY = 'teachers_last_updated';

const CLASS_ORDER = [
  'Pre-Nursery',
  'ECCE',
  'Prep',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
];

const CLASS_RANK = new Map(
  CLASS_ORDER.flatMap((className, index) => [
    [className.toLowerCase(), index],
    [String(index - 2), index],
  ])
);

function getClassRank(teacher) {
  if (teacher.teacherType !== 'Class Incharge' || !teacher.classIncharge) {
    return Number.MAX_SAFE_INTEGER;
  }

  return CLASS_RANK.get(String(teacher.classIncharge).trim().toLowerCase())
    ?? Number.MAX_SAFE_INTEGER - 1;
}

function SummaryMetric({ label, value, accentClass, cardClass }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-lg backdrop-blur-sm transition-transform hover:-translate-y-0.5 ${cardClass}`}>
      <p className="text-base font-medium text-black">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}

export default function TeachersPage() {
  const { permissions } = useAuth();
  const canDeleteTeacher = hasPermission(permissions, 'TEACHERS_DELETE');
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  const loadTeachers = async () => {
    const result = await teacherService.getAll();
    if (result.success) {
      setTeachers(result.data || []);
      return;
    }

    console.error('Failed to load teachers:', result.message);
    setTeachers([]);
  };

  const handleDeleteTeacher = (teacher) => {
    if (!canDeleteTeacher) {
      showToast('You do not have permission to delete teachers.', 'error');
      return;
    }
    setTeacherToDelete(teacher);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!canDeleteTeacher) {
      showToast('You do not have permission to delete teachers.', 'error');
      return;
    }
    if (!teacherToDelete?.id || isDeletingTeacher) return;

    setIsDeletingTeacher(true);
    const result = await teacherService.remove(teacherToDelete.id);
    if (result.success) {
      showToast(`${teacherToDelete.name} deleted successfully`, 'success');
      setTeacherToDelete(null);
      loadTeachers();
      setIsDeletingTeacher(false);
      return;
    }

    showToast(result.message || 'Failed to delete teacher', 'error');
    setIsDeletingTeacher(false);
  };

  const handleCloseTeacherModal = () => {
    setShowAddTeacherModal(false);
    setSelectedTeacher(null);
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setShowAddTeacherModal(true);
  };

  useEffect(() => {
    if (showAddTeacherModal || teacherToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddTeacherModal, teacherToDelete]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadTeachers();
    }, 0);

    const handleTeachersUpdated = () => {
      loadTeachers();
    };

    const handleStorage = (event) => {
      if (event.key === TEACHERS_REFRESH_KEY) {
        loadTeachers();
      }
    };

    const handleWindowFocus = () => {
      loadTeachers();
    };

    window.addEventListener('teachersUpdated', handleTeachersUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('teachersUpdated', handleTeachersUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const summary = useMemo(() => {
    const maleTeachers = teachers.filter((teacher) => String(teacher.gender).toLowerCase() === 'male').length;
    const femaleTeachers = teachers.filter((teacher) => String(teacher.gender).toLowerCase() === 'female').length;
    const experiencedTeachers = teachers.filter((teacher) => teacher.experience >= 5).length;
    const activeSubjects = new Set(
      teachers
        .map((teacher) => teacher.subject)
        .filter((subject) => subject && subject !== 'Unassigned')
    ).size;

    return {
      totalTeachers: teachers.length,
      maleTeachers,
      femaleTeachers,
      experiencedTeachers,
      activeSubjects,
    };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const matchingTeachers = query ? teachers.filter((teacher) => {
      const haystack = [
        teacher.name,
        teacher.subject,
        teacher.gender,
        teacher.contactNumber,
        teacher.teacherType,
        teacher.classIncharge,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    }) : teachers;

    return [...matchingTeachers].sort((firstTeacher, secondTeacher) => (
      getClassRank(firstTeacher) - getClassRank(secondTeacher)
    ));
  }, [searchTerm, teachers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="backdrop-blur-xl bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-5 sm:px-8 sm:py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-white">Teacher Management</h1>                  
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="flex items-center gap-2 text-blue-100">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-base">Admin Access Only</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacher(null);
                    setShowAddTeacherModal(true);
                  }}
                  className="w-full rounded-xl bg-white px-5 py-2.5 text-base font-medium text-blue-700 shadow-lg transition-all hover:bg-blue-50 md:w-auto"
                >
                  Add New Teachers
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>              
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Teacher overview</h2>
            </div>            
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryMetric
              label="Total Teachers"
              value={summary.totalTeachers}
              accentClass="text-blue-800"
              cardClass="border-blue-200/80 bg-gradient-to-br from-blue-300 via-cyan-400 to-emerald-400"
            />
            <SummaryMetric
              label="Male Teachers"
              value={summary.maleTeachers}
              accentClass="text-sky-800"
              cardClass="border-sky-200/80 bg-gradient-to-br from-sky-400 via-blue-300 to-indigo-400"
            />
            <SummaryMetric
              label="Female Teachers"
              value={summary.femaleTeachers}
              accentClass="text-rose-800"
              cardClass="border-rose-200/80 bg-gradient-to-br from-rose-400 via-pink-300 to-fuchsia-100"
            />
            <SummaryMetric
              label="5+ Years Exp."
              value={summary.experiencedTeachers}
              accentClass="text-emerald-800"
              cardClass="border-emerald-200/80 bg-gradient-to-br from-emerald-400 via-lime-300 to-green-400"
            />
            <SummaryMetric
              label="Active Subjects"
              value={summary.activeSubjects}
              accentClass="text-amber-800"
              cardClass="border-amber-200/80 bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-400"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-base font-medium text-blue-600">Directory</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">Teachers table</h2>
            </div>

            <div className="w-full max-w-md">
              <label htmlFor="teacher-search" className="sr-only">
                Search teachers
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="teacher-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search teachers..."
                  className="w-full rounded-2xl border border-blue-100 bg-white/90 py-3 pl-12 pr-4 text-base text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-blue-100/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] table-fixed divide-y divide-blue-100/80">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="w-[19%] px-3 py-3 text-left text-sm font-semibold text-white">Teacher</th>
                    <th className="w-[12%] px-3 py-3 text-left text-sm font-semibold text-white">Subject</th>
                    <th className="w-[15%] px-3 py-3 text-left text-sm font-semibold text-white">Contact</th>
                    <th className="w-[21%] px-3 py-3 text-left text-sm font-semibold text-white">Role</th>
                    <th className="w-[11%] px-3 py-3 text-left text-sm font-semibold text-white">Experience</th>
                    <th className="w-[14%] px-3 py-3 text-left text-sm font-semibold text-white">Appointment</th>
                    <th className="w-[8%] px-2 py-3 text-center text-sm font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/90">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((teacher) => (
                      <tr key={teacher.id} className="transition-colors hover:bg-blue-50/40">
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-base font-medium text-slate-900">{teacher.name}</p>
                            <p className="mt-1 text-sm font-mono text-slate-500">{teacher.teacherId || 'TECH-001'}</p>
                            <p className="mt-1 text-sm text-slate-600">{teacher.gender}</p>
                          </div>
                        </td>
                        <td className="break-words px-3 py-3 text-sm text-slate-700">{teacher.subject}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{teacher.contactNumber}</td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700">
                              {teacher.teacherType}
                            </span>
                            <p className="text-sm text-slate-600">
                              {teacher.classIncharge
                                ? `Incharge: ${teacher.classIncharge}`
                                : `Assigned periods: ${teacher.periodsCount}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-slate-800">
                          {teacher.experienceLabel === 'Above 20' || teacher.experienceLabel === 'Above 30'
                            ? teacher.experienceLabel
                            : `${teacher.experience} yrs`}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {teacher.appointmentDate || 'Not set'}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                              title={`Edit ${teacher.name}`}
                              aria-label={`Edit ${teacher.name}`}
                              onClick={() => handleEditTeacher(teacher)}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                              title={`Delete ${teacher.name}`}
                              aria-label={`Delete ${teacher.name}`}
                              onClick={() => handleDeleteTeacher(teacher)}
                              disabled={!canDeleteTeacher}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <p className="text-base font-medium text-slate-700">No teachers found.</p>
                        <p className="mt-1 text-base text-slate-500">
                          {searchTerm.trim()
                            ? 'Try a different search term.'
                            : 'Add a teacher to populate the table.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {showAddTeacherModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectedTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h2>
                <button
                  onClick={handleCloseTeacherModal}
                  className="text-slate-500 hover:text-slate-700 text-2xl leading-none flex-shrink-0 ml-4"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <AddNewTeacher
                  hideHeader={true}
                  mode={selectedTeacher ? 'edit' : 'create'}
                  teacherId={selectedTeacher?.id || null}
                  initialData={selectedTeacher}
                  onSuccess={() => {
                    handleCloseTeacherModal();
                    loadTeachers();
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {teacherToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
              <div className="rounded-2xl bg-rose-50 p-4 text-center">
                <h2 className="text-xl font-semibold text-rose-700">Delete Teacher</h2>
                <p className="mt-2 text-base text-slate-700">
                  Are you sure want to delete {teacherToDelete.name} ?
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTeacherToDelete(null)}
                  disabled={isDeletingTeacher}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTeacher}
                  disabled={isDeletingTeacher}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeletingTeacher ? 'Deleting...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
