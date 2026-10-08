'use client';
import { useState, useEffect, useCallback } from 'react';
import { showToast } from '../../../utils/helpers';

export function useStudentData() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classSummary, setClassSummary] = useState([]);

  // Load students data
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents(studentsData);
      generateClassSummary(studentsData);
      setError(null);
    } catch (err) {
      setError('Failed to load students data');
      showToast('Error loading students', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate class summary from students data
  const generateClassSummary = useCallback((studentsList) => {
    const summaryMap = new Map();
    
    studentsList.forEach(student => {
      const key = `${student.class}-${student.section}`;
      
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          id: key,
          class: student.class,
          section: student.section,
          male: 0,
          female: 0,
          total: 0,
          students: []
        });
      }
      
      const classData = summaryMap.get(key);
      if (student.gender === 'Male') {
        classData.male++;
      } else {
        classData.female++;
      }
      classData.total++;
      classData.students.push(student);
    });
    
    setClassSummary(Array.from(summaryMap.values()));
  }, []);

  // Get students by class and section
  const getStudentsByClass = useCallback((className, section) => {
    return students.filter(s => s.class === className && s.section === section);
  }, [students]);

  // Get student by ID
  const getStudentById = useCallback((id) => {
    return students.find(s => s.id === parseInt(id));
  }, [students]);

  // Add new student
  const addStudent = useCallback(async (studentData) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newStudent = {
        id: students.length + 1,
        ...studentData,
        feeRecords: generateFeeRecords(studentData.fee),
        results: {
          firstTerm: null,
          secondTerm: null,
          finalTerm: null
        }
      };
      
      const updatedStudents = [...students, newStudent];
      setStudents(updatedStudents);
      generateClassSummary(updatedStudents);
      
      showToast('Student added successfully', 'success');
      return newStudent;
    } catch (err) {
      showToast('Error adding student', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, generateClassSummary]);

  // Update student
  const updateStudent = useCallback(async (id, updatedData) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedStudents = students.map(student =>
        student.id === parseInt(id) ? { ...student, ...updatedData } : student
      );
      
      setStudents(updatedStudents);
      generateClassSummary(updatedStudents);
      
      showToast('Student updated successfully', 'success');
      return updatedStudents.find(s => s.id === parseInt(id));
    } catch (err) {
      showToast('Error updating student', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, generateClassSummary]);

  // Delete student
  const deleteStudent = useCallback(async (id) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedStudents = students.filter(student => student.id !== parseInt(id));
      setStudents(updatedStudents);
      generateClassSummary(updatedStudents);
      
      showToast('Student deleted successfully', 'success');
      return true;
    } catch (err) {
      showToast('Error deleting student', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [students, generateClassSummary]);

  // Generate fee records
  const generateFeeRecords = (feeStructure) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => ({
      month,
      year: currentYear,
      amount: feeStructure.mode === 'Monthly' ? feeStructure.total : feeStructure.total / 12,
      status: index === 0 ? 'Pending' : 'Unpaid',
      paidDate: null
    }));
  };

  // Search students
  const searchStudents = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return students;
    
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.cnic.includes(searchTerm)
    );
  }, [students]);

  // Get student statistics
  const getStudentStats = useCallback(() => {
    const totalStudents = students.length;
    const maleStudents = students.filter(s => s.gender === 'Male').length;
    const femaleStudents = students.filter(s => s.gender === 'Female').length;
    const feePaid = students.filter(s => {
      const latestFee = s.feeRecords?.[s.feeRecords.length - 1];
      return latestFee?.status === 'Paid';
    }).length;
    
    return {
      totalStudents,
      maleStudents,
      femaleStudents,
      feePaid,
      feePending: totalStudents - feePaid,
      classesCount: classSummary.length
    };
  }, [students, classSummary]);

  return {
    students,
    classSummary,
    loading,
    error,
    getStudentsByClass,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    getStudentStats,
    refresh: loadStudents
  };
}
