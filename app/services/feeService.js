'use client';

import { STORAGE_KEYS, buildSuccess, readList, writeList } from './storage';

function getStudents() {
  return readList(STORAGE_KEYS.STUDENTS);
}

function getFeeStructures() {
  return readList(STORAGE_KEYS.FEE_STRUCTURES);
}

function matchesFeeStructure(item, className, section) {
  if (!item) return false;

  const itemClass = String(item.className || '').trim();
  const targetClass = String(className || '').trim();
  const itemSection = String(item.section || '').trim();
  const targetSection = String(section || '').trim();

  if (itemClass !== targetClass) return false;
  if (targetSection) return itemSection === targetSection;
  return true;
}

function dispatchFeeStructuresUpdated(feeStructures) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('feeStructuresUpdated', { detail: feeStructures }));
}

const feeService = {
  async getFeeStructure(className, section = '') {
    const feeStructures = getFeeStructures();
    const feeStructure = feeStructures.find((item) => matchesFeeStructure(item, className, section));
    return buildSuccess(
      feeStructure || {
        className,
        section,
        registrationFee: 5000,
        monthlyFee: 8000,
      }
    );
  },

  async updateFeeStructure(className, section = '', feeData = {}) {
    const feeStructures = getFeeStructures();
    const nextItem = { className, section, ...feeData };
    const nextStructures = feeStructures.some((item) => matchesFeeStructure(item, className, section))
      ? feeStructures.map((item) => (matchesFeeStructure(item, className, section) ? nextItem : item))
      : [...feeStructures, nextItem];

    const students = getStudents();
    const nextStudents = students.map((student) => {
      if (student.class !== className) return student;
      if (section && student.section !== section) return student;

      return {
        ...student,
        feeStructure: {
          ...(student.feeStructure || {}),
          registrationFee: Number(feeData.registrationFee || 0),
          monthlyFee: Number(feeData.monthlyFee || 0),
          total: Number(feeData.registrationFee || 0) + Number(feeData.monthlyFee || 0),
        },
      };
    });

    writeList(STORAGE_KEYS.STUDENTS, nextStudents);
    writeList(STORAGE_KEYS.FEE_STRUCTURES, nextStructures);
    dispatchFeeStructuresUpdated(nextStructures);
    return buildSuccess(nextItem, 'Fee structure updated successfully');
  },

  async getCollectionReport(className, section) {
    const filteredStudents = getStudents().filter((student) => {
      if (className && student.class !== className) return false;
      if (section && student.section !== section) return false;
      return true;
    });

    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;

    filteredStudents.forEach((student) => {
      const records = Array.isArray(student.feeRecords) ? student.feeRecords : [];
      const studentExpected =
        student.feeStructure?.total ||
        records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
      const studentCollected = records
        .filter((record) => record.status === 'Paid')
        .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
      const studentPending = Math.max(studentExpected - studentCollected, 0);

      totalExpected += studentExpected;
      totalCollected += studentCollected;
      totalPending += studentPending;
    });

    const collectionRate =
      totalExpected > 0 ? Number(((totalCollected / totalExpected) * 100).toFixed(1)) : 0;

    return buildSuccess({
      totalExpected,
      totalCollected,
      totalPending,
      collectionRate,
    });
  },
};

export default feeService;
