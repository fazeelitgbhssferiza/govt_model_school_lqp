'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../authservice/useAuth';
import { apiRequest } from '../authservice/api';
import classService from '../../services/classService';
import studentService from '../../services/studentService';
import teacherService from '../../services/teacherService';
import attendanceService from '../../services/attendanceService';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { showToast } from '../../utils/helpers';
import FingerprintScanner from './components/FingerprintScanner';
import FaceRecognition from './components/FaceRecognition';
import AttendanceReport from './components/AttendanceReport';
import WhatsAppNotifier from './components/WhatsAppNotifier';

function normalizeStudent(student = {}) {
  return {
    ...student,
    id: student.id,
    name: student.name || student.fullName || 'Unknown Student',
    class: student.class || student.enrollmentClass || '',
    section: student.section || student.enrollmentSection || '',
    regNo:
      student.regNo ||
      student.registrationNumber ||
      student.registrationNo ||
      student.studentId ||
      '',
    parentPhone:
      student.parentPhone ||
      student.fatherPhone ||
      student.parentInfo?.fatherPhone ||
      student.parentWhatsApp ||
      '',
  };
}

function isMongoObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

function getAttendanceClassName(className) {
  const normalizedClass = String(className || '').trim();
  return /^(?:nursery|nursary)$/i.test(normalizedClass) ? 'ECCE' : normalizedClass;
}

function buildTeacherDisplayId(teacher = {}) {
  const explicitIdCandidates = [teacher.teacherId, teacher.employeeId]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const explicitReadableId = explicitIdCandidates.find((value) => !isMongoObjectId(value));
  if (explicitReadableId) {
    return explicitReadableId.toUpperCase();
  }

  const numericSeed = [
    teacher.contactNumber,
    teacher.personalInfo?.contactNumber,
    teacher.cnic,
    teacher.personalInfo?.cnic,
  ]
    .map((value) => String(value || '').replace(/\D/g, ''))
    .find(Boolean);

  if (numericSeed) {
    return `TECH-${numericSeed.slice(-3).padStart(3, '0')}`;
  }

  const stableSeed = String(teacher.id || teacher._id || teacher.name || '000000')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  const trailingDigits = stableSeed.replace(/\D/g, '');
  return `TECH-${trailingDigits.slice(-3).padStart(3, '0') || '001'}`;
}

function normalizeTeacher(teacher = {}) {
  return {
    ...teacher,
    id: teacher.id || teacher._id || teacher.personalInfo?.cnic || teacher.personalInfo?.contactNumber || teacher.name,
    name:
      teacher.name ||
      teacher.personalInfo?.name ||
      teacher.fullName ||
      'Unknown Teacher',
    teacherId:
      buildTeacherDisplayId(teacher),
  };
}

function extractTeachersPayload(result) {
  if (Array.isArray(result?.teachers)) return result.teachers;
  if (Array.isArray(result?.data?.teachers)) return result.data.teachers;
  if (Array.isArray(result?.data)) return result.data;
  if (result?.teacher && typeof result.teacher === 'object') return [result.teacher];
  if (result?.data?.teacher && typeof result.data.teacher === 'object') return [result.data.teacher];
  return [];
}

function normalizeDateKey(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return rawDate.toISOString().split('T')[0];
}

function formatDisplayDate(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return String(value || '');
  }

  const day = String(rawDate.getDate()).padStart(2, '0');
  const month = String(rawDate.getMonth() + 1).padStart(2, '0');
  const year = rawDate.getFullYear();
  return `${day}/${month}/${year}`;
}

function createClassSectionKey(className, section) {
  return `${getAttendanceClassName(className)}::${String(section || '').trim()}`;
}

function formatClassSectionLabel(className, section) {
  const normalizedClass = getAttendanceClassName(className);
  const normalizedSection = String(section || '').trim();

  if (!normalizedSection) {
    return normalizedClass;
  }

  return `${normalizedClass} - ${normalizedSection}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mergeAttendanceRecord(records, nextRecord) {
  const nextId = String(nextRecord.id);
  const nextDate = normalizeDateKey(nextRecord.date);
  const recordIndex = records.findIndex(
    (record) => String(record.id) === nextId && normalizeDateKey(record.date) === nextDate
  );

  if (recordIndex === -1) {
    return [...records, nextRecord];
  }

  const updatedRecords = [...records];
  updatedRecords[recordIndex] = { ...updatedRecords[recordIndex], ...nextRecord };
  return updatedRecords;
}

function createLocalAttendanceRecord(payload, person) {
  return {
    id: person?.id ?? payload.personId,
    personId: String(payload.personId),
    name: person?.name || payload.personName,
    regNo: payload.registrationId,
    registrationId: payload.registrationId,
    class: payload.className || '',
    className: payload.className || '',
    section: payload.section || '',
    status: payload.status,
    checkIn: payload.time || null,
    date: payload.date,
    personType: payload.personType,
  };
}

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const [attendanceType, setAttendanceType] = useState('students');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedDate, setSelectedDate] = useState(normalizeDateKey(new Date()));
  const [attendance, setAttendance] = useState({ students: [], teachers: [] });
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [printAttendanceType, setPrintAttendanceType] = useState('students');
  const [printClass, setPrintClass] = useState('All');
  const [printDate, setPrintDate] = useState(normalizeDateKey(new Date()));

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        selectedClass === 'All'
          ? true
          : createClassSectionKey(student.class, student.section) === selectedClass
      ),
    [selectedClass, students]
  );

  const classOptions = useMemo(() => {
    const optionMap = new Map();

    classes.forEach((classItem) => {
      const key = createClassSectionKey(classItem.name, classItem.section);
      const label = formatClassSectionLabel(classItem.name, classItem.section);

      if (String(classItem.name || '').trim()) {
        optionMap.set(key, { value: key, label });
      }
    });

    return [{ value: 'All', label: 'All Classes' }, ...optionMap.values()];
  }, [classes]);

  const displayList = attendanceType === 'students'
    ? [...filteredStudents].sort((left, right) => {
        const getClassOrder = (className) => {
          const normalizedClass = getAttendanceClassName(className).toLowerCase();
          if (normalizedClass === 'ecce') return 0;
          const classNumber = normalizedClass.match(/\d+/);
          return classNumber ? Number(classNumber[0]) : Number.MAX_SAFE_INTEGER;
        };
        const orderDifference = getClassOrder(left.class) - getClassOrder(right.class);
        return orderDifference || getAttendanceClassName(left.class).localeCompare(getAttendanceClassName(right.class), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      })
    : teachers;

  const printableStudents = useMemo(
    () =>
      students.filter((student) =>
        printClass === 'All'
          ? true
          : createClassSectionKey(student.class, student.section) === printClass
      ),
    [printClass, students]
  );

  useEffect(() => {
    const loadData = async () => {
      const [studentsResult, teachersApiResult, classesResult] = await Promise.all([
        studentService.getAll(),
        apiRequest('/teachers').catch(() => null),
        classService.getAll(),
      ]);

      let teacherList = [];
      if (teachersApiResult) {
        teacherList = extractTeachersPayload(teachersApiResult);
      } else {
        const teachersFallback = await teacherService.getAll();
        teacherList = teachersFallback.success && Array.isArray(teachersFallback.data) ? teachersFallback.data : [];
      }

      setStudents(
        studentsResult.success ? studentsResult.data.map(normalizeStudent).filter((item) => item.id != null) : []
      );
      setTeachers(
        teacherList.map(normalizeTeacher).filter((item) => item.id != null)
      );
      setClasses(
        classesResult.success
          ? classesResult.data.filter((classItem) => String(classItem?.name || '').trim())
          : []
      );
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      setLoadingAttendance(true);
      const result = await attendanceService.getAttendanceSnapshot(selectedDate);
      if (result.success) {
        setAttendance({
          students: result.data.students,
          teachers: result.data.teachers,
        });
      } else {
        setAttendance({ students: [], teachers: [] });
      }
      setLoadingAttendance(false);
    };

    loadAttendance();
  }, [selectedDate]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online! Syncing offline attendance records...', 'success');
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedQueue = localStorage.getItem('attendanceOfflineQueue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch {
        setOfflineQueue([]);
      }
    }
  }, []);

  useEffect(() => {
    const syncOfflineData = async () => {
      if (!isOnline || offlineQueue.length === 0) return;

      for (const record of offlineQueue) {
        const result = await attendanceService.createAttendance(record);
        if (result.success) {
          const bucket = result.data.personType === 'student' ? 'students' : 'teachers';
          setAttendance((prev) => ({
            ...prev,
            [bucket]: mergeAttendanceRecord(prev[bucket], result.data),
          }));
        }
      }

      setOfflineQueue([]);
      localStorage.removeItem('attendanceOfflineQueue');
      showToast('All offline attendance records synced!', 'success');
    };

    syncOfflineData();
  }, [isOnline, offlineQueue]);

  const markAttendance = async (id, type, status, isSync = false, queuedPayload = null) => {
    if (!isAdmin && !isSync) {
      showToast('Only admin can mark attendance', 'error');
      return false;
    }

    const personType = type === 'students' ? 'student' : type === 'teachers' ? 'teacher' : type;
    const person = personType === 'student'
      ? students.find((student) => String(student.id) === String(id))
      : teachers.find((teacher) => String(teacher.id) === String(id));

    if (!queuedPayload && !person) {
      showToast('Unable to find selected person', 'error');
      return false;
    }

    const payload = queuedPayload || {
      personName: person?.name || '',
      personType,
      personId: String(id),
      registrationId: personType === 'student' ? (person?.regNo || '') : buildTeacherDisplayId(person),
      className: personType === 'student' ? (person?.class || '') : '',
      section: personType === 'student' ? (person?.section || '') : '',
      status,
      time: status === 'Present' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      date: normalizeDateKey(queuedPayload?.date || selectedDate),
    };

    try {
      const result = await attendanceService.createAttendance(payload);
      if (!result.success) {
        throw new Error(result.message || 'Failed to save attendance');
      }

      const bucket = personType === 'student' ? 'students' : 'teachers';
      setAttendance((prev) => ({
        ...prev,
        [bucket]: mergeAttendanceRecord(prev[bucket], result.data),
      }));

      if (personType === 'student' && status === 'Present' && person?.parentPhone && !isSync) {
        sendWhatsAppNotification(person, 'present');
      }

      return true;
    } catch (error) {
      const isNetworkFailure = !isOnline || /network|timeout|fetch/i.test(String(error.message || ''));
      if (!isSync && isNetworkFailure) {
        const newQueue = [...offlineQueue, payload];
        setOfflineQueue(newQueue);
        localStorage.setItem('attendanceOfflineQueue', JSON.stringify(newQueue));

        const bucket = personType === 'student' ? 'students' : 'teachers';
        setAttendance((prev) => ({
          ...prev,
          [bucket]: mergeAttendanceRecord(prev[bucket], createLocalAttendanceRecord(payload, person)),
        }));

        showToast('Saved offline. Will sync when connected.', 'warning');
      }
      return false;
    }
  };

  const sendWhatsAppNotification = async (student, status) => {
    if (!student.parentPhone || typeof window === 'undefined') return;

    const message = `School Alert: ${student.name} marked ${status} on ${selectedDate}.`;
    const notificationQueue = JSON.parse(localStorage.getItem('whatsappQueue') || '[]');
    notificationQueue.push({ phone: student.parentPhone, message, timestamp: new Date().toISOString() });
    localStorage.setItem('whatsappQueue', JSON.stringify(notificationQueue));

    try {
      console.log(`WhatsApp sent: ${message}`);
      showToast(`Notification queued for ${student.name}`, 'success');
    } catch {
      showToast('Failed to send notification', 'error');
    }
  };

  const handleBiometricMatch = (userId, type, closeScanner) => {
    markAttendance(userId, type, 'Present');
    closeScanner();
  };

  const stats = useMemo(() => {
    const relevantRecords = displayList.map((person) => {
      const record = attendance[attendanceType].find(
        (entry) => String(entry.id) === String(person.id) && normalizeDateKey(entry.date) === normalizeDateKey(selectedDate)
      );
      return record || { status: 'Unmarked' };
    });

    const presentCount = relevantRecords.filter((record) => record.status === 'Present').length;
    const absentCount = relevantRecords.filter((record) => record.status === 'Absent').length;
    const totalCount = displayList.length;
    const markedCount = presentCount + absentCount;

    return {
      presentCount,
      absentCount,
      totalCount,
      unmarkedCount: totalCount - markedCount,
      percentage: markedCount > 0 ? Math.round((presentCount / markedCount) * 100) : 0,
    };
  }, [attendance, attendanceType, displayList, selectedDate]);

  const openPrintModal = () => {
    setPrintAttendanceType(attendanceType);
    setPrintClass(selectedClass);
    setPrintDate(selectedDate);
    setShowPrintModal(true);
  };

  const handlePrintAttendanceReport = async () => {
    const normalizedPrintDate = normalizeDateKey(printDate);
    const reportDateLabel = formatDisplayDate(normalizedPrintDate);
    const classLabel =
      classOptions.find((option) => option.value === printClass)?.label || 'All Classes';
    const snapshotResult = await attendanceService.getAttendanceSnapshot(normalizedPrintDate);
    const printAttendance =
      snapshotResult.success
        ? {
            students: snapshotResult.data.students,
            teachers: snapshotResult.data.teachers,
          }
        : attendance;

    const rows =
      printAttendanceType === 'students'
        ? printableStudents.map((student) => {
            const record = printAttendance.students.find(
              (entry) =>
                String(entry.id) === String(student.id)
                && normalizeDateKey(entry.date) === normalizedPrintDate
            );

            return {
              name: student.name || 'Unknown Student',
              identity: student.regNo || record?.regNo || record?.registrationId || 'N/A',
              secondary: formatClassSectionLabel(student.class, student.section) || '-',
              status: record?.status || 'Not Marked',
              time: record?.checkIn || '--:--',
            };
          })
        : teachers.map((teacher) => {
            const record = printAttendance.teachers.find(
              (entry) =>
                String(entry.id) === String(teacher.id)
                && normalizeDateKey(entry.date) === normalizedPrintDate
            );

            return {
              name: teacher.name || 'Unknown Teacher',
              identity: buildTeacherDisplayId(teacher) || record?.registrationId || 'N/A',
              secondary: 'Teacher',
              status: record?.status || 'Not Marked',
              time: record?.checkIn || '--:--',
            };
          });

    if (rows.length === 0) {
      showToast('No attendance data available for the selected print filters', 'warning');
      return;
    }

    const reportTitle =
      printAttendanceType === 'students' ? 'Students Attendance Print Report' : 'Teachers Attendance Print Report';
    const subtitle =
      printAttendanceType === 'students'
        ? `${classLabel} | ${reportDateLabel}`
        : `Teachers | ${reportDateLabel}`;
    const thirdColumnLabel = printAttendanceType === 'students' ? 'Class' : 'Category';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to print', 'error');
      return;
    }

    const rowMarkup = rows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.identity)}</td>
          <td>${escapeHtml(row.secondary)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.time)}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(reportTitle)}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 portrait; margin: 0.5in; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; background: #fff; }
          .container { max-width: 900px; margin: 0 auto; }
          .school-name { text-align: center; font-size: 28px; font-weight: 800; margin-bottom: 8px; }
          .title { text-align: center; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
          .meta { text-align: center; font-size: 14px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 10px 12px; font-size: 13px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="school-name">Al-Flah Public School Feroza</div>
          <div class="title">${escapeHtml(reportTitle)}</div>
          <div class="meta">${escapeHtml(subtitle)}</div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>${printAttendanceType === 'students' ? 'Reg No' : 'Teacher ID'}</th>
                <th>${thirdColumnLabel}</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${rowMarkup}
            </tbody>
          </table>
        </div>
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    setShowPrintModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-0 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
              <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Daily Attendance</h1>              
            </div>
          </div>

          <div className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 md:w-auto">
            <span className="relative flex h-3 w-3">
              {isOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-sm font-medium text-slate-600">
              {loadingAttendance ? 'Loading records...' : isOnline ? 'System Online' : 'Offline Mode'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => setShowReport(true)}
            className="group relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-16 -translate-y-16 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-110"></div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-400">Analytics</p>
                <h3 className="text-xl font-bold text-white">View Reports</h3>                
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-white">RP</div>
            </div>
          </button>

          <button
            onClick={openPrintModal}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-amber-500 hover:shadow-md"
          >
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-16 -translate-y-16 rounded-full bg-amber-50 transition-transform duration-500 group-hover:scale-110"></div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-amber-600">Print Output</p>
                <h3 className="text-xl font-bold text-slate-900">Attendance Print Report</h3>                
              </div>
              <div className="rounded-xl bg-amber-50 p-3 text-amber-600">PR</div>
            </div>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/50 p-6">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="flex w-full rounded-lg bg-slate-200/50 p-1 sm:w-auto">
                <button
                  onClick={() => setAttendanceType('students')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-6 ${
                    attendanceType === 'students' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Students
                </button>
                <button
                  onClick={() => setAttendanceType('teachers')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-6 ${
                    attendanceType === 'teachers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Teachers
                </button>
              </div>

              <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto">
                {attendanceType === 'students' && (
                  <div className="w-full sm:w-48">
                    <Select
                      value={selectedClass}
                      onChange={(event) => setSelectedClass(event.target.value)}
                      options={classOptions}
                      className="bg-white"
                    />
                  </div>
                )}
                <div className="flex w-full gap-2 sm:w-48">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formatDisplayDate(selectedDate)}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                    />
                  </div>
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                    <div className="pointer-events-none flex h-full w-full items-center justify-center text-slate-600">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6">
              <p className="text-sm font-medium text-slate-500">Total Headcount</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalCount}</p>
            </div>
            <div className="bg-white p-6">
              <p className="text-sm font-medium text-emerald-600">Present</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-emerald-600">{stats.presentCount}</p>
                <p className="text-sm text-slate-500">{attendanceType}</p>
              </div>
            </div>
            <div className="bg-white p-6">
              <p className="text-sm font-medium text-red-600">Absent</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-red-600">{stats.absentCount}</p>
                <p className="text-sm text-slate-500">{attendanceType}</p>
              </div>
            </div>
            <div className="bg-white p-6">
              <p className="text-sm font-medium text-blue-600">Turnout</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
              </div>
            </div>
          </div>

          <div className="max-h-[600px] overflow-x-auto">
            <table className="min-w-[760px] w-full border-collapse text-left">
              <thead className={`${attendanceType === 'students' ? 'hidden' : 'sticky'} top-0 z-10 bg-blue-600 shadow-sm`}>
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Person Info</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">
                    {attendanceType === 'students' ? 'ID / Reg' : 'Teacher ID'}
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Time</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayList.map((person, personIndex) => {
                  const attRecord = attendance[attendanceType].find(
                    (record) => String(record.id) === String(person.id) && normalizeDateKey(record.date) === normalizeDateKey(selectedDate)
                  );
                  const personName = person.name || 'Unknown';
                  const displayRegistration = attendanceType === 'students'
                    ? (
                        person.regNo ||
                        attRecord?.regNo ||
                        attRecord?.registrationId ||
                        'N/A'
                      )
                    : (
                        buildTeacherDisplayId(person) ||
                        attRecord?.registrationId ||
                        'N/A'
                      );
                  const startsClassGroup = attendanceType === 'students' && (
                    personIndex === 0 ||
                    getAttendanceClassName(displayList[personIndex - 1]?.class) !== getAttendanceClassName(person.class)
                  );

                  return (
                    <Fragment key={person.id}>
                    {startsClassGroup && (
                      <>
                        <tr className="border-t-4 border-slate-200 bg-slate-100">
                          <th colSpan={5} className="px-6 py-3 text-left text-xl font-bold text-slate-900">
                            Class: {getAttendanceClassName(person.class) || 'Unassigned'}
                          </th>
                        </tr>
                        <tr className="bg-blue-600 shadow-sm">
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Person Info</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">ID / Reg</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white">Time</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white">Actions</th>
                        </tr>
                      </>
                    )}
                    <tr className="group transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-100 font-bold text-blue-700">
                            {personName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{personName}</p>
                            {attendanceType === 'students' && (
                              <p className="text-xs text-black">
                                Class: {getAttendanceClassName(person.class)}{person.section ? ` - ${person.section}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-mono text-black">{displayRegistration}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {attRecord?.status === 'Present' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Present
                          </span>
                        ) : attRecord?.status === 'Absent' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-black">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Unmarked
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {attRecord?.checkIn || '--:--'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => markAttendance(person.id, attendanceType === 'students' ? 'student' : 'teacher', 'Present')}
                              className="rounded-lg border border-transparent p-1.5 text-emerald-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50"
                              title="Mark Present"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button
                              onClick={() => markAttendance(person.id, attendanceType === 'students' ? 'student' : 'teacher', 'Absent')}
                              className="rounded-lg border border-transparent p-1.5 text-red-600 transition-colors hover:border-red-200 hover:bg-red-50"
                              title="Mark Absent"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {displayList.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                No personnel found for the selected criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)} title="Hardware Scanner Active" size="md">
        <FingerprintScanner
          onMatch={(userId) => handleBiometricMatch(userId, attendanceType === 'students' ? 'student' : 'teacher', () => setShowScanner(false))}
          type={attendanceType === 'students' ? 'student' : 'teacher'}
          users={displayList}
        />
      </Modal>

      <Modal isOpen={showFaceScanner} onClose={() => setShowFaceScanner(false)} title="Camera Active" size="lg">
        <FaceRecognition
          onMatch={(userId) => handleBiometricMatch(userId, attendanceType === 'students' ? 'student' : 'teacher', () => setShowFaceScanner(false))}
          type={attendanceType === 'students' ? 'student' : 'teacher'}
          users={displayList}
        />
      </Modal>

      <Modal isOpen={showReport} onClose={() => setShowReport(false)} title="Analytics & Reports" size="xl">
        <AttendanceReport
          attendance={attendance}
          students={students}
          teachers={teachers}
          selectedDate={selectedDate}
        />
      </Modal>

      <Modal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} title="Attendance Print Report" size="md">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Attendance Type</label>
            <select
              value={printAttendanceType}
              onChange={(event) => setPrintAttendanceType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
            </select>
          </div>

          {printAttendanceType === 'students' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Select Class</label>
              <select
                value={printClass}
                onChange={(event) => setPrintClass(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Date</label>
            <input
              type="date"
              value={printDate}
              onChange={(event) => setPrintDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {printAttendanceType === 'students'
              ? `Students | ${classOptions.find((option) => option.value === printClass)?.label || 'All Classes'} | ${formatDisplayDate(printDate)}`
              : `Teachers | ${formatDisplayDate(printDate)}`}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowPrintModal(false)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrintAttendanceReport}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto"
            >
              Generate & Print
            </button>
          </div>
        </div>
      </Modal>

      <WhatsAppNotifier />
    </div>
  );
}
