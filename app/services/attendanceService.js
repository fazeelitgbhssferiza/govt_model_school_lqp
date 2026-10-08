'use client';

import { apiRequest } from '../AdminDashboard/authservice/api';
import { buildError, buildSuccess } from './storage';

function normalizeDateKey(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return rawDate.toISOString().split('T')[0];
}

function normalizeAttendanceRecord(record = {}) {
  return {
    id: record.personId != null ? Number(record.personId) || String(record.personId) : '',
    personId: record.personId != null ? String(record.personId) : '',
    name: record.personName || 'Unknown',
    regNo: record.registrationId || '',
    registrationId: record.registrationId || '',
    class: record.className || '',
    className: record.className || '',
    section: record.section || '',
    status: record.status || 'Unmarked',
    checkIn: record.time || null,
    date: record.attendanceDateKey || normalizeDateKey(record.date),
    personType: record.personType || 'student',
    _id: record._id,
  };
}

const attendanceService = {
  async createAttendance(payload) {
    const response = await apiRequest('/attendance/createAttendance', {
      method: 'POST',
      data: payload,
    });

    return buildSuccess(normalizeAttendanceRecord(response.attendanceItem), response.message);
  },

  async getAttendanceSnapshot(date, options = {}) {
    try {
      const response = await apiRequest('/attendance', {
        params: {
          date: normalizeDateKey(date),
          ...(options.className ? { className: options.className } : {}),
          ...(options.section ? { section: options.section } : {}),
        },
      });

      const entries = Array.isArray(response.attendance)
        ? response.attendance.map(normalizeAttendanceRecord)
        : [];

      return buildSuccess({
        students: entries.filter((entry) => entry.personType === 'student'),
        teachers: entries.filter((entry) => entry.personType === 'teacher'),
        all: entries,
      });
    } catch (error) {
      return buildError(error.message || 'Failed to fetch attendance');
    }
  },

  async getAttendanceByDate(date, className, section) {
    try {
      const snapshotResult = await this.getAttendanceSnapshot(date, { className, section });
      if (!snapshotResult.success) {
        return snapshotResult;
      }

      const attendance = snapshotResult.data.students;
      const present = attendance.filter((record) => record.status === 'Present').length;
      const absent = attendance.filter((record) => record.status === 'Absent').length;
      const total = attendance.length;

      return buildSuccess({
        attendance,
        stats: {
          present,
          absent,
          total,
        },
      });
    } catch (error) {
      return buildError(error.message || 'Failed to fetch attendance');
    }
  },
};

export default attendanceService;
