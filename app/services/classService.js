'use client';

import { apiRequest } from '../AdminDashboard/authservice/api';
import { buildError, buildSuccess } from './storage';

function extractClasses(response) {
  const classes = Array.isArray(response)
    ? response
    : Array.isArray(response?.classes)
      ? response.classes
      : Array.isArray(response?.data?.classes)
        ? response.data.classes
        : Array.isArray(response?.data)
          ? response.data
          : response?.class && typeof response.class === 'object'
            ? [response.class]
            : response?.data?.class && typeof response.data.class === 'object'
              ? [response.data.class]
              : [];
  return classes.map((classItem) => ({ ...classItem, id: classItem.id || classItem._id }));
}

async function request(action, fallbackMessage) {
  try {
    const response = await action();
    if (response?.success === false) {
      return buildError(response.message || fallbackMessage);
    }
    return buildSuccess(response);
  } catch (error) {
    return buildError(error?.message || fallbackMessage);
  }
}

const classService = {
  async getAll() {
    return request(async () => {
      const response = await apiRequest('/classes', { includeAuth: true });
      if (response?.success === false) {
        throw new Error(response.message || 'Failed to load classes');
      }
      return extractClasses(response);
    }, 'Failed to load classes');
  },

  async create(classData) {
    return request(
      () => apiRequest('/classes/createClass', { method: 'POST', data: classData, includeAuth: true }),
      'Failed to create class'
    );
  },

  async update(id, classData) {
    return request(
      () => apiRequest(`/classes/updateClass/${encodeURIComponent(id)}`, { method: 'PUT', data: classData, includeAuth: true }),
      'Failed to update class'
    );
  },

  async delete(id) {
    return request(
      () => apiRequest(`/classes/deleteClass/${encodeURIComponent(id)}`, { method: 'DELETE', includeAuth: true }),
      'Failed to delete class'
    );
  },

  async getClassWithStudents(className, section) {
    const result = await this.getAll();
    if (!result.success) return result;

    const classItem = result.data.find(
      (item) => item.name === className && item.section === section
    );
    if (!classItem) return buildError('Class not found');

    try {
      const response = await apiRequest('/students', { includeAuth: true });
      const students = Array.isArray(response?.students)
        ? response.students
        : Array.isArray(response?.data?.students)
          ? response.data.students
          : Array.isArray(response?.data)
            ? response.data
            : [];
      const classStudents = students.filter(
        (student) => (student.className || student.class) === className && student.section === section
      );
      return buildSuccess({ ...classItem, students: classStudents, totalStudents: classStudents.length });
    } catch (error) {
      return buildError(error?.message || 'Failed to load class students');
    }
  },
};

export default classService;
