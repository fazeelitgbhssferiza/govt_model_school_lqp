'use client';

import { apiRequest } from '../AdminDashboard/authservice/api';
import { STORAGE_KEYS, buildError, buildSuccess, readList, writeList } from './storage';

const TEACHERS_REFRESH_KEY = 'teachers_last_updated';

function getTeachers() {
  return readList(STORAGE_KEYS.TEACHERS);
}

function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function parseExperienceValue(value) {
  if (value === 'Above 30') return 31;
  if (value === 'Above 20') return 21;

  const parsedValue = Number(value || 0);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function isMongoObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || '').trim());
}

function generateTeacherId(teacher = {}) {
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

export function extractTeachersPayload(result) {
  if (Array.isArray(result?.teachers)) return result.teachers;
  if (Array.isArray(result?.data?.teachers)) return result.data.teachers;
  if (Array.isArray(result?.data)) return result.data;
  if (result?.teacher && typeof result.teacher === 'object') return [result.teacher];
  if (result?.data?.teacher && typeof result.data.teacher === 'object') return [result.data.teacher];
  return [];
}

export function normalizeTeacher(teacher = {}) {
  const periodsAssignments = Array.isArray(teacher.classAssign?.periodsAssignments)
    ? teacher.classAssign.periodsAssignments
    : [];
  const fingerprintValue =
    teacher.fingerprint ||
    teacher.biometricInfo?.fingerprint ||
    teacher.biometricInfo?.fingerprint?.templateId ||
    '';
  const faceValue =
    teacher.facerecognition ||
    teacher.biometricInfo?.facerecognition ||
    teacher.biometricInfo?.face?.faceId ||
    '';
  const fingerprintSamples = Array.isArray(teacher.biometricInfo?.fingerprintSamples)
    ? teacher.biometricInfo.fingerprintSamples
    : [];
  const faceSamples = Array.isArray(teacher.biometricInfo?.faceSamples)
    ? teacher.biometricInfo.faceSamples
    : [];

  return {
    ...teacher,
    id: teacher.id || teacher._id || teacher.personalInfo?.cnic || teacher.personalInfo?.contactNumber || teacher.name,
    name: teacher.name || teacher.personalInfo?.name || 'Unknown Teacher',
    gender: teacher.gender || teacher.personalInfo?.gender || 'Unspecified',
    subject: teacher.subject || teacher.educationInfo?.majorSubject || 'Unassigned',
    teacherId: generateTeacherId(teacher),
    experienceLabel: String(teacher.experience || teacher.educationInfo?.experience || '0'),
    experience: parseExperienceValue(teacher.experience || teacher.educationInfo?.experience || 0),
    contactNumber: teacher.contactNumber || teacher.personalInfo?.contactNumber || 'N/A',
    appointmentDate: formatDate(teacher.appointmentDate || teacher.educationInfo?.dateOfAppointment || ''),
    teacherType: teacher.teacherType || teacher.classAssign?.teacherType || 'Teacher',
    classIncharge: teacher.classIncharge || teacher.classAssign?.classIncharge || '',
    periodsCount: periodsAssignments.length || Number(teacher.classAssign?.totalPeriods || 0),
    fingerprint: fingerprintValue,
    fingerprintEnrolled:
      Boolean(teacher.biometricInfo?.fingerprintEnrolled) ||
      Boolean(teacher.biometricInfo?.fingerprint?.enrolled) ||
      Boolean(fingerprintValue),
    fingerprintCapturedAt:
      teacher.biometricInfo?.fingerprintCapturedAt ||
      teacher.biometricInfo?.fingerprint?.enrolledAt ||
      null,
    fingerprintSamples,
    facerecognition: faceValue,
    faceEnrolled:
      Boolean(teacher.biometricInfo?.faceEnrolled) ||
      Boolean(teacher.biometricInfo?.face?.enrolled) ||
      Boolean(faceValue),
    faceCapturedAt:
      teacher.biometricInfo?.faceCapturedAt ||
      teacher.biometricInfo?.face?.enrolledAt ||
      null,
    faceSamples,
  };
}

function persistTeachers(teachers, { notify = true } = {}) {
  writeList(STORAGE_KEYS.TEACHERS, teachers);

  if (typeof window === 'undefined') return;

  localStorage.setItem(TEACHERS_REFRESH_KEY, String(Date.now()));

  if (notify) {
    window.dispatchEvent(new CustomEvent('teachersUpdated', { detail: teachers }));
  }
}

const teacherService = {
  async getAll() {
    try {
      const response = await apiRequest('/teachers');
      const teachers = extractTeachersPayload(response).map(normalizeTeacher);
      persistTeachers(teachers, { notify: false });
      return buildSuccess(teachers);
    } catch (error) {
      const fallbackTeachers = getTeachers();
      if (fallbackTeachers.length > 0) {
        return buildSuccess(fallbackTeachers.map(normalizeTeacher));
      }
      return buildError(error.message || 'Failed to fetch teachers');
    }
  },

  async getById(id) {
    try {
      const response = await apiRequest(`/teachers/${id}`);
      const teacher = normalizeTeacher(response?.teacher || response?.data?.teacher || response?.data || {});
      return buildSuccess(teacher);
    } catch (error) {
      return buildError(error.message || 'Failed to fetch teacher');
    }
  },

  async create(teacherData) {
    try {
      const response = await apiRequest('/teachers/createTeacher', {
        method: 'POST',
        data: teacherData,
      });

      const createdTeacher = normalizeTeacher(response?.teacher || response?.data?.teacher || {});
      const existingTeachers = getTeachers().map(normalizeTeacher);
      persistTeachers([...existingTeachers, createdTeacher]);
      return buildSuccess(createdTeacher, response?.message || 'Teacher created successfully');
    } catch (error) {
      return buildError(error.message || 'Failed to create teacher');
    }
  },

  async update(id, teacherData) {
    try {
      const response = await apiRequest(`/teachers/updateTeacher/${id}`, {
        method: 'PUT',
        data: teacherData,
      });

      const updatedTeacher = normalizeTeacher(response?.teacher || response?.data?.teacher || {});
      const existingTeachers = getTeachers().map(normalizeTeacher);
      const nextTeachers = existingTeachers.map((teacher) =>
        String(teacher.id) === String(id) ? updatedTeacher : teacher
      );
      persistTeachers(nextTeachers);
      return buildSuccess(updatedTeacher, response?.message || 'Teacher updated successfully');
    } catch (error) {
      return buildError(error.message || 'Failed to update teacher');
    }
  },

  async remove(id) {
    try {
      const response = await apiRequest(`/teachers/deleteteachers/${id}`, {
        method: 'DELETE',
      });

      const existingTeachers = getTeachers().map(normalizeTeacher);
      const nextTeachers = existingTeachers.filter((teacher) => String(teacher.id) !== String(id));
      persistTeachers(nextTeachers);
      return buildSuccess(true, response?.message || 'Teacher deleted successfully');
    } catch (error) {
      return buildError(error.message || 'Failed to delete teacher');
    }
  },
};

export default teacherService;
