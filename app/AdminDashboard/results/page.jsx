'use client';

import { useState, useEffect, useMemo } from 'react';
import ResultFilters from './ResultFilters';
import ResultTable from './ResultTable';
import ResultAnalytics from './ResultAnalytics';
import ResultEntryPanel from './ResultEntryPanel';
import ResultCard from './ResultCard';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { getSubjectsByClass, calculateResultSummary } from '../../utils/results/resultCalculator';
import { getResultEntrySubjects } from '../../utils/results/subjectsConfig';
import { showToast } from '../../utils/helpers';
import { apiRequest } from '../authservice/api.jsx';
import classService from '../../services/classService';
import studentService from '../../services/studentService';

function getStudentIdentity(student) {
  return student?.id ?? student?._id ?? student?.regNo ?? null;
}

function normalizeComparableValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getResultClassName(className) {
  const normalizedClass = String(className || '').trim();
  return /^(?:nursery|nursary)$/i.test(normalizedClass) ? 'ECCE' : normalizedClass;
}

function normalizeSubjectKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapBackendTermNameToKey(termName) {
  const normalized = String(termName || '').trim().toLowerCase();

  if (normalized === 'montly test') return 'monthlyTest';
  if (normalized === '1st term' || normalized === 'first term') return 'firstTerm';
  if (normalized === '2nd term' || normalized === 'second term') return 'secondTerm';
  if (normalized === 'final term') return 'finalTerm';

  return null;
}

function mapFrontendTermKeyToBackend(termKey) {
  if (termKey === 'monthlyTest') return 'Montly Test';
  if (termKey === 'firstTerm') return '1st Term';
  if (termKey === 'secondTerm') return '2nd Term';
  if (termKey === 'finalTerm') return 'Final Term';
  return termKey;
}

function findMatchingResultRecord(student, resultRecords = []) {
  const studentId = normalizeComparableValue(getStudentIdentity(student));
  const registrationNumber = normalizeComparableValue(student?.regNo);
  const studentName = normalizeComparableValue(student?.name);
  const className = normalizeComparableValue(student?.class);
  const section = normalizeComparableValue(student?.section);

  return resultRecords.find((item) => {
    const recordStudentId = normalizeComparableValue(item?.studentId);
    const recordRegistrationNumber = normalizeComparableValue(item?.registrationNumber);
    const recordStudentName = normalizeComparableValue(item?.studentName);
    const recordClassName = normalizeComparableValue(item?.className);
    const recordSection = normalizeComparableValue(item?.section);

    if (registrationNumber && recordRegistrationNumber === registrationNumber) {
      return true;
    }

    if (studentId && recordStudentId === studentId) {
      return true;
    }

    return (
      studentName &&
      className &&
      section &&
      recordStudentName === studentName &&
      recordClassName === className &&
      recordSection === section
    );
  }) || null;
}

function mergeResultRecordsIntoStudents(students, resultRecords = []) {
  return students.map((student) => {
    const subjects = getResultEntrySubjects(student.class, student.group) || [];
    const subjectLookup = new Map(
      subjects.map((subject) => [normalizeSubjectKey(subject), subject])
    );

    const matchedResult = findMatchingResultRecord(student, resultRecords);

    if (!matchedResult || !Array.isArray(matchedResult.terms)) {
      return student;
    }

    const nextResults = { ...(student.results || {}) };

    matchedResult.terms.forEach((term) => {
      const termKey = mapBackendTermNameToKey(term?.termName);
      if (!termKey) {
        return;
      }

      const normalizedSubjects = {};
      const subjectMarks = Array.isArray(term?.subjectMarks) ? term.subjectMarks : [];
      const availableOptionalSubjects = subjects.filter((subject) => subject.startsWith('Optional Subject'));

      subjectMarks.forEach((item) => {
        const subjectName = subjectLookup.get(normalizeSubjectKey(item?.subjectName))
          || availableOptionalSubjects.shift()
          || String(item?.subjectName || '').trim();
        if (!subjectName) {
          return;
        }

        normalizedSubjects[subjectName] = {
          total: Number(item?.totalMarks || 0),
          obtained: Number(item?.obtainedMarks || 0),
          ...(subjectName.startsWith('Optional Subject') ? { subjectName: item?.subjectName || '' } : {}),
        };
      });

      const normalizedTerm = {
        ...(nextResults[termKey] || {}),
        subjects: normalizedSubjects,
        month: term?.month || nextResults[termKey]?.month || '',
        remarks: term?.teacherRemarks || nextResults[termKey]?.remarks || '',
      };

      if (termKey === 'monthlyTest' && term?.month) {
        nextResults[termKey] = {
          ...(nextResults[termKey] || {}),
          months: {
            ...(nextResults[termKey]?.months || {}),
            [term.month]: normalizedTerm,
          },
        };
      } else {
        nextResults[termKey] = normalizedTerm;
      }
    });

    return {
      ...student,
      results: nextResults,
      _resultRecordId: matchedResult._id,
    };
  });
}

function buildResultPayload(student) {
  const terms = ['monthlyTest', 'firstTerm', 'secondTerm', 'finalTerm']
    .flatMap((termKey) => {
      const termData = student?.results?.[termKey];
      const termEntries = termKey === 'monthlyTest' && termData?.months
        ? Object.values(termData.months)
        : [termData];

      return termEntries.map((entry) => {
      if (!entry?.subjects) return null;
      const subjectMarks = Object.entries(entry.subjects)
        .map(([subjectName, values]) => ({
          subjectName: values?.subjectName || subjectName,
          totalMarks: Number(values?.total || 0),
          obtainedMarks: Number(values?.obtained || 0),
        }))
        .filter((item) => item.totalMarks > 0 || item.obtainedMarks > 0);

      if (subjectMarks.length === 0 && !entry?.remarks) {
        return null;
      }

      const totalMarks = subjectMarks.reduce((sum, item) => sum + item.totalMarks, 0);
      const obtainedMarks = subjectMarks.reduce((sum, item) => sum + item.obtainedMarks, 0);

      return {
        termName: mapFrontendTermKeyToBackend(termKey),
        month: entry?.month || '',
        totalMarks,
        obtainedMarks,
        subjectMarks,
        teacherRemarks: entry?.remarks || '',
      };
      });
    })
    .filter(Boolean);

  return {
    studentId: String(getStudentIdentity(student) || ''),
    studentName: student?.name || '',
    registrationNumber: student?.regNo || '',
    className: student?.class || '',
    section: student?.section || '',
    fatherName: student?.fatherName || '',
    terms,
  };
}

export default function ResultsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState('finalTerm');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    searchQuery: '',
    class: 'all'
  });
  const [analyticsData, setAnalyticsData] = useState(null);

  const availableClasses = useMemo(() => {
    const classNames = new Set();

    students.forEach((student) => {
      if (student.class) {
        classNames.add(getResultClassName(student.class));
      }
    });

    classes.forEach((classItem) => {
      if (classItem.name) {
        classNames.add(getResultClassName(classItem.name));
      }
    });

    return Array.from(classNames).sort((left, right) => left.localeCompare(right));
  }, [classes, students]);

  const classResultSummary = useMemo(() => {
    if (searchFilters.class === 'all') {
      return null;
    }

    const appearedStudents = filteredStudents.filter((student) => {
      const summary = calculateResultSummary(student, 'finalTerm');
      return summary && Number(summary.totalMarks || 0) > 0;
    });

    const passedStudents = appearedStudents.filter((student) => {
      const summary = calculateResultSummary(student, 'finalTerm');
      return summary?.status === 'PASS';
    }).length;

    const failedStudents = appearedStudents.filter((student) => {
      const summary = calculateResultSummary(student, 'finalTerm');
      return summary?.status === 'FAIL';
    }).length;

    const totalPercentage = appearedStudents.reduce((sum, student) => {
      const summary = calculateResultSummary(student, 'finalTerm');
      return sum + Number(summary?.percentage || 0);
    }, 0);

    return {
      className: searchFilters.class,
      appeared: appearedStudents.length,
      passed: passedStudents,
      failed: failedStudents,
      percentage: appearedStudents.length > 0 ? (totalPercentage / appearedStudents.length).toFixed(2) : '0.00',
    };
  }, [filteredStudents, searchFilters.class]);

  const studentsByClass = useMemo(() => {
    const groupedStudents = filteredStudents.reduce((groups, student) => {
      const className = getResultClassName(student.class) || 'Unassigned';
      if (!groups[className]) groups[className] = [];
      groups[className].push(student);
      return groups;
    }, {});

    const getClassOrder = (className) => {
      const normalizedClass = String(className).trim().toLowerCase();
      const earlyClassOrder = {
        'pre-nursery': 0,
        kg: 1,
        ecce: 2,
      };
      if (earlyClassOrder[normalizedClass] !== undefined) return earlyClassOrder[normalizedClass];

      const classNumber = normalizedClass.match(/\d+/);
      return classNumber ? 10 + Number(classNumber[0]) : Number.MAX_SAFE_INTEGER;
    };

    return Object.entries(groupedStudents).sort(([left], [right]) => {
      const orderDifference = getClassOrder(left) - getClassOrder(right);
      return orderDifference || left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredStudents]);

  // Load students data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [studentsResult, classesResult] = await Promise.all([
          studentService.getAll(),
          classService.getAll(),
        ]);

        const data = studentsResult.success ? studentsResult.data : [];
        const classList = classesResult.success ? classesResult.data : [];
        let resultRecords = [];

        try {
          const resultsResponse = await apiRequest('/results');
          resultRecords = Array.isArray(resultsResponse?.results) ? resultsResponse.results : [];
        } catch (resultError) {
          console.error('Error loading result records:', resultError);
        }

        const mergedStudents = mergeResultRecordsIntoStudents(data, resultRecords);

        setClasses(classList);
        setStudents(mergedStudents);
        filterStudents(mergedStudents, searchFilters);
        calculateAnalytics(mergedStudents);
      } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading student data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter students when search filters change
  useEffect(() => {
    filterStudents(students, searchFilters);
  }, [searchFilters, students]);

  const filterStudents = (data, filters) => {
    let filtered = [...data];
    
    // Search by name, reg no, or father name
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(query) ||
        student.regNo?.toLowerCase().includes(query) ||
        student.fatherName?.toLowerCase().includes(query)
      );
    }
    
    // Filter by class
    if (filters.class !== 'all') {
      filtered = filtered.filter(student => getResultClassName(student.class) === filters.class);
    }
    
    setFilteredStudents(filtered);
  };

  const calculateAnalytics = (data) => {
    const totalStudents = data.length;
    let passedCount = 0;
    let failedCount = 0;
    let totalPercentage = 0;
    let gradeDistribution = {
      'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
    };

    data.forEach(student => {
      const summary = calculateResultSummary(student);
      if (summary && summary.status === 'PASS') {
        passedCount++;
      } else if (summary && summary.status === 'FAIL') {
        failedCount++;
      }
      if (summary && summary.percentage) {
        totalPercentage += parseFloat(summary.percentage);
      }
      if (summary && summary.grade) {
        gradeDistribution[summary.grade] = (gradeDistribution[summary.grade] || 0) + 1;
      }
    });

    setAnalyticsData({
      totalStudents,
      passedCount,
      failedCount,
      passRate: totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(1) : 0,
      averagePercentage: totalStudents > 0 ? (totalPercentage / totalStudents).toFixed(1) : 0,
      gradeDistribution
    });
  };

  const handleViewResult = (student) => {
    const latestStudent = students.find(
      (item) => String(getStudentIdentity(item)) === String(getStudentIdentity(student))
    );
    setSelectedStudent(latestStudent || student);
    setIsViewModalOpen(true);
  };

  const handleEditResult = (student) => {
    const latestStudent = students.find(
      (item) => String(getStudentIdentity(item)) === String(getStudentIdentity(student))
    );
    setSelectedStudent(latestStudent || student);
    setIsEditModalOpen(true);
  };

  const handleSaveResult = async (updatedStudent) => {
    const studentIdentity = getStudentIdentity(updatedStudent);
    const payload = buildResultPayload(updatedStudent);

    try {
      const resultResponse = await apiRequest('/results/upsert', {
        method: 'POST',
        data: payload,
      });
      const savedResultRecord = resultResponse?.resultItem || null;

      const studentUpdatePayload = {
        ...updatedStudent,
        ...(savedResultRecord?._id ? { _resultRecordId: savedResultRecord._id } : {}),
      };

      const result = await studentService.update(studentIdentity, studentUpdatePayload);

      if (!result.success) {
        showToast(result.message || 'Failed to save result', 'error');
        return;
      }

      const savedStudent = result.data;
      const updatedStudents = students.map((student) =>
        String(getStudentIdentity(student)) === String(getStudentIdentity(savedStudent)) ? savedStudent : student
      );

      setStudents(updatedStudents);
      filterStudents(updatedStudents, searchFilters);
      calculateAnalytics(updatedStudents);
      showToast('Result saved successfully!', 'success');
      setIsEditModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Failed to persist result:', error);
      showToast(error?.message || 'Failed to save result', 'error');
      return;
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-4 pb-8 pt-0 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl shadow-xl p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-8 w-64 bg-white/20 rounded-lg animate-pulse"></div>
                <div className="h-4 w-96 bg-white/20 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                <div className="h-8 w-32 bg-slate-300 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl p-6 animate-pulse">
            <div className="h-10 w-full bg-slate-200 rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-slate-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 pb-8 pt-0 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Section */}
        <div className=" relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-600 to-emerald-600 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm shadow-lg">
                  📊
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">Result Management System</h1>
                  <p className="text-blue-100 mt-1 text-sm">Manage student results, generate report cards, and track academic progress</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm text-white">
                  Academic Year 2024-2025
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-6 text-white/10" preserveAspectRatio="none" viewBox="0 0 1440 54">
              <path fill="currentColor" d="M0,22L80,27.3C160,33,320,43,480,42.7C640,43,800,32,960,26.7C1120,21,1280,21,1360,21.3L1440,22L1440,54L1360,54C1280,54,1120,54,960,54C800,54,640,54,480,54C320,54,160,54,80,54L0,54Z"></path>
            </svg>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-xl border border-sky-500 bg-sky-400 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData?.totalStudents || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500 bg-emerald-400 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Pass Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData?.passRate || 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500 bg-amber-400 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Average Percentage</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{analyticsData?.averagePercentage || 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet-500 bg-violet-400 p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Active Classes</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {new Set(students.map(s => `${s.class}-${s.section}`)).size}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {analyticsData && (
          <div className="transform transition-all duration-300">
            <ResultAnalytics data={analyticsData} />
          </div>
        )}

        {/* Search Filters */}
        <div className="transform transition-all duration-300">
          <ResultFilters 
            filters={searchFilters}
            onFilterChange={setSearchFilters}
            classes={availableClasses}
          />
        </div>

        {/* Results Table Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/50 dark:to-blue-900/10">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Student Results</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {filteredStudents.length} of {students.length} students
              </p>
              {searchFilters.class !== 'all' && (
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  Class: {String(searchFilters.class).replace(/^(?:class|grade)\s*/i, '')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-500">Live Data</span>
            </div>
          </div>
          
          {searchFilters.class === 'all' ? (
            <div className="divide-y-4 divide-slate-200">
              {studentsByClass.map(([className, classStudents]) => (
                <section key={className}>
                  <h3 className="border-b border-slate-200 bg-slate-100 px-5 py-3 text-lg font-bold text-slate-800">
                    {/^(?:class|grade)\s/i.test(className) || !/\d/.test(className)
                      ? className
                      : `Class ${className}`}
                  </h3>
                  <ResultTable
                    students={classStudents}
                    onView={handleViewResult}
                    onEdit={handleEditResult}
                  />
                </section>
              ))}
            </div>
          ) : (
            <ResultTable
              students={filteredStudents}
              onView={handleViewResult}
              onEdit={handleEditResult}
              classSummary={classResultSummary}
            />
          )}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && !isLoading && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No students found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search filters or clear the filters to see all students.
            </p>
            <button
              onClick={() => setSearchFilters({ searchQuery: '', class: 'all' })}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* View Result Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStudent(null);
        }}
        title="Student Result Card"
        size="xl"
        className="animate-fadeIn"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <ResultCard 
              student={selectedStudent} 
              term={selectedTerm}
              onTermChange={setSelectedTerm}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Result Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStudent(null);
        }}
        title="Edit Student Results"
        size="lg"
        className="animate-fadeIn"
      >
        {selectedStudent && (
          <ResultEntryPanel 
            student={selectedStudent}
            onSave={handleSaveResult}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedStudent(null);
            }}
          />
        )}
      </Modal>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
