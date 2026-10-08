'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, ChevronDown, Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../authservice/useAuth';
import { hasPermission } from '../authservice/auth';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { showToast } from '../../utils/helpers';
import { apiRequest } from '../authservice/api';
import classService from '../../services/classService';

function EditableSectionDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredSections = options.filter((section) =>
    section.toLowerCase().includes(String(value || '').trim().toLowerCase())
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        placeholder="Select or enter section"
        autoComplete="off"
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((open) => !open)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500"
        aria-label="Toggle section options"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {isOpen && filteredSections.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filteredSections.map((section) => (
            <button
              key={section}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(section);
                setIsOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 outline-none hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white"
            >
              {section}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getClassOrderValue(className) {
  const normalized = String(className || '').trim();
  const numericValue = Number(normalized);

  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return Number.MAX_SAFE_INTEGER;
}

export default function ClassesPage() {
  const router = useRouter();
  const { isAdmin, permissions } = useAuth();
  const canDeleteClass = hasPermission(permissions, 'CLASSES_DELETE');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Something went wrong');
  const [modalMessage, setModalMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    section: '', 
    incharge: '', 
    roomNumber: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  });

  // Load classes and teachers
  const loadData = useCallback(async () => {
    setLoading(true);

    const [classesResult, studentsResult] = await Promise.all([
      classService.getAll(),
      apiRequest('/students', { includeAuth: true }).catch(() => null),
    ]);
    if (classesResult.success) {
      const allStudents = Array.isArray(studentsResult?.students)
        ? studentsResult.students
        : Array.isArray(studentsResult?.data?.students)
          ? studentsResult.data.students
          : [];
      const sourceClasses = classesResult.data;
      const classesWithCounts = sourceClasses.map((classItem) => {
        const studentCount = allStudents.filter(
          (student) => (student.className || student.class) === classItem.name && student.section === classItem.section
        ).length;

        return {
          ...classItem,
          studentCount,
        };
      });

      setClasses(classesWithCounts);
    } else {
      showToast('Failed to load classes', 'error');
    }
    
    try {
      const teachersResult = await apiRequest('/teachers');
      if (teachersResult?.success) {
        setTeachers(Array.isArray(teachersResult.teachers) ? teachersResult.teachers : []);
      } else {
        setTeachers([]);
      }
    } catch (error) {
      setTeachers([]);
    }
    
    setLoading(false);
  }, []);

  // Initial load and event listeners
  useEffect(() => {
    loadData();
    
    const handleClassesUpdate = () => {
      loadData();
    };
    
    window.addEventListener('classesUpdated', handleClassesUpdate);
    window.addEventListener('studentEnrolled', handleClassesUpdate);
    window.addEventListener('studentDeleted', handleClassesUpdate);
    
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
      window.removeEventListener('studentEnrolled', handleClassesUpdate);
      window.removeEventListener('studentDeleted', handleClassesUpdate);
    };
  }, [loadData]);

  useEffect(() => {
    if (!showSuccessModal) return undefined;

    const timeoutId = window.setTimeout(() => {
      setShowSuccessModal(false);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSuccessModal]);

  // Filter classes based on search
  const filteredClasses = classes
    .filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.incharge?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((left, right) => {
      const classOrderDifference = getClassOrderValue(left.name) - getClassOrderValue(right.name);
      if (classOrderDifference !== 0) {
        return classOrderDifference;
      }

      return String(left.section || '').localeCompare(String(right.section || ''));
    });

  // Get unique class names for statistics
  const uniqueClassNames = [...new Set(classes.map(c => c.name))];
  const sectionOptions = [...new Set(
    classes.map((classItem) => String(classItem.section || '').trim()).filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  }));
  
  // Statistics
  const statistics = {
    totalClasses: uniqueClassNames.length,
    totalSections: classes.length,
    totalStudents: classes.reduce((sum, c) => sum + (c.studentCount || 0), 0),
    totalTeachers: teachers.length
  };

  // Handle class click - navigate to class detail
  const handleClassClick = (classItem) => {
    router.push(`/AdminDashboard/students/class-detail/${encodeURIComponent(classItem.name)}/${encodeURIComponent(classItem.section)}`);
  };

  // Handle edit class
  const handleEditClass = (classItem, e) => {
    e.stopPropagation();
    setSelectedClass(classItem);
    setFormData({
      name: classItem.name,
      section: classItem.section,
      incharge: classItem.incharge || '',
      roomNumber: classItem.roomNumber || '',
      academicYear: classItem.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
    });
    setIsModalOpen(true);
  };

  // Handle add new class
  const handleAddClass = () => {
    setSelectedClass(null);
    setFormData({ 
      name: '', 
      section: '', 
      incharge: '', 
      roomNumber: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
    });
    setIsModalOpen(true);
  };

  // Handle submit (add/edit)
  const handleSubmit = async () => {
    if (!formData.name) {
      setErrorTitle('Missing required fields');
      setModalMessage('Please fill the class name.');
      setShowErrorModal(true);
      showToast('Please fill the class name', 'error');
      return;
    }

    if (!String(formData.section || '').trim()) {
      setErrorTitle('Missing required fields');
      setModalMessage('Please fill the section.');
      setShowErrorModal(true);
      showToast('Please fill the section', 'error');
      return;
    }

    // Check for duplicate class (same name and section)
    const isDuplicate = classes.some(c => 
      c.name === formData.name && 
      c.section === formData.section && 
      (!selectedClass || c.id !== selectedClass.id)
    );

    if (isDuplicate) {
      setErrorTitle('Duplicate class');
      setModalMessage(`Class ${formData.name} - Section ${formData.section} already exists!`);
      setShowErrorModal(true);
      showToast(`Class ${formData.name} - Section ${formData.section} already exists!`, 'error');
      return;
    }

    const normalizedIncharge = normalizeValue(formData.incharge);
    const conflictingInchargeClass = normalizedIncharge
      ? classes.find((classItem) => {
          const sameTeacher = normalizeValue(classItem.incharge) === normalizedIncharge;
          const sameRecord =
            selectedClass &&
            [classItem.id, classItem._id].some((classId) =>
              classId != null && [selectedClass.id, selectedClass._id].some((selectedId) =>
                selectedId != null && String(classId) === String(selectedId)
              )
            );

          return sameTeacher && !sameRecord;
        })
      : null;

    if (conflictingInchargeClass) {
      const conflictLabel = `${conflictingInchargeClass.name} - Section ${conflictingInchargeClass.section}`;
      setErrorTitle('Teacher already assigned');
      setModalMessage(`This teacher is already assigned as class incharge for ${conflictLabel}. One teacher can only be incharge of one class.`);
      setShowErrorModal(true);
      showToast(`This teacher is already assigned as class incharge for ${conflictLabel}.`, 'error');
      return;
    }

    let result;
    
    if (selectedClass) {
      result = await classService.update(selectedClass.id, {
        ...selectedClass,
        ...formData,
        updatedAt: new Date().toISOString()
      });
      
      if (result.success) {
        setModalMessage('Class updated successfully.');
        setShowSuccessModal(true);
        showToast('Class updated successfully!', 'success');
        await loadData();
        setIsModalOpen(false);
      } else {
        setErrorTitle('Update failed');
        setModalMessage(result.message || 'Failed to update class.');
        setShowErrorModal(true);
        showToast(result.message, 'error');
      }
    } else {
      result = await classService.create({
        ...formData,
        studentCount: 0,
        timetable: [],
        createdAt: new Date().toISOString()
      });
      
      if (result.success) {
        setModalMessage('Class created successfully.');
        setShowSuccessModal(true);
        showToast('Class created successfully!', 'success');
        await loadData();
        setIsModalOpen(false);
      } else {
        setErrorTitle('Creation failed');
        setModalMessage(result.message || 'Failed to create class.');
        setShowErrorModal(true);
        showToast(result.message, 'error');
      }
    }
  };

  const performDeleteClass = async (classItem) => {
    if (!classItem) return;
    if (!canDeleteClass) {
      showToast('You do not have permission to delete classes.', 'error');
      return;
    }
    
    const result = await classService.delete(classItem.id);
    
    if (result.success) {
      setModalMessage('Class deleted successfully.');
      setShowSuccessModal(true);
      showToast('Class deleted successfully', 'success');
      await loadData();
      if (selectedClass && String(selectedClass.id) === String(classItem.id)) {
        setIsModalOpen(false);
      }
    } else {
      setErrorTitle('Delete failed');
      setModalMessage(result.message || 'Failed to delete class.');
      setShowErrorModal(true);
      showToast(result.message, 'error');
    }
  };

  // Shared delete flow for modal and table actions
  const deleteClassItem = async (classItem) => {
    if (!classItem) return;
    if (!canDeleteClass) {
      showToast('You do not have permission to delete classes.', 'error');
      return;
    }

    setDeleteTarget(classItem);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    await deleteClassItem(selectedClass);
  };

  const handleDeleteClass = async (classItem, e) => {
    e.stopPropagation();
    await deleteClassItem(classItem);
  };

  const confirmDeleteClass = async () => {
    if (!deleteTarget) return;

    await performDeleteClass(deleteTarget);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"></div>
          <p className="text-sm text-slate-500">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-6 pt-0 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        <div className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm">
          <div className="bg-blue-600 px-4 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>                  
                  <h1 className="text-2xl font-semibold text-white md:text-3xl">Class & Section Management</h1>                  
                </div>
              </div>
              {isAdmin && (
                <Button 
                  onClick={handleAddClass} 
                  className="w-full rounded-xl bg-white px-6 py-3 !font-bold !text-blue-500 hover:bg-blue-50 hover:!text-white focus:ring-white sm:w-auto"
                >
                  <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Class / Section
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-400 px-5 py-5 text-center">
              <p className="text-sm font-bold text-slate-900">Total Classes</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{statistics.totalClasses}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">Unique grades</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-400 px-5 py-5 text-center">
              <p className="text-sm font-bold text-slate-900">Total Sections</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{statistics.totalSections}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">All sections</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-400 px-5 py-5 text-center">
              <p className="text-sm font-bold text-slate-900">Total Students</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{statistics.totalStudents}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">Enrolled</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-400 px-5 py-5 text-center">
              <p className="text-sm font-bold text-slate-900">Total Teachers</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{statistics.totalTeachers}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">Available</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" />
            </svg>
          </div>
          <input 
            type="text"
            placeholder="Search by class name, section, teacher, or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400"
          />
        </div>

        {filteredClasses.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full">
                <thead>
                  <tr className="border-b border-blue-700 bg-blue-600">
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Sr No.</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Class</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Section</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Class Incharge</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Students</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Academic Year</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.map((classItem, index) => (
                    <tr
                      key={classItem.id}
                      onClick={() => handleClassClick(classItem)}
                      className="cursor-pointer transition-colors duration-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleClassClick(classItem)}
                            className="text-left text-sm font-semibold text-slate-700 transition-colors hover:text-sky-600"
                            title={`View students in ${classItem.name} Section ${classItem.section}`}
                          >
                            {classItem.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
                          Section {classItem.section}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {classItem.incharge ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                             <span className="text-sm font-medium text-slate-700">{classItem.incharge}</span>
                          </div>
                        ) : (
                           <span className="text-sm italic text-slate-400">Not Assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                         <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                          classItem.studentCount > 0 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {classItem.studentCount || 0} {classItem.studentCount === 1 ? 'Student' : 'Students'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-sm font-medium text-slate-600">
                          {classItem.academicYear || 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isAdmin && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => handleEditClass(classItem, e)}
                              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                              title="Edit Class"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClassClick(classItem);
                              }}
                              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClass(classItem, e)}
                              className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                              title="Delete Class"
                              disabled={!canDeleteClass}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-sky-500"></div>
                    <span className="text-sm text-slate-600">
                      Total Classes: <strong className="text-sky-600">{statistics.totalClasses}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-slate-600">
                      Total Sections: <strong className="text-emerald-600">{statistics.totalSections}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                    <span className="text-sm text-slate-600">
                      Total Students: <strong className="text-indigo-600">{statistics.totalStudents}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  Showing {filteredClasses.length} of {classes.length} sections
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-800">No classes found</h3>
            <p className="mb-4 text-slate-500">
              {searchTerm ? `No results matching "${searchTerm}"` : 'No classes or sections have been created yet'}
            </p>
            {isAdmin && !searchTerm && (
              <Button onClick={handleAddClass} className="rounded-xl bg-sky-500 px-6 py-2.5 text-white hover:bg-sky-600 focus:ring-sky-500">
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Class
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Class */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedClass ? 'Edit Class / Section' : 'Create New Class / Section'}
        size="md"
        headerClassName="rounded-t-lg border-b border-slate-200 bg-slate-50"
        titleClassName="text-blue-500"
        closeButtonClassName="text-slate-400 hover:text-slate-600"
      >
          <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Class Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter class name"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Section *
              </label>
              <EditableSectionDropdown
                value={formData.section}
                onChange={(section) => setFormData({ ...formData, section })}
                options={sectionOptions}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Class Incharge
            </label>
            <select
              value={formData.incharge}
              onChange={(e) => setFormData({ ...formData, incharge: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Select a teacher</option>
              {teachers.map((teacher) => {
                const teacherId = teacher._id || teacher.id;
                const teacherName = teacher.personalInfo?.name || teacher.name || '';
                const teacherSubject = teacher.educationInfo?.majorSubject || teacher.subject || '';

                if (!teacherName) return null;

                return (
                  <option key={teacherId} value={teacherName}>
                    {teacherName} {teacherSubject ? `- ${teacherSubject}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Academic Year
            </label>
            <input
              type="text"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              placeholder="e.g., 2024-2025"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {selectedClass && isAdmin && canDeleteClass && (
              <button 
                onClick={handleDelete}
                className="w-full rounded-lg px-5 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
              >
                Delete Class
              </button>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button 
                variant="secondary" 
                onClick={() => setShowCancelModal(true)} 
                className="w-full rounded-xl border border-slate-300 px-5 py-2.5 transition-all hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="w-full rounded-xl bg-sky-500 px-6 py-2.5 font-medium text-white hover:bg-sky-600 focus:ring-sky-500 sm:w-auto"
              >
                {selectedClass ? 'Save Changes' : 'Create Class'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Success
                </h3>
                <p className="text-xs text-gray-600">{modalMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {errorTitle}
                </h3>
                <p className="text-xs text-gray-600">{modalMessage}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Unsaved changes
                </h3>
                <p className="text-xs text-gray-600">
                  Are you sure? All unsaved changes will be lost.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setIsModalOpen(false);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Delete Class
                </h3>
                <p className="text-sm text-gray-600">
                  {`Are you sure you want to delete Class ${deleteTarget.name} - Section ${deleteTarget.section}?`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmDeleteClass}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:w-auto"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
