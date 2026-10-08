'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { apiRequest } from '../authservice/api';
import { hasPermission } from '../authservice/auth';
import { useAuth } from '../authservice/useAuth';
import { showToast } from '../../utils/helpers';
import classService from '../../services/classService';
import { getSubjectsByClass } from '../../utils/results/subjectsConfig';

const TAB_OPTIONS = [
  { id: 'class', name: 'Class Wise' },
  { id: 'teacher', name: 'Teacher Wise' },
  { id: 'general', name: 'General Time Table' },
];

const ALL_CLASSES_KEY = '__ALL_CLASSES__';
const ALL_TEACHERS_KEY = '__ALL_TEACHERS__';

const PERIOD_ORDER = {
  Assembly: 0,
  '1st': 1,
  '1st Period': 1,
  '2nd': 2,
  '2nd Period': 2,
  '3rd': 3,
  '3rd Period': 3,  
  '4th': 4,
  '4th Period': 4,
  '5th': 5,
  '5th Period': 5,
  '6th': 6,
  '6th Period': 6,
  Break: 7,
  '7th': 8,
  '7th Period': 8,
  '8th': 9,
  '8th Period': 9,
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function createClassKey(className, section) {
  const normalizedClassName = normalizeText(className);
  const normalizedSection = normalizeText(section);
  return `${normalizedClassName}::${normalizedSection}`;
}

function parseClassKey(classKey) {
  const [className = '', section = ''] = String(classKey || '').split('::');
  return {
    className: normalizeText(className),
    section: normalizeText(section),
  };
}

function formatClassLabel(className, section) {
  const normalizedClassName = normalizeText(className);
  const normalizedSection = normalizeText(section);

  if (!normalizedClassName && !normalizedSection) {
    return 'General';
  }

  if (!normalizedSection) {
    return normalizedClassName;
  }

  return `${normalizedClassName} - ${normalizedSection}`;
}

function compareClassKeys(leftKey, rightKey) {
  const getClassRank = (className) => {
    const normalizedClassName = normalizeText(className).toLowerCase();

    if (normalizedClassName === 'ecce') {
      return -1;
    }

    const numericClass = Number(normalizedClassName);
    return Number.isNaN(numericClass) ? Number.MAX_SAFE_INTEGER : numericClass;
  };

  const left = parseClassKey(leftKey);
  const right = parseClassKey(rightKey);
  const classDiff = getClassRank(left.className) - getClassRank(right.className);

  if (classDiff !== 0) {
    return classDiff;
  }

  return left.section.localeCompare(right.section, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function formatTeacherEntryClassLabel(item = {}) {
  if (!normalizeText(item.className) && !normalizeText(item.section)) {
    return '-';
  }

  return formatClassLabel(item.className, item.section);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inferTimetableScope(item = {}) {
  const normalizedScope = normalizeText(item.scope).toLowerCase();

  if (normalizedScope === 'general' || normalizedScope === 'class' || normalizedScope === 'teacher') {
    return normalizedScope;
  }

  const teacher = normalizeText(item.teacher);
  const className = normalizeText(item.className);
  const section = normalizeText(item.section);
  const subject = normalizeText(item.subject);

  if (teacher && !className && !section) {
    return 'teacher';
  }

  if (!className && !section && !teacher && !subject) {
    return 'general';
  }

  return 'class';
}

function normalizeTimetableItem(item = {}) {
  return {
    _id: item._id || '',
    scope: inferTimetableScope(item),
    period: normalizeText(item.period),
    time: normalizeText(item.time),
    subject: normalizeText(item.subject),
    teacher: normalizeText(item.teacher),
    className: normalizeText(item.className),
    section: normalizeText(item.section),
    category: normalizeText(item.category),
    day: normalizeText(item.day),
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
  };
}

function parseTimeValue(value) {
  const date = Date.parse(`1970-01-01 ${String(value || '').trim()}`);
  return Number.isNaN(date) ? Number.MAX_SAFE_INTEGER : date;
}

function extractStartTime(timeRange) {
  return String(timeRange || '').split('-')[0]?.trim() || '';
}

function extractEndTime(timeRange) {
  return String(timeRange || '').split('-')[1]?.trim() || '';
}

function normalizePeriodKey(period) {
  const value = normalizeText(period);

  if (!value) {
    return '';
  }

  if (/^\d+$/.test(value)) {
    return String(Number(value));
  }

  return value.toLowerCase();
}

function getPeriodRank(period) {
  const normalizedPeriod = normalizeText(period);
  if (PERIOD_ORDER[normalizedPeriod] !== undefined) {
    return PERIOD_ORDER[normalizedPeriod];
  }

  const matchedNumber = normalizedPeriod.match(/(\d+)/);
  if (matchedNumber) {
    return Number(matchedNumber[1]);
  }

  if (/break/i.test(normalizedPeriod)) {
    return 100;
  }

  if (/lunch/i.test(normalizedPeriod)) {
    return 101;
  }

  return 999;
}

function sortTimetableEntries(entries) {
  return [...entries].sort((left, right) => {
    const periodDiff = getPeriodRank(left.period) - getPeriodRank(right.period);
    if (periodDiff !== 0) {
      return periodDiff;
    }

    const timeDiff = parseTimeValue(extractStartTime(left.time)) - parseTimeValue(extractStartTime(right.time));
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.period.localeCompare(right.period);
  });
}

function buildTimetablePayload(editingType, formData) {
  const { className: parsedClassName, section: parsedSection } = parseClassKey(formData.classKey);
  const className =
    editingType === 'teacher' ? normalizeText(formData.teacherClassName) : parsedClassName;
  const section =
    editingType === 'teacher' ? normalizeText(formData.teacherSection) : parsedSection;

  if (editingType === 'general') {
    return {
      scope: 'general',
      period: normalizeText(formData.period),
      time: normalizeText(formData.time),
      subject: '',
      teacher: '',
      className: '',
      section: '',
      category: '',
      day: '',
    };
  }

  return {
    scope: editingType === 'teacher' ? 'teacher' : 'class',
    period: normalizeText(formData.period),
    time: normalizeText(formData.time),
    subject: normalizeText(formData.subject),
    teacher: normalizeText(formData.teacher),
    className,
    section,
    category: editingType === 'class' ? normalizeText(formData.subjectGroup) : '',
    day: '',
  };
}

function buildEditFormData(item, type) {
  return {
    period: item?.period || '',
    time: item?.time || '',
    subject: type === 'general' ? '' : item?.subject || '',
    teacher: type === 'class' || type === 'teacher' ? item?.teacher || '' : '',
    classKey: type === 'general' ? '' : createClassKey(item?.className, item?.section),
    subjectGroup: type === 'class' ? item?.category || '' : '',
    teacherClassName: type === 'teacher' ? item?.className || '' : '',
    teacherSection: type === 'teacher' ? item?.section || '' : '',
  };
}

function getClassEntriesByKey(timetables, classKey) {
  if (classKey === ALL_CLASSES_KEY) {
    return sortTimetableEntries(timetables.filter((item) => item.scope !== 'general'));
  }

  const { className, section } = parseClassKey(classKey);
  return sortTimetableEntries(
    timetables.filter(
      (item) => item.scope !== 'general' && item.className === className && item.section === section
    )
  );
}

function getTeacherEntries(timetables, teacherName) {
  return sortTimetableEntries(
    timetables.filter((item) => item.scope !== 'general' && item.teacher === teacherName)
  );
}

function getAllTeacherEntries(timetables) {
  return sortTimetableEntries(
    timetables.filter((item) => item.scope !== 'general' && normalizeText(item.teacher))
  );
}

function getGeneralEntries(timetables) {
  return sortTimetableEntries(timetables.filter((item) => item.scope === 'general'));
}

function buildAllClassesPrintMatrix(entries) {
  const sortedEntries = sortTimetableEntries(entries);
  const periods = [];
  const classes = [];
  const periodMap = new Map();
  const classSet = new Set();

  sortedEntries.forEach((item) => {
    const period = normalizeText(item.period);
    const classKey = createClassKey(item.className, item.section);
    const classLabel = formatClassLabel(item.className, item.section);
    const time = normalizeText(item.time);

    if (period && !periodMap.has(period)) {
      periodMap.set(period, {
        key: period,
        label: period,
        time,
      });
    }

    if (classKey && classLabel && !classSet.has(classKey)) {
      classSet.add(classKey);
      classes.push({ key: classKey, label: classLabel });
    }
  });

  const periodHeaders = [...periodMap.values()];
  classes.sort((left, right) => compareClassKeys(right.key, left.key));

  const rows = classes.map((classItem) => ({
    classLabel: classItem.label,
    periods: periodHeaders.map((periodItem) => {
      const matchedEntries = sortedEntries.filter(
        (item) =>
          createClassKey(item.className, item.section) === classItem.key
          && normalizeText(item.period) === periodItem.key
      );

      if (matchedEntries.length === 0) {
        return '-';
      }

      return matchedEntries
        .map((item) => {
          const teacherName = normalizeText(item.teacher) || 'Unassigned';
          const subjectName = normalizeText(item.subject) || '-';
          return `${teacherName} | ${subjectName}`;
        })
        .join('\n');
    }),
  }));

  return { periods: periodHeaders, rows };
}

function buildAllTeachersPrintMatrix(entries) {
  const sortedEntries = sortTimetableEntries(entries);
  const periods = [];
  const teachers = [];
  const periodMap = new Map();
  const teacherSet = new Set();

  sortedEntries.forEach((item) => {
    const period = normalizeText(item.period);
    const teacher = normalizeText(item.teacher) || 'Unassigned';
    const time = normalizeText(item.time);

    if (period && !periodMap.has(period)) {
      periodMap.set(period, {
        key: period,
        label: period,
        time,
      });
    }

    if (!teacherSet.has(teacher)) {
      teacherSet.add(teacher);
      teachers.push(teacher);
    }
  });

  const periodHeaders = [...periodMap.values()];

  const rows = teachers.map((teacher) => ({
    teacher,
    periods: periodHeaders.map((periodItem) => {
      const matchedEntries = sortedEntries.filter(
        (item) => (normalizeText(item.teacher) || 'Unassigned') === teacher && normalizeText(item.period) === periodItem.key
      );

      if (matchedEntries.length === 0) {
        return '-';
      }

      return matchedEntries
        .map((item) => {
          const classLabel = formatClassLabel(item.className, item.section);
          const subject = item.subject || '-';
          return `${classLabel} | ${subject}`;
        })
        .join('\n');
    }),
  }));

  return { periods: periodHeaders, rows };
}

function formatPeriodLabel(index) {
  return String(index + 1).padStart(2, '0');
}

const PERIOD_SLOT_OPTIONS = [
  '01',
  '02',
  '03',
  'Break',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
];

const TEACHER_PERIOD_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TEACHER_SUBJECT_OPTIONS = [
  'English',
  'Urdu',
  'Islamiat',
  'Tarjama Tul Quran',
  'Pakistan Studies',
  'Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Geography',
  'Agriculture',
  'Drawing',
  'Arabic',
  'General Science',
];
const SENIOR_ONLY_SUBJECTS = new Set(['Physics', 'Chemistry', 'Biology']);
const SENIOR_COMMON_SUBJECTS = [
  'English',
  'Urdu',
  'Mathematics',
  'Tarjuma Tul Quran Majeed / Ethics',
  'Islamiat',
];
const SENIOR_GROUP_OPTIONS = ['Science Group', 'Arts Group', 'Tech Group'];

function SearchableDropdown({ value, options, onChange, placeholder, allowCustom = false }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const selectOption = (option) => {
    onChange(option);
    setSearchTerm(option);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!isOpen || filteredOptions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((current) => (current + 1) % filteredOptions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredOptions[focusedIndex]) {
        selectOption(filteredOptions[focusedIndex]);
      } else if (allowCustom && searchTerm.trim()) {
        selectOption(searchTerm.trim());
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm(value || '');
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onFocus={() => {
          setSearchTerm('');
          setFocusedIndex(0);
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (allowCustom && searchTerm.trim()) {
              onChange(searchTerm.trim());
            }
            setIsOpen(false);
            setSearchTerm(allowCustom && searchTerm.trim() ? searchTerm.trim() : value || '');
          }, 100);
        }}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setFocusedIndex(0);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => selectOption(option)}
              className={`block w-full px-3 py-2 text-left text-sm ${
                index === focusedIndex ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              {option}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-slate-500">
              {allowCustom ? 'Press Enter to use this optional subject' : 'No subjects found'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function createEmptyPeriodSlot(period = '') {
  return {
    period,
    startTime: '',
    endTime: '',
  };
}

function createInitialPeriodSlots() {
  return [createEmptyPeriodSlot()];
}

function isSeniorClass(className) {
  const normalizedClassName = normalizeText(className);
  return normalizedClassName === '9' || normalizedClassName === '10';
}

function getNumericClass(className) {
  const match = normalizeText(className).match(/\d+/);
  return match ? Number(match[0]) : null;
}

export default function TimeTableManagementPage() {
  const { permissions } = useAuth();
  const canDeleteTimetable = hasPermission(permissions, 'TIMETABLE_DELETE');
  const [activeMainTab, setActiveMainTab] = useState('class');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [timetables, setTimetables] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPeriodSlotModal, setShowPeriodSlotModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState('');
  const [editMode, setEditMode] = useState('edit');
  const [editFormData, setEditFormData] = useState({
    period: '',
    time: '',
    subject: '',
    teacher: '',
    classKey: '',
    subjectGroup: '',
    teacherClassName: '',
    teacherSection: '',
  });
  const [printPreviewData, setPrintPreviewData] = useState(null);
  const [printType, setPrintType] = useState('');
  const [printClassKey, setPrintClassKey] = useState('');
  const [printTeacher, setPrintTeacher] = useState('');
  const [periodSlots, setPeriodSlots] = useState(createInitialPeriodSlots());

  const loadClassesForTeacherForm = useCallback(async () => {
    try {
      const classesResult = await classService.getAll();
      setClasses(Array.isArray(classesResult?.data) ? classesResult.data : []);
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to load classes', 'error');
      return false;
    }
  }, []);

  const loadTimetableData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [timetableResult, teacherResult] = await Promise.all([
        apiRequest('/timetables'),
        apiRequest('/teachers').catch(() => null),
      ]);

      const nextTimetables = Array.isArray(timetableResult?.timetables)
        ? timetableResult.timetables.map(normalizeTimetableItem)
        : [];
      const nextTeachers = Array.isArray(teacherResult?.teachers) ? teacherResult.teachers : [];

      setTimetables(nextTimetables);
      setTeachers(nextTeachers);
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to load timetable data', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetableData();
    loadClassesForTeacherForm();
  }, [loadClassesForTeacherForm, loadTimetableData]);

  const classOptions = useMemo(() => {
    const optionsMap = new Map();

    classes.forEach((classItem) => {
      const key = createClassKey(classItem?.name, classItem?.section);
      if (!key || key === '::') {
        return;
      }

      optionsMap.set(key, {
        value: key,
        label: formatClassLabel(classItem?.name, classItem?.section),
      });
    });

    return [...optionsMap.values()].sort((left, right) => compareClassKeys(left.value, right.value));
  }, [classes]);

  const classFilterOptions = useMemo(() => {
    return [{ value: ALL_CLASSES_KEY, label: 'All Classes' }, ...classOptions];
  }, [classOptions]);

  const teacherClassOptions = useMemo(() => {
    return classOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [classOptions]);

  const availableTeacherSubjectOptions = useMemo(() => {
    const seniorClassSelected = isSeniorClass(editFormData.teacherClassName);
    return TEACHER_SUBJECT_OPTIONS.filter(
      (subjectOption) => seniorClassSelected || !SENIOR_ONLY_SUBJECTS.has(subjectOption)
    );
  }, [editFormData.teacherClassName]);

  const selectedClassName = parseClassKey(editFormData.classKey).className;
  const selectedClassNumber = getNumericClass(selectedClassName);
  const allowsOptionalSubject = (
    selectedClassNumber >= 6 && selectedClassNumber <= 8
  ) || (
    (selectedClassNumber === 9 || selectedClassNumber === 10) && Boolean(editFormData.subjectGroup)
  );
  const classSubjectOptions = useMemo(() => {
    let configuredSubjects;
    if (selectedClassNumber >= 1 && selectedClassNumber <= 8) {
      configuredSubjects = getSubjectsByClass(selectedClassName).filter(
        (subject) => !subject.startsWith('Optional Subject')
      );
    } else if (selectedClassNumber === 9 || selectedClassNumber === 10) {
      const groupSubjects = editFormData.subjectGroup === 'Tech Group'
        ? ['Chemistry Tech', 'Physics Tech']
        : editFormData.subjectGroup
          ? ['Chemistry', 'Physics']
          : [];
      configuredSubjects = [...SENIOR_COMMON_SUBJECTS, ...groupSubjects];
    } else {
      configuredSubjects = TEACHER_SUBJECT_OPTIONS;
    }

    if (!allowsOptionalSubject) return configuredSubjects;

    const { className, section } = parseClassKey(editFormData.classKey);
    const savedOptionalSubjects = timetables
      .filter((item) => item.className === className && item.section === section)
      .map((item) => item.subject)
      .filter(Boolean);
    return [...new Set([...configuredSubjects, ...savedOptionalSubjects])];
  }, [allowsOptionalSubject, editFormData.classKey, editFormData.subjectGroup, selectedClassName, selectedClassNumber, timetables]);

  const teacherOptions = useMemo(() => {
    const optionsMap = new Map();

    teachers.forEach((teacher) => {
      const teacherName = normalizeText(teacher?.personalInfo?.name);
      if (teacherName) {
        optionsMap.set(teacherName, { value: teacherName, label: teacherName });
      }
    });

    timetables.forEach((item) => {
      if (item.teacher) {
        optionsMap.set(item.teacher, { value: item.teacher, label: item.teacher });
      }
    });

    return [...optionsMap.values()].sort((left, right) => left.label.localeCompare(right.label));
  }, [teachers, timetables]);

  const printTeacherOptions = useMemo(() => {
    return [{ value: ALL_TEACHERS_KEY, label: 'All Teachers' }, ...teacherOptions];
  }, [teacherOptions]);

  useEffect(() => {
    if (!selectedClassKey && classOptions.length > 0) {
      setSelectedClassKey(classOptions[0].value);
    }
  }, [classOptions, selectedClassKey]);

  useEffect(() => {
    if (
      selectedClassKey
      && selectedClassKey !== ALL_CLASSES_KEY
      && !classOptions.some((option) => option.value === selectedClassKey)
    ) {
      setSelectedClassKey(classOptions[0]?.value || '');
    }
  }, [classOptions, selectedClassKey]);

  useEffect(() => {
    if (selectedTeacher && !teacherOptions.some((option) => option.value === selectedTeacher)) {
      setSelectedTeacher('');
    }
  }, [selectedTeacher, teacherOptions]);

  useEffect(() => {
    if (!printClassKey && classOptions.length > 0) {
      setPrintClassKey(classOptions[0].value);
    }
  }, [classOptions, printClassKey]);

  useEffect(() => {
    if (showEditModal && editingType === 'teacher') {
      loadClassesForTeacherForm();
    }
  }, [editingType, loadClassesForTeacherForm, showEditModal]);

  const currentClassTimeTable = useMemo(() => {
    return getClassEntriesByKey(timetables, selectedClassKey);
  }, [selectedClassKey, timetables]);

  const currentTeacherTimeTable = useMemo(() => {
    return getTeacherEntries(timetables, selectedTeacher);
  }, [selectedTeacher, timetables]);

  const generalTimeTable = useMemo(() => {
    return getGeneralEntries(timetables);
  }, [timetables]);

  const generalPeriodTimeMap = useMemo(() => {
    const entries = new Map();

    getGeneralEntries(timetables).forEach((item) => {
      const periodKey = normalizePeriodKey(item.period);
      if (periodKey && item.time) {
        entries.set(periodKey, item.time);
      }
    });

    return entries;
  }, [timetables]);

  const generalPeriodOptions = useMemo(() => {
    return [...new Set(
      getGeneralEntries(timetables)
        .map((item) => normalizeText(item.period))
        .filter((period) => period && period.toLowerCase() !== 'break')
    )].sort((left, right) => getPeriodRank(left) - getPeriodRank(right));
  }, [timetables]);

  const handleRefresh = useCallback(async () => {
    const [didRefresh, didRefreshClasses] = await Promise.all([
      loadTimetableData(),
      loadClassesForTeacherForm(),
    ]);
    if (didRefresh || didRefreshClasses) {
      showToast('Timetable data refreshed successfully', 'success');
    }
  }, [loadClassesForTeacherForm, loadTimetableData]);

  const handleTeacherPeriodChange = useCallback(
    (period) => {
      setEditFormData((prev) => ({
        ...prev,
        period,
        time: generalPeriodTimeMap.get(normalizePeriodKey(period)) || '',
      }));
    },
    [generalPeriodTimeMap]
  );

  const handleClassPeriodChange = useCallback(
    (period) => {
      setEditFormData((prev) => ({
        ...prev,
        period,
        time: generalPeriodTimeMap.get(normalizePeriodKey(period)) || '',
      }));
    },
    [generalPeriodTimeMap]
  );

  const openValidationModal = useCallback((message) => {
    setValidationMessage(message);
    setShowValidationModal(true);
  }, []);

  const openPeriodSlotModal = useCallback(() => {
    const existingGeneralSlots = getGeneralEntries(timetables).map((item) => ({
      period: item.period,
      startTime: extractStartTime(item.time),
      endTime: extractEndTime(item.time),
    }));

    setPeriodSlots(existingGeneralSlots.length > 0 ? existingGeneralSlots : createInitialPeriodSlots());
    setShowPeriodSlotModal(true);
  }, [timetables]);

  const handlePeriodSlotFieldChange = useCallback((index, field, value) => {
    setPeriodSlots((currentSlots) => {
      const nextSlots = currentSlots.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: value,
            }
          : slot
      );

      if (
        field === 'period' &&
        value &&
        index === nextSlots.length - 1 &&
        nextSlots.length < PERIOD_SLOT_OPTIONS.length
      ) {
        nextSlots.push(createEmptyPeriodSlot());
      }

      return nextSlots;
    });
  }, []);

  const handleDeletePeriodSlot = useCallback((index) => {
    setPeriodSlots((currentSlots) => {
      const nextSlots = currentSlots.filter((_, slotIndex) => slotIndex !== index);
      return nextSlots.length > 0 ? nextSlots : createInitialPeriodSlots();
    });
  }, []);

  const handleSavePeriodSlots = useCallback(async () => {
    const filledSlots = periodSlots.filter((slot) => slot.period || slot.startTime || slot.endTime);

    if (filledSlots.length === 0) {
      showToast('Please add at least one period time slot', 'warning');
      return;
    }

    const incompleteSlot = filledSlots.find((slot) => !slot.period || !slot.startTime || !slot.endTime);
    if (incompleteSlot) {
      showToast('Please complete period, start time, and end time for every added slot', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      const existingGeneralEntries = getGeneralEntries(timetables);
      const filledPeriodSet = new Set(filledSlots.map((slot) => slot.period));

      await Promise.all(
        filledSlots.map((slot) => {
          const payload = {
            scope: 'general',
            period: slot.period,
            time: `${slot.startTime} - ${slot.endTime}`,
            subject: '',
            teacher: '',
            className: '',
            section: '',
            day: '',
          };

          const existingEntry = existingGeneralEntries.find((entry) => entry.period === slot.period);

          if (existingEntry?._id) {
            return apiRequest(`/timetables/${existingEntry._id}`, {
              method: 'PUT',
              data: payload,
            });
          }

          return apiRequest('/timetables/createTimetable', {
            method: 'POST',
            data: payload,
          });
        })
      );

      const generalEntriesToDelete = existingGeneralEntries.filter(
        (entry) => entry._id && !filledPeriodSet.has(entry.period)
      );

      if (generalEntriesToDelete.length > 0) {
        await Promise.all(
          generalEntriesToDelete.map((entry) =>
            apiRequest(`/timetables/${entry._id}`, {
              method: 'DELETE',
            })
          )
        );
      }

      setShowPeriodSlotModal(false);
      await loadTimetableData();
      showToast('Period time slots saved successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save period time slots', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [loadTimetableData, periodSlots, timetables]);

  const openCreateModal = useCallback(
    (type) => {
      setEditMode('create');
      setEditingType(type);
      setEditingItem(null);

      const defaultClassKey = selectedClassKey || classOptions[0]?.value || '';
      const defaultTeacherClass = type === 'teacher' ? parseClassKey(defaultClassKey).className : '';
      const defaultTeacherSection = type === 'teacher' ? parseClassKey(defaultClassKey).section : '';
      const defaultTeacher = selectedTeacher || teacherOptions[0]?.value || '';

      setEditFormData({
        period: '',
        time: '',
        subject: '',
        teacher: type === 'teacher' ? defaultTeacher : '',
        classKey: type === 'general' ? '' : defaultClassKey,
        subjectGroup: '',
        teacherClassName: defaultTeacherClass,
        teacherSection: defaultTeacherSection,
      });
      setShowEditModal(true);
    },
    [classOptions, selectedClassKey, selectedTeacher, teacherOptions]
  );

  const handleEdit = useCallback((item, type) => {
    setEditMode('edit');
    setEditingType(type);
    setEditingItem(item);
    setEditFormData(buildEditFormData(item, type));
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback(
    (itemId) => {
      if (!canDeleteTimetable) {
        showToast('You do not have permission to delete timetable entries.', 'error');
        return;
      }
      if (!itemId) {
        return;
      }

      setDeleteTargetId(itemId);
      setShowDeleteModal(true);
    },
    [canDeleteTimetable]
  );

  const confirmDelete = useCallback(
    async () => {
      if (!canDeleteTimetable) {
        showToast('You do not have permission to delete timetable entries.', 'error');
        return;
      }
      if (!deleteTargetId) {
        return;
      }

      try {
        await apiRequest(`/timetables/${deleteTargetId}`, {
          method: 'DELETE',
          successMessage: 'Timetable entry deleted successfully',
        });
        setShowDeleteModal(false);
        setDeleteTargetId('');
        await loadTimetableData();
      } catch (error) {
        showToast(error.message || 'Failed to delete timetable entry', 'error');
      }
    },
    [canDeleteTimetable, deleteTargetId, loadTimetableData]
  );

  const handleSaveEdit = useCallback(async () => {
    const payload = buildTimetablePayload(editingType, editFormData);

    if (!payload.period || !payload.time) {
      showToast('Period and time are required', 'warning');
      return;
    }

    if (editingType === 'class' && !payload.className) {
      showToast('Please select a class', 'warning');
      return;
    }

    if (editingType === 'class' && !payload.subject) {
      showToast('Please select or enter a subject', 'warning');
      return;
    }

    const classNumber = getNumericClass(payload.className);
    if (
      editingType === 'class'
      && (classNumber === 9 || classNumber === 10)
      && !editFormData.subjectGroup
    ) {
      showToast('Please select a category for class 9 or 10', 'warning');
      return;
    }

    if (editingType === 'teacher' && !payload.teacher) {
      showToast('Please select a teacher', 'warning');
      return;
    }

    if (editingType === 'teacher') {
      if (!payload.className || !payload.section) {
        showToast('Please select a class and section', 'warning');
        return;
      }

      if (!payload.subject) {
        showToast('Please enter a subject', 'warning');
        return;
      }

      if (SENIOR_ONLY_SUBJECTS.has(payload.subject) && !isSeniorClass(payload.className)) {
        openValidationModal(`${payload.subject} is only allowed for class 9 and 10.`);
        return;
      }

      const conflictingEntry = getTeacherEntries(timetables, payload.teacher).find(
        (item) => item._id !== editingItem?._id && normalizeText(item.period) === normalizeText(payload.period)
      );

      if (conflictingEntry) {
        openValidationModal(
          `Proid No. ${payload.period} is not allowed because it is already the period ${payload.period} is allowed`
        );
        return;
      }

      const duplicateTeacherSubjectClassEntry = getTeacherEntries(timetables, payload.teacher).find(
        (item) =>
          item._id !== editingItem?._id
          && normalizeText(item.className) === normalizeText(payload.className)
          && normalizeText(item.section) === normalizeText(payload.section)
          && normalizeText(item.subject) === normalizeText(payload.subject)
      );

      if (duplicateTeacherSubjectClassEntry) {
        openValidationModal(
          `${payload.teacher} is already assigned ${payload.subject} for ${formatClassLabel(payload.className, payload.section)}.`
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editMode === 'create') {
        await apiRequest('/timetables/createTimetable', {
          method: 'POST',
          data: payload,
          successMessage: 'Timetable entry created successfully',
        });
      } else if (editingItem?._id) {
        await apiRequest(`/timetables/${editingItem._id}`, {
          method: 'PUT',
          data: payload,
          successMessage: 'Timetable entry updated successfully',
        });
      }

      setShowEditModal(false);
      await loadTimetableData();
    } catch (error) {
      showToast(error.message || 'Failed to save timetable entry', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [editFormData, editMode, editingItem, editingType, loadTimetableData, openValidationModal, timetables]);

  useEffect(() => {
    if (editingType !== 'teacher' || !showEditModal) {
      return;
    }

    const matchedTime = generalPeriodTimeMap.get(normalizePeriodKey(editFormData.period)) || '';
    if (editFormData.time !== matchedTime) {
      setEditFormData((prev) => ({
        ...prev,
        time: generalPeriodTimeMap.get(normalizePeriodKey(prev.period)) || '',
      }));
    }
  }, [editFormData.period, editFormData.time, editingType, generalPeriodTimeMap, showEditModal]);

  useEffect(() => {
    if (editingType !== 'teacher' || !showEditModal) {
      return;
    }

    if (editFormData.subject && !availableTeacherSubjectOptions.includes(editFormData.subject)) {
      setEditFormData((prev) => ({
        ...prev,
        subject: '',
      }));
    }
  }, [availableTeacherSubjectOptions, editFormData.subject, editingType, showEditModal]);

  const generatePrintPreview = useCallback(
    (type, value) => {
      let data = null;
      let title = '';

      if (type === 'class') {
        const option = classFilterOptions.find((item) => item.value === value);
        data = {
          type: 'class',
          name: option?.label || 'Class Timetable',
          table: getClassEntriesByKey(timetables, value),
        };
        title = option?.label ? `Class Time Table - ${option.label}` : 'Class Time Table';
      } else if (type === 'teacher') {
        const isAllTeachers = value === ALL_TEACHERS_KEY;
        data = {
          type: 'teacher',
          name: isAllTeachers ? 'All Teachers' : value,
          table: isAllTeachers ? getAllTeacherEntries(timetables) : getTeacherEntries(timetables, value),
        };
        title = isAllTeachers ? 'Teacher Time Table - All Teachers' : `Teacher Time Table - ${value}`;
      } else {
        data = {
          type: 'general',
          name: 'General Time Table',
          table: getGeneralEntries(timetables),
        };
        title = 'School General Time Table';
      }

      setPrintPreviewData({ data, title });
      return { data, title };
    },
    [classFilterOptions, timetables]
  );

  const handlePrintFinal = useCallback((previewOverride = null) => {
    const preview = previewOverride || printPreviewData;

    if (!preview) {
      showToast('No data available to print', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow pop-ups to print', 'error');
      return;
    }

    const { data, title } = preview;
    const generatedDate = new Date();
    const isAllClassesReport = data.type === 'class' && data.name === 'All Classes';
    const isAllTeachersReport = data.type === 'teacher' && data.name === 'All Teachers';
    const isWideMatrixReport = isAllClassesReport || isAllTeachersReport;
    const pageSize = isWideMatrixReport ? '13in 8.5in' : 'Letter portrait';
    const pageMargin = isWideMatrixReport ? '0.5in 0.25in' : '0.5in';
    const pageWidth = isWideMatrixReport ? '13in' : '8.5in';
    const pageHeight = isWideMatrixReport ? '8.5in' : '11in';
    let headerMarkup = '';
    let rowMarkup = '';

    if (isAllClassesReport) {
      const matrix = buildAllClassesPrintMatrix(data.table);
      headerMarkup = `<th>Class</th>${matrix.periods
        .map(
          (period) =>
            `<th class="matrix-period-column">${escapeHtml(period.label)}<br><span class="period-time">${escapeHtml(
              period.time || '-'
            )}</span></th>`
        )
        .join('')}`;
      rowMarkup = matrix.rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.classLabel)}</td>
            ${row.periods
              .map(
                (cell) =>
                  `<td>${escapeHtml(cell).replace(/\n/g, '<br>')}</td>`
              )
              .join('')}
          </tr>`
        )
        .join('');
    } else if (isAllTeachersReport) {
      const matrix = buildAllTeachersPrintMatrix(data.table);
      headerMarkup = `<th>Teacher</th>${matrix.periods
        .map(
          (period) =>
            `<th class="matrix-period-column">${escapeHtml(period.label)}<br><span class="period-time">${escapeHtml(
              period.time || '-'
            )}</span></th>`
        )
        .join('')}`;
      rowMarkup = matrix.rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.teacher)}</td>
            ${row.periods
              .map(
                (cell) =>
                  `<td>${escapeHtml(cell).replace(/\n/g, '<br>')}</td>`
              )
              .join('')}
          </tr>`
        )
        .join('');
    } else {
      headerMarkup =
        data.type === 'class'
          ? '<th>Period</th><th>Time</th><th>Subject</th><th>Teacher</th>'
          : data.type === 'teacher'
            ? '<th>Period</th><th>Class</th><th>Time</th><th>Subject</th>'
            : '<th>Period</th><th>Time</th>';
      rowMarkup = data.table
        .map((row) => {
          if (data.type === 'class') {
            return `<tr><td class="center-column">${escapeHtml(row.period)}</td><td class="center-column">${escapeHtml(
              row.time
            )}</td><td class="center-column">${escapeHtml(row.subject || '-')}</td><td>${escapeHtml(
              row.teacher || '-'
            )}</td></tr>`;
          }

          if (data.type === 'teacher') {
            return `<tr><td class="center-column">${escapeHtml(row.period)}</td><td class="center-column">${escapeHtml(
              formatTeacherEntryClassLabel(row)
            )}</td><td class="center-column">${escapeHtml(row.time)}</td><td>${escapeHtml(row.subject || '-')}</td></tr>`;
          }

          return `<tr><td>${escapeHtml(row.period)}</td><td>${escapeHtml(row.time)}</td></tr>`;
        })
        .join('');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: ${pageSize}; margin: ${pageMargin}; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 32px; color: #000000; background: #ffffff; }
          .container { max-width: 1100px; margin: 0 auto; }
          .header { margin-bottom: 20px; }
          .school-name { font-size: 30px; font-weight: 800; text-align: center; margin-bottom: 10px; color: #000000; }
          .header.report-with-school-name h1 { text-align: center; }
          .header.report-with-school-name .meta { text-align: center; }
          .header h1 { font-size: 24px; margin-bottom: 6px; color: #000000; font-weight: 700; }
          .meta { font-size: 14px; color: #000000; }
          table { width: 100%; border-collapse: collapse; border: 1px solid #000000; table-layout: ${isWideMatrixReport ? 'fixed' : 'auto'}; }
          th, td { border: 1px solid #000000; padding: 10px 12px; text-align: left; font-size: 14px; color: #000000; vertical-align: top; }
          th { background: #ffffff; font-weight: 700; }
          tbody tr { background: #ffffff; }
          .all-classes-report th, .all-classes-report td { font-size: 12px; white-space: normal; word-break: break-word; }
          .all-classes-report th:first-child, .all-classes-report td:first-child { width: 130px; }
          .all-classes-report .matrix-period-column { text-align: center; }
          .all-classes-report .period-time { display: inline-block; margin-top: 4px; font-size: 10px; font-weight: 600; }
          .all-teachers-report th, .all-teachers-report td { font-size: 12px; white-space: normal; word-break: break-word; }
          .all-teachers-report th { background: #000000; color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .all-teachers-report th:first-child, .all-teachers-report td:first-child { width: 160px; }
          .all-teachers-report .matrix-period-column { text-align: center; }
          .class-single-report .center-column { text-align: center; }
          .teacher-single-report .center-column { text-align: center; }
          @media print {
             html, body { width: ${pageWidth}; min-height: ${pageHeight}; }
             body { padding: 0; }
           }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header ${data.type === 'teacher' || data.type === 'class' ? 'report-with-school-name' : ''}">
            ${data.type === 'teacher' || data.type === 'class' ? '<div class="school-name">Govt. Model Secondary School Liaqatpur</div>' : ''}
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">Generated on ${generatedDate.toLocaleDateString('en-PK')} at ${generatedDate.toLocaleTimeString('en-PK')}</div>
          </div>
          <table class="${isAllClassesReport ? 'all-classes-report' : isAllTeachersReport ? 'all-teachers-report' : data.type === 'teacher' ? 'teacher-single-report' : data.type === 'class' ? 'class-single-report' : ''}">
            <thead>
              <tr>
                ${
                  data.type === 'teacher' && !isAllTeachersReport
                    ? '<th class="center-column">Period</th><th class="center-column">Class</th><th class="center-column">Time</th><th>Subject</th>'
                    : data.type === 'class' && !isAllClassesReport
                      ? '<th class="center-column">Period</th><th class="center-column">Time</th><th class="center-column">Subject</th><th>Teacher</th>'
                    : headerMarkup
                }
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
  }, [printPreviewData]);

  const handleShareWhatsApp = useCallback(() => {
    if (!printPreviewData) {
      showToast('Please generate a preview before sharing', 'warning');
      return;
    }

    const { data, title } = printPreviewData;
    let message = `${title}\n`;
    message += `${new Date().toLocaleDateString('en-PK')} ${new Date().toLocaleTimeString('en-PK')}\n\n`;

    data.table.forEach((row) => {
      if (data.type === 'class') {
        message += `${row.period} | ${row.time} | ${row.subject || '-'} | ${row.teacher || '-'}\n`;
      } else if (data.type === 'teacher') {
        message += `${
          data.name === 'All Teachers' ? `${row.teacher || '-'} | ` : ''
        }${row.period} | ${formatTeacherEntryClassLabel(row)} | ${row.time} | ${row.subject || '-'}\n`;
      } else {
        message += `${row.period} | ${row.time}\n`;
      }
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    showToast('Opening WhatsApp with timetable details', 'success');
  }, [printPreviewData]);

  const tableEmptyState =
    activeMainTab === 'class'
      ? selectedClassKey === ALL_CLASSES_KEY
        ? 'No timetable entries found for any class.'
        : 'No timetable entries found for this class.'
      : activeMainTab === 'teacher'
        ? 'No timetable entries found for this teacher.'
        : 'No general timetable entries found.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-2xl border border-white/20 bg-gradient-to-r from-blue-700/90 to-emerald-600/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">School Time Table Management</h1>              
            </div>
            <div className="flex w-full flex-row gap-3 text-base sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center">
              <Button
                onClick={openPeriodSlotModal}
                className="whitespace-nowrap rounded-lg !bg-white px-3 py-2 text-xs !text-blue-600 hover:!bg-blue-50 sm:px-4 sm:text-sm"
              >
                + Add Period Time Slot
              </Button>
              <Button
                onClick={handleRefresh}
                className="whitespace-nowrap rounded-lg !bg-white px-3 py-2 text-xs !text-blue-600 hover:!bg-blue-50 sm:px-4 sm:text-sm"
              >
                Refresh Data
              </Button>
              <Button
                onClick={() => setShowPrintModal(true)}
                className="whitespace-nowrap rounded-lg !bg-white px-3 py-2 text-xs !text-blue-600 hover:!bg-blue-50 sm:px-4 sm:text-sm"
              >
                Print Time Table
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/40 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/50 bg-white/30">
            <div className="flex overflow-x-auto">
              {TAB_OPTIONS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`whitespace-nowrap px-6 py-4 text-sm font-medium transition-all duration-200 ${
                    activeMainTab === tab.id
                      ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50/50 hover:text-blue-600'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="rounded-xl bg-slate-50/70 py-16 text-center text-slate-500">
                Loading timetable data...
              </div>
            ) : (
              <>
                {activeMainTab === 'class' && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                      <div className="flex flex-wrap gap-3">
                        <select
                          value={selectedClassKey}
                          onChange={(event) => setSelectedClassKey(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-auto"
                        >
                          {classOptions.length === 0 && <option value="">No classes available</option>}
                          {classFilterOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={() => openCreateModal('class')}
                        disabled={!selectedClassKey || selectedClassKey === ALL_CLASSES_KEY}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 sm:w-auto"
                      >
                        Add Entry
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-[720px] w-full">
                        <thead className="bg-gradient-to-r from-blue-50 to-emerald-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-blue-800">Period</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-blue-800">Time</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-blue-800">Subject</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-blue-800">Teacher</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-blue-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentClassTimeTable.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                {tableEmptyState}
                              </td>
                            </tr>
                          ) : (
                            currentClassTimeTable.map((item) => (
                              <tr key={item._id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-black">{item.period}</td>
                                <td className="px-4 py-3 text-sm text-black">{item.time}</td>
                                <td className="px-4 py-3 text-sm text-black">{item.subject || '-'}</td>
                                <td className="px-4 py-3 text-sm text-black">{item.teacher || '-'}</td>
                                <td className="px-4 py-3 text-center text-sm">
                                  <button
                                    onClick={() => handleEdit(item, 'class')}
                                    className="mr-3 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800"
                                    title="Edit"
                                    aria-label="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item._id)}
                                    className="inline-flex items-center text-red-600 transition-colors hover:text-red-800"
                                    title="Delete"
                                    aria-label="Delete"
                                    disabled={!canDeleteTimetable}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeMainTab === 'teacher' && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                      <div className="flex flex-wrap gap-3">
                        <select
                          value={selectedTeacher}
                          onChange={(event) => setSelectedTeacher(event.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 sm:w-auto"
                        >
                          <option value="">Select Teacher</option>
                          {teacherOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={() => openCreateModal('teacher')}
                        disabled={!selectedTeacher}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 sm:w-auto"
                      >
                        Add Entry
                      </Button>
                    </div>

                    {selectedTeacher ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-[720px] w-full">
                          <thead className="bg-gradient-to-r from-blue-50 to-emerald-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-blue-800">Period</th>
                              <th className="px-4 py-3 text-left font-semibold text-blue-800">Class</th>
                              <th className="px-4 py-3 text-left font-semibold text-blue-800">Time</th>
                              <th className="px-4 py-3 text-left font-semibold text-blue-800">Subject</th>
                              <th className="px-4 py-3 text-center font-semibold text-blue-800">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentTeacherTimeTable.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                  {tableEmptyState}
                                </td>
                              </tr>
                            ) : (
                              currentTeacherTimeTable.map((item) => (
                                <tr key={item._id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium">{item.period}</td>
                                  <td className="px-4 py-3">{formatTeacherEntryClassLabel(item)}</td>
                                  <td className="px-4 py-3">{item.time}</td>
                                  <td className="px-4 py-3">{item.subject || '-'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleEdit(item, 'teacher')}
                                      className="mr-3 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800"
                                      title="Edit"
                                      aria-label="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item._id)}
                                      className="inline-flex items-center text-red-600 transition-colors hover:text-red-800"
                                      title="Delete"
                                      aria-label="Delete"
                                      disabled={!canDeleteTimetable}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50/50 py-12 text-center">
                        <p className="text-lg text-slate-500">Please select a teacher to view their timetable.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeMainTab === 'general' && (
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <Button
                        onClick={() => openCreateModal('general')}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                      >
                        Add Entry
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-[520px] w-full">
                        <thead className="bg-gradient-to-r from-blue-50 to-emerald-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-blue-800">Period</th>
                            <th className="px-4 py-3 text-left font-semibold text-blue-800">Time</th>
                            <th className="px-4 py-3 text-center font-semibold text-blue-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generalTimeTable.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                                {tableEmptyState}
                              </td>
                            </tr>
                          ) : (
                            generalTimeTable.map((item) => (
                              <tr key={item._id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">{item.period}</td>
                                <td className="px-4 py-3">{item.time}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleEdit(item, 'general')}
                                    className="mr-3 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800"
                                    title="Edit"
                                    aria-label="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item._id)}
                                    className="inline-flex items-center text-red-600 transition-colors hover:text-red-800"
                                    title="Delete"
                                    aria-label="Delete"
                                    disabled={!canDeleteTimetable}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showPeriodSlotModal}
        onClose={() => setShowPeriodSlotModal(false)}
        title="Add Period Time Slots"
        size="md"
        headerClassName="rounded-t-lg border-b-0 bg-sky-600 text-white"
        titleClassName="text-white"
        closeButtonClassName="text-white/80 hover:text-white"
      >
        <div className="space-y-4">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 sm:max-h-72">
            {periodSlots.map((slot, index) => {
              const selectedPeriods = periodSlots
                .map((periodSlot, periodSlotIndex) => (periodSlotIndex === index ? '' : periodSlot.period))
                .filter(Boolean);
              const availablePeriodOptions = PERIOD_SLOT_OPTIONS.filter(
                (periodOption) => !selectedPeriods.includes(periodOption) || periodOption === slot.period
              );

              return (
              <div key={`${slot.period || 'empty'}-${index}`} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Period
                  </label>
                  <select
                    value={slot.period}
                    onChange={(event) => handlePeriodSlotFieldChange(index, 'period', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  >
                    <option value="">Select Period</option>
                    {availablePeriodOptions.map((periodOption) => (
                      <option key={periodOption} value={periodOption}>
                        {periodOption}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) => handlePeriodSlotFieldChange(index, 'startTime', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) => handlePeriodSlotFieldChange(index, 'endTime', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeletePeriodSlot(index)}
                      className="inline-flex items-center rounded-lg p-2 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete period slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setShowPeriodSlotModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSavePeriodSlots} disabled={isSaving} className="w-full bg-sky-600 text-white sm:w-auto">
              {isSaving ? 'Saving...' : 'Save Period Slots'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`${editMode === 'create' ? 'Add' : 'Edit'} ${
          editingType === 'class'
            ? 'Class Time Table Entry'
            : editingType === 'teacher'
              ? 'Teacher Time Table Entry'
              : 'General Time Table Entry'
        }`}
        size={editingType === 'teacher' ? 'lg' : 'md'}
        headerClassName="rounded-t-lg border-b-0 bg-blue-600 text-white"
        titleClassName="text-white"
        closeButtonClassName="text-white/80 hover:text-white"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Period</label>
            {editingType === 'teacher' ? (
              <select
                value={editFormData.period}
                onChange={(event) => handleTeacherPeriodChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select Period</option>
                {TEACHER_PERIOD_OPTIONS.map((periodOption) => (
                  <option key={periodOption} value={periodOption}>
                    {periodOption}
                  </option>
                ))}
              </select>
            ) : editingType === 'class' ? (
              <select
                value={editFormData.period}
                onChange={(event) => handleClassPeriodChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select Period</option>
                {generalPeriodOptions.map((periodOption) => (
                  <option key={periodOption} value={periodOption}>
                    {periodOption}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editFormData.period}
                onChange={(event) => setEditFormData((prev) => ({ ...prev, period: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. 1st Period"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
            <input
              type="text"
              value={editFormData.time}
              onChange={(event) => setEditFormData((prev) => ({ ...prev, time: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder={editingType === 'teacher' ? 'Select a period to fetch its saved time slot' : '08:00 AM - 08:45 AM'}
              readOnly={editingType === 'teacher'}
            />
          </div>

          {editingType !== 'general' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {editingType === 'teacher' ? 'Class' : 'Class'}
                </label>
                {editingType === 'teacher' ? (
                  <select
                    value={createClassKey(editFormData.teacherClassName, editFormData.teacherSection)}
                    onChange={(event) =>
                      {
                        const { className, section } = parseClassKey(event.target.value);
                        setEditFormData((prev) => ({
                          ...prev,
                          teacherClassName: className,
                          teacherSection: section,
                        }));
                      }
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select Class</option>
                    {teacherClassOptions.length === 0 && <option value="" disabled>No classes found</option>}
                    {teacherClassOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={editFormData.classKey}
                    onChange={(event) => setEditFormData((prev) => ({
                      ...prev,
                      classKey: event.target.value,
                      subjectGroup: '',
                      subject: '',
                    }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select Class</option>
                    {classOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {editingType === 'class' && (selectedClassNumber === 9 || selectedClassNumber === 10) && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                  <select
                    value={editFormData.subjectGroup}
                    onChange={(event) => setEditFormData((prev) => ({
                      ...prev,
                      subjectGroup: event.target.value,
                      subject: '',
                    }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select Category</option>
                    {SENIOR_GROUP_OPTIONS.map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                {editingType === 'teacher' ? (
                  <select
                    value={editFormData.subject}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, subject: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select Subject</option>
                    {availableTeacherSubjectOptions.map((subjectOption) => (
                      <option key={subjectOption} value={subjectOption}>
                        {subjectOption}
                      </option>
                    ))}
                  </select>
                ) : (
                  <SearchableDropdown
                    key={`${editMode}-${editingItem?._id || 'new'}-${editFormData.classKey}-${editFormData.subjectGroup}`}
                    value={editFormData.subject}
                    options={classSubjectOptions}
                    onChange={(subject) => setEditFormData((prev) => ({ ...prev, subject }))}
                    placeholder={
                      (selectedClassNumber === 9 || selectedClassNumber === 10) && !editFormData.subjectGroup
                        ? 'Select category first'
                        : allowsOptionalSubject
                          ? 'Select or write optional subject'
                          : 'Search subject'
                    }
                    allowCustom={allowsOptionalSubject}
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Teacher</label>
                {editingType === 'class' ? (
                  <SearchableDropdown
                    key={`teacher-${editMode}-${editingItem?._id || 'new'}`}
                    value={editFormData.teacher}
                    options={teacherOptions.map((option) => option.label)}
                    onChange={(teacher) => setEditFormData((prev) => ({ ...prev, teacher }))}
                    placeholder="Search teacher"
                  />
                ) : (
                  <select
                    value={editFormData.teacher}
                    onChange={(event) => setEditFormData((prev) => ({ ...prev, teacher: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select Teacher</option>
                    {teacherOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="w-full bg-blue-600 text-white sm:w-auto">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="Period Not Allowed"
        size="sm"
        headerClassName="rounded-t-lg border-b-0 bg-rose-600 text-white"
        titleClassName="text-white"
        closeButtonClassName="text-white/80 hover:text-white"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">{validationMessage}</p>
          <div className="flex justify-end border-t pt-4">
            <Button onClick={() => setShowValidationModal(false)} className="bg-rose-600 text-white">
              OK
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTargetId('');
        }}
        title="Delete Entry"
        size="sm"
        headerClassName="rounded-t-lg border-b-0 bg-amber-500 text-white"
        titleClassName="text-white"
        closeButtonClassName="text-white/80 hover:text-white"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">Are you sure you want to delete this entry?</p>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteTargetId('');
              }}
              className="w-full sm:w-auto"
            >
              No
            </Button>
            <Button onClick={confirmDelete} disabled={!canDeleteTimetable} className="w-full bg-rose-600 text-white sm:w-auto">
              Yes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Print Time Table"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Select Time Table Type</label>
            <select
              value={printType}
              onChange={(event) => setPrintType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select Type</option>
              <option value="class">Class Wise</option>
              <option value="teacher">Teacher Wise</option>
              <option value="general">General Time Table</option>
            </select>
          </div>

          {printType === 'class' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Select Class</label>
              <select
                value={printClassKey}
                onChange={(event) => setPrintClassKey(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {classFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {printType === 'teacher' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Select Teacher</label>
              <select
                value={printTeacher}
                onChange={(event) => setPrintTeacher(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select Teacher</option>
                {printTeacherOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setShowPrintModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!printType) {
                  showToast('Please select a time table type', 'warning');
                  return;
                }

                if (printType === 'class') {
                  setSelectedClassKey(printClassKey);
                  const preview = generatePrintPreview('class', printClassKey);
                  setShowPrintModal(false);
                  setTimeout(() => handlePrintFinal(preview), 100);
                } else if (printType === 'teacher') {
                  if (!printTeacher) {
                    showToast('Please select a teacher', 'warning');
                    return;
                  }

                  if (printTeacher !== ALL_TEACHERS_KEY) {
                    setSelectedTeacher(printTeacher);
                  }
                  const preview = generatePrintPreview('teacher', printTeacher);
                  setShowPrintModal(false);
                  setTimeout(() => handlePrintFinal(preview), 100);
                } else {
                  const preview = generatePrintPreview('general');
                  setShowPrintModal(false);
                  setTimeout(() => handlePrintFinal(preview), 100);
                }
              }}
              className="w-full bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto"
            >
              Generate Preview & Print
            </Button>
          </div>
        </div>
      </Modal>

      {printPreviewData && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleShareWhatsApp}
            className="rounded-full bg-green-600 p-4 text-white shadow-lg transition-all hover:scale-105 hover:bg-green-700"
            title="Share via WhatsApp"
          >
            Share
          </Button>
        </div>
      )}
    </div>
  );
}
