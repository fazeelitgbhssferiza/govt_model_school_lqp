'use client';

import { apiRequest } from '../AdminDashboard/authservice/api';
import { STORAGE_KEYS, buildError, buildSuccess, readList, writeList } from './storage';

function getStudents() {
  return readList(STORAGE_KEYS.STUDENTS);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getRecordMonthIndex(record) {
  const monthIndex = MONTH_NAMES.indexOf(record?.month);
  const year = Number(record?.year);
  return monthIndex >= 0 && year ? (year * 12) + monthIndex : null;
}

function getMonthlyPayable(student) {
  const fee = student?.feeStructure || {};
  if (Number.isFinite(Number(fee.monthlyPayable))) return Math.max(Number(fee.monthlyPayable), 0);
  return Math.max(Number(fee.monthlyFee || 0) - Number(fee.discount || 0), 0);
}

export function ensureMonthlyFeeRecords(student, today = new Date()) {
  if (!student || student.enrollmentType === 'PEF' || !student.feeStructure) return student;

  const records = Array.isArray(student.feeRecords) ? [...student.feeRecords] : [];
  const currentMonthIndex = (today.getFullYear() * 12) + today.getMonth();
  const existingMonthIndexes = records.map(getRecordMonthIndex).filter(Number.isInteger);
  const enrollmentDate = new Date(student.enrollmentDate || '');
  const enrollmentMonthIndex = Number.isNaN(enrollmentDate.getTime())
    ? currentMonthIndex
    : (enrollmentDate.getFullYear() * 12) + enrollmentDate.getMonth();
  const firstMissingMonthIndex = existingMonthIndexes.length > 0
    ? Math.max(...existingMonthIndexes) + 1
    : enrollmentMonthIndex;
  const monthlyPayable = getMonthlyPayable(student);

  for (let monthIndex = firstMissingMonthIndex; monthIndex <= currentMonthIndex; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    records.push({
      month: MONTH_NAMES[month],
      year,
      monthlyFee: monthlyPayable,
      amount: monthlyPayable,
      dueDate: `${year}-${String(month + 1).padStart(2, '0')}-05`,
      status: 'Pending',
      paidDate: null,
    });
  }

  const normalizedRecords = records.map((record) => {
    const month = MONTH_NAMES.indexOf(record?.month);
    const year = Number(record?.year);
    if (month < 0 || !year || record.dueDate) return record;
    return { ...record, dueDate: `${year}-${String(month + 1).padStart(2, '0')}-05` };
  });

  if (JSON.stringify(normalizedRecords) === JSON.stringify(student.feeRecords || [])) return student;
  return { ...student, feeRecords: normalizedRecords };
}

function getStudentsWithCurrentFees() {
  const students = getStudents();
  const nextStudents = students.map((student) => ensureMonthlyFeeRecords(student));
  if (JSON.stringify(nextStudents) !== JSON.stringify(students)) {
    writeList(STORAGE_KEYS.STUDENTS, nextStudents);
  }
  return nextStudents;
}

function matchesStudent(left, right) {
  if (!left || !right) return false;

  const leftId = left.id ?? left._id ?? left.regNo;
  const rightId = right.id ?? right._id ?? right.regNo;

  return leftId !== undefined && rightId !== undefined && String(leftId) === String(rightId);
}

const studentService = {
  async getAll() {
    return buildSuccess(getStudentsWithCurrentFees());
  },

  async getStudentsByClass(className, section) {
    const students = getStudents().filter(
      (student) => student.class === className && student.section === section
    );
    return buildSuccess(students);
  },

  async getClassStatistics(className, section) {
    const students = getStudents().filter(
      (student) => student.class === className && student.section === section
    );
    const maleCount = students.filter((student) => student.gender === 'Male').length;
    const femaleCount = students.filter((student) => student.gender === 'Female').length;
    const feePendingCount = students.filter((student) => {
      const records = Array.isArray(student.feeRecords) ? student.feeRecords : [];
      const hasPaid = records.some((record) => record.status === 'Paid');
      return !hasPaid && student.feeStatus !== 'Paid';
    }).length;

    return buildSuccess({
      total: students.length,
      maleCount,
      femaleCount,
      feePendingCount,
      students,
    });
  },

  async update(id, studentData) {
    const students = getStudents();
    const index = students.findIndex((student) =>
      matchesStudent(student, { id, _id: id, regNo: studentData?.regNo })
    );

    if (index === -1) {
      return buildError('Student not found');
    }

    const updatedStudent = { ...students[index], ...studentData };
    const nextStudents = [...students];
    nextStudents[index] = updatedStudent;
    writeList(STORAGE_KEYS.STUDENTS, nextStudents);

    return buildSuccess(updatedStudent, 'Student updated successfully');
  },

  async deleteStudent(id) {
    if (!id) {
      return buildError('Student ID is required');
    }

    try {
      const response = await apiRequest(`/students/students/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        includeAuth: true,
      });

      const students = getStudents();
      const nextStudents = students.filter((student) =>
        !matchesStudent(student, { id, _id: id, regNo: id })
      );
      writeList(STORAGE_KEYS.STUDENTS, nextStudents);

      return buildSuccess(response, response?.message || 'Student deleted successfully');
    } catch (error) {
      return buildError(error.message || 'Failed to delete student');
    }
  },
};

export default studentService;
