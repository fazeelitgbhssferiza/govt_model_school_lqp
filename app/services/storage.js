'use client';

export const STORAGE_KEYS = {
  STUDENTS: 'school_students',
  TEACHERS: 'school_teachers',
  ATTENDANCE: 'school_attendance',
  FEE_STRUCTURES: 'school_fee_structures',
};

export function readList(key) {
  if (typeof window === 'undefined') return [];
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export function writeList(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function buildSuccess(data, message = 'Success') {
  return { success: true, data, message };
}

export function buildError(message = 'Something went wrong') {
  return { success: false, data: null, message };
}
