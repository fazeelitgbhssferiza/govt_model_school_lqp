'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../authservice/useAuth';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import FingerprintScanner from '../../attendance/components/FingerprintScanner';
import FaceRecognition from '../../attendance/components/FaceRecognition';
import { showToast } from '../../../utils/helpers';
import classService from '../../../services/classService';
import teacherService from '../../../services/teacherService';

// Constants
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CLASS_OPTIONS = [
  'Pre-Nursery', 'ECCE', 'Prep', 'One', 'Two', 'Three', 'Four', 
  'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'
];

const PERIOD_OPTIONS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

const SUBJECT_OPTIONS = [
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

const ACADEMIC_QUALIFICATIONS = [
  { value: '', label: 'Select Qualification' },
  { value: 'Matric', label: 'Matriculation' },
  { value: 'F.A/FSC', label: 'Intermediate (F.A/F.Sc)' },
  { value: 'B.A/BSc', label: 'Bachelor (B.A/B.Sc)' },
  { value: 'BS', label: 'Bachelor of Science (BS)' },
  { value: 'Masters', label: 'Master\'s Degree' },
  { value: 'M.Phil', label: 'M.Phil' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Others', label: 'Others' }
];

const PROFESSIONAL_QUALIFICATIONS = [
  { value: '', label: 'Select Qualification' },
  { value: 'B.Ed', label: 'Bachelor of Education' },
  { value: 'M.Ed', label: 'Master of Education' },
  { value: 'Diploma in Education', label: 'Diploma in Education' },
  { value: 'CT', label: 'Certificate in Teaching' },
  { value: 'PTC', label: 'Primary Teaching Certificate' },
  { value: 'Others', label: 'Others' }
];

const TEACHER_TYPES = [
  { value: 'Period Teacher', label: 'Period Teacher' },
  { value: 'Class Incharge', label: 'Class Incharge' }
];

const EXPERIENCE_OPTIONS = [
  ...Array.from({ length: 20 }, (_, index) => String(index + 1)),
  'Above 20',
  'Above 30',
];

const TIME_SLOTS = [
  '08:00 AM', '08:45 AM', '09:30 AM', '10:15 AM', 
  '10:30 AM', '11:15 AM', '12:00 PM', '12:45 PM',
  '01:15 PM', '02:00 PM', '02:45 PM'
];

const INITIAL_FORM_DATA = {
  personalInfo: {
    name: '',
    fatherHusbandName: '',
    dob: '',
    cnic: '',
    contactNumber: '',
    whatsappNumber: '',
    address: '',
    gender: 'Male',
    photo: null
  },
  educationInfo: {
    academicQualification: '',
    majorSubject: '',
    professionalQualification: '',
    dateOfAppointment: '',
    experience: '',
    lastInstitute: ''
  },
  biometricInfo: {
    fingerprint: '',
    fingerprintEnrolled: false,
    fingerprintCapturedAt: null,
    fingerprintSamples: [],
    facerecognition: '',
    faceEnrolled: false,
    faceCapturedAt: null,
    faceSamples: [],
  },
  classAssign: {
    teacherType: 'Period Teacher',
    classIncharge: '',
    totalPeriods: '',
    periodsAssignments: []
  }
};

function createInitialFormData() {
  return JSON.parse(JSON.stringify(INITIAL_FORM_DATA));
}

function isValidDateParts(day, month, year) {
  const numericDay = Number(day);
  const numericMonth = Number(month);
  const numericYear = Number(year);

  if (!numericDay || !numericMonth || !numericYear) return false;

  const date = new Date(numericYear, numericMonth - 1, numericDay);
  return (
    date.getFullYear() === numericYear &&
    date.getMonth() === numericMonth - 1 &&
    date.getDate() === numericDay
  );
}

function formatDobForDisplay(value) {
  if (!value) return '';

  const stringValue = String(value).trim();
  const displayMatch = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    return isValidDateParts(day, month, year) ? stringValue : '';
  }

  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isValidDateParts(day, month, year) ? `${day}/${month}/${year}` : '';
  }

  const parsedDate = new Date(stringValue);
  if (Number.isNaN(parsedDate.getTime())) return stringValue;

  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = String(parsedDate.getFullYear());
  return `${day}/${month}/${year}`;
}

function formatDobInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8);

  if (digitsOnly.length <= 2) return digitsOnly;
  if (digitsOnly.length <= 4) return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
}

function convertDisplayDobToIso(value) {
  if (!value) return '';

  const trimmedValue = String(value).trim();
  const displayMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!displayMatch) return trimmedValue;

  const [, day, month, year] = displayMatch;
  if (!isValidDateParts(day, month, year)) return trimmedValue;

  return `${year}-${month}-${day}`;
}

function formatCnicInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 13);

  if (digitsOnly.length <= 5) return digitsOnly;
  if (digitsOnly.length <= 12) return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`;
  return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12)}`;
}

function normalizeCnicForDisplay(value) {
  if (!value) return '';

  const digitsOnly = String(value).replace(/\D/g, '');
  if (digitsOnly.length !== 13) return String(value).trim();

  return formatCnicInput(digitsOnly);
}

function isValidCnic(value) {
  return /^\d{5}-\d{7}-\d{1}$/.test(String(value || '').trim());
}

function formatPhoneInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  if (digitsOnly.length <= 4) return digitsOnly;
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
}

function normalizePhoneForDisplay(value) {
  if (!value) return '';

  const digitsOnly = String(value).replace(/\D/g, '');
  if (digitsOnly.length !== 11) return String(value).trim();

  return formatPhoneInput(digitsOnly);
}

function isValidPhoneNumber(value) {
  return /^\d{4}-\d{7}$/.test(String(value || '').trim());
}

function appendMajorSubject(existingValue, nextSubject) {
  const trimmedSubject = String(nextSubject || '').trim();
  if (!trimmedSubject) return String(existingValue || '').trim();

  const currentSubjects = String(existingValue || '')
    .split(',')
    .map((subject) => subject.trim())
    .filter(Boolean);

  if (currentSubjects.includes(trimmedSubject)) {
    return currentSubjects.join(', ');
  }

  return [...currentSubjects, trimmedSubject].join(', ');
}

function normalizeTeacherToFormData(teacher = {}) {
  const nextFormData = createInitialFormData();

  nextFormData.personalInfo = {
    ...nextFormData.personalInfo,
    ...teacher.personalInfo,
    dob: formatDobForDisplay(teacher.personalInfo?.dob),
    cnic: normalizeCnicForDisplay(teacher.personalInfo?.cnic),
    contactNumber: normalizePhoneForDisplay(teacher.personalInfo?.contactNumber),
    whatsappNumber: normalizePhoneForDisplay(teacher.personalInfo?.whatsappNumber),
    photo: teacher.personalInfo?.photo || null,
  };

  nextFormData.educationInfo = {
    ...nextFormData.educationInfo,
    ...teacher.educationInfo,
    dateOfAppointment: formatDobForDisplay(teacher.educationInfo?.dateOfAppointment),
  };

  nextFormData.biometricInfo = {
    ...nextFormData.biometricInfo,
    ...teacher.biometricInfo,
  };

  nextFormData.classAssign = {
    ...nextFormData.classAssign,
    ...teacher.classAssign,
    periodsAssignments: Array.isArray(teacher.classAssign?.periodsAssignments)
      ? teacher.classAssign.periodsAssignments
      : [],
  };

  return nextFormData;
}

const FINGERPRINT_REQUIRED_STEPS = 5;
const FACE_REQUIRED_STEPS = 5;
const MIN_FINGERPRINT_QUALITY = 80;
const MIN_FACE_CONFIDENCE = 85;

export default function AddNewTeacher({
  hideHeader = false,
  resetSignal = 0,
  onSuccess,
  initialData = null,
  teacherId = null,
  mode = 'create',
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [showTimeTableModal, setShowTimeTableModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [createdTeacherName, setCreatedTeacherName] = useState('');
  const [teacherPhotoPreview, setTeacherPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedMajorSubject, setSelectedMajorSubject] = useState('');
  const photoInputRef = useRef(null);

  // Form Data
  const [formData, setFormData] = useState(() => (initialData ? normalizeTeacherToFormData(initialData) : createInitialFormData()));

  const [timeTableData, setTimeTableData] = useState({
    periods: [],
    classes: [],
    subjects: [],
    times: [],
    types: []
  });

  const tabs = [
    { id: 0, name: 'Personal Info', icon: '👤', description: 'Basic personal details' },
    { id: 1, name: 'Education', icon: '🎓', description: 'Qualifications & experience' },
    { id: 2, name: 'Class Assign', icon: '📚', description: 'Teaching assignments' }
  ];

  const biometricPreviewUsers = useMemo(() => {
    const teacherName = formData.personalInfo.name.trim();
    if (!teacherName) return [];

    return [
      {
        id: formData.personalInfo.cnic || formData.personalInfo.contactNumber || teacherName,
        name: teacherName,
        teacherId: initialData?.teacherId || formData.personalInfo.contactNumber || formData.personalInfo.cnic || teacherName,
      },
    ];
  }, [formData.personalInfo.name, formData.personalInfo.cnic, formData.personalInfo.contactNumber, initialData?.teacherId]);

  // Load classes for dropdown
  useEffect(() => {
    const loadClasses = async () => {
      const result = await classService.getAll();
      if (result.success) {
        setClasses(result.data);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    if (!showSuccessModal) return undefined;

  const timeoutId = window.setTimeout(() => {
    setShowSuccessModal(false);
    if (typeof onSuccess === 'function') {
      onSuccess();
      return;
    }
    router.push('/AdminDashboard/teachers');
  }, 2200);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [showSuccessModal, onSuccess, router]);
  // Handle Periods Assignment
  const handleTotalPeriodsChange = useCallback((value) => {
    const periods = parseInt(value) || 0;
    const newAssignments = [];
    for (let i = 0; i < periods; i++) {
      newAssignments.push({
        period: PERIOD_OPTIONS[i] || `${i + 1}th`,
        class: '',
        subject: '',
        time: '',
        type: 'Period'
      });
    }
    setFormData(prev => ({
      ...prev,
      classAssign: {
        ...prev.classAssign,
        totalPeriods: value === '' ? '' : periods,
        periodsAssignments: newAssignments
      }
    }));
  }, []);

  const handlePeriodAssignmentChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const updatedAssignments = [...prev.classAssign.periodsAssignments];
      updatedAssignments[index] = { ...updatedAssignments[index], [field]: value };
      return {
        ...prev,
        classAssign: { ...prev.classAssign, periodsAssignments: updatedAssignments }
      };
    });
  }, []);

  // Handle Photo Upload
  const handlePhotoUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      showToast('Please upload a valid image file (JPEG, PNG, or WebP)', 'error');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTeacherPhotoPreview(reader.result);
      setFormData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photo: reader.result }
      }));
      showToast('Photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback(() => {
    setTeacherPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, photo: null }
    }));
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    showToast('Photo removed', 'info');
  }, []);

  // Generate Time Table
  const generateTimeTable = useCallback(() => {
    const { teacherType, classIncharge, periodsAssignments } = formData.classAssign;
    
    const periods = [];
    const classesList = [];
    const subjects = [];
    const times = [];
    const types = [];

    if (teacherType === 'Class Incharge' && classIncharge) {
      periods.push('Full Day');
      classesList.push(classIncharge);
      subjects.push('All Subjects');
      times.push('08:00 AM - 02:00 PM');
      types.push('Class Incharge');
    }

    periodsAssignments.forEach(assignment => {
      if (assignment.class && assignment.subject) {
        periods.push(assignment.period);
        classesList.push(assignment.class);
        subjects.push(assignment.subject);
        times.push(assignment.time || 'TBD');
        types.push('Period Teacher');
      }
    });

    setTimeTableData({ periods, classes: classesList, subjects, times, types });
    setShowTimeTableModal(true);
  }, [formData.classAssign]);

  // Print Time Table
  const handlePrintTimeTable = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teacher Time Table - ${formData.personalInfo.name}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #f0fdf4;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #0d9488, #059669);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .header p { opacity: 0.9; }
          .content { padding: 30px; }
          .info-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-label { font-weight: 600; color: #0d9488; }
          .info-value { color: #1e293b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #0d9488;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          tr:hover { background: #f8fafc; }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          @media print {
            body { padding: 0; background: white; }
            .container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Teacher Time Table</h1>
            <p>Weekly Schedule & Class Assignments</p>
          </div>
          <div class="content">
            <div class="info-section">
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Teacher Name:</span><span class="info-value">${formData.personalInfo.name || '—'}</span></div>
                <div class="info-item"><span class="info-label">Appointment Date:</span><span class="info-value">${formData.educationInfo.dateOfAppointment || '—'}</span></div>
                <div class="info-item"><span class="info-label">Teacher Type:</span><span class="info-value">${formData.classAssign.teacherType}</span></div>
                ${formData.classAssign.classIncharge ? `<div class="info-item"><span class="info-label">Class Incharge:</span><span class="info-value">${formData.classAssign.classIncharge}</span></div>` : ''}
                <div class="info-item"><span class="info-label">Total Periods:</span><span class="info-value">${formData.classAssign.totalPeriods}</span></div>
              </div>
            </div>
            <h3 style="margin-bottom: 15px; color: #0d9488;">📋 Period Schedule</h3>
            <table>
              <thead><tr><th>Period</th><th>Class</th><th>Subject</th><th>Time</th><th>Type</th></tr></thead>
              <tbody>
                ${timeTableData.periods.map((_, idx) => `
                  <tr>
                    <td>${timeTableData.periods[idx] || '—'}</td>
                    <td>${timeTableData.classes[idx] || '—'}</td>
                    <td>${timeTableData.subjects[idx] || '—'}</td>
                    <td>${timeTableData.times[idx] || '—'}</td>
                    <td>${timeTableData.types[idx] || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>This is an official teacher timetable document</p>
          </div>
        </div>
        <script>window.onload = () => window.print(); setTimeout(() => window.close(), 500);<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [formData, timeTableData]);

  const handleSaveTimeTablePDF = useCallback(() => {
    handlePrintTimeTable();
  }, [handlePrintTimeTable]);

  // Handle Form Submit
  const handleSubmit = useCallback(async () => {
    if (!isAdmin) {
      setModalMessage(`Only admin can ${mode === 'edit' ? 'edit' : 'add'} teachers.`);
      setShowErrorModal(true);
      showToast(`Only admin can ${mode === 'edit' ? 'edit' : 'add'} teachers`, 'error');
      return;
    }

    const { teacherType, classIncharge, totalPeriods } = formData.classAssign;
    if (
      !formData.personalInfo.name.trim() ||
      !teacherType ||
      !Number.isInteger(Number(totalPeriods)) ||
      Number(totalPeriods) < 1 ||
      (teacherType === 'Class Incharge' && !classIncharge.trim())
    ) {
      setModalMessage('Please fill all required fields (Full Name, Teacher Type, Total Periods Assign, and Class Incharge when applicable).');
      setShowErrorModal(true);
      showToast('Please fill all required teacher fields', 'error');
      return;
    }

    if (
      formData.personalInfo.dob &&
      convertDisplayDobToIso(formData.personalInfo.dob) === formData.personalInfo.dob
    ) {
      setModalMessage('Please enter Date of Birth in dd/mm/yyyy format.');
      setShowErrorModal(true);
      showToast('Date of Birth must use dd/mm/yyyy format', 'error');
      return;
    }

    if (
      formData.educationInfo.dateOfAppointment &&
      convertDisplayDobToIso(formData.educationInfo.dateOfAppointment) === formData.educationInfo.dateOfAppointment
    ) {
      setModalMessage('Please enter Date of Appointment in dd/mm/yyyy format.');
      setShowErrorModal(true);
      showToast('Date of Appointment must use dd/mm/yyyy format', 'error');
      return;
    }

    if (formData.personalInfo.cnic && !isValidCnic(formData.personalInfo.cnic)) {
      setModalMessage('Please enter CNIC in 12345-1234567-1 format.');
      setShowErrorModal(true);
      showToast('CNIC must use 12345-1234567-1 format', 'error');
      return;
    }

    if (formData.personalInfo.contactNumber && !isValidPhoneNumber(formData.personalInfo.contactNumber)) {
      setModalMessage('Please enter Contact Number in 0300-1234567 format.');
      setShowErrorModal(true);
      showToast('Contact Number must use 0300-1234567 format', 'error');
      return;
    }

    if (formData.personalInfo.whatsappNumber && !isValidPhoneNumber(formData.personalInfo.whatsappNumber)) {
      setModalMessage('Please enter WhatsApp Number in 0300-1234567 format.');
      setShowErrorModal(true);
      showToast('WhatsApp Number must use 0300-1234567 format', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const teacherName = formData.personalInfo.name.trim();
      const payload = {
        ...formData,
        personalInfo: {
          ...formData.personalInfo,
          dob: convertDisplayDobToIso(formData.personalInfo.dob),
        },
        educationInfo: {
          ...formData.educationInfo,
          dateOfAppointment: convertDisplayDobToIso(formData.educationInfo.dateOfAppointment),
        },
      };
      const result =
        mode === 'edit' && teacherId
          ? await teacherService.update(teacherId, payload)
          : await teacherService.create(payload);
      if (!result.success) {
        throw new Error(result.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} teacher.`);
      }

      setCreatedTeacherName(teacherName);
      setModalMessage(
        mode === 'edit'
          ? `${teacherName || 'Teacher'} updated successfully.`
          : `${teacherName || 'Teacher'} created successfully and added to the database.`
      );
      setShowSuccessModal(true);
      if (mode !== 'edit') {
        setFormData(createInitialFormData());
        setTeacherPhotoPreview(null);
        if (photoInputRef.current) {
          photoInputRef.current.value = '';
        }
      }
    } catch (error) {
      setModalMessage(error?.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} teacher.`);
      setShowErrorModal(true);
      console.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} teacher:`, error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, formData, mode, teacherId]);

  const handleInputChange = useCallback((section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  }, []);

  const handleMajorSubjectSelect = useCallback((value) => {
    if (!value) return;

    setFormData((prev) => ({
      ...prev,
      educationInfo: {
        ...prev.educationInfo,
        majorSubject: appendMajorSubject(prev.educationInfo.majorSubject, value),
      },
    }));
    setSelectedMajorSubject('');
  }, []);

  const handleFingerprintMatch = useCallback((userId) => {
    const teacherName = formData.personalInfo.name.trim() || 'Teacher';
    const fingerprintId = String(userId || `FP-${Date.now()}`);
    const quality = Math.floor(Math.random() * 21) + 75;

    if (quality < MIN_FINGERPRINT_QUALITY) {
      showToast(
        `Fingerprint quality ${quality}% is too low. Minimum ${MIN_FINGERPRINT_QUALITY}% required.`,
        'error'
      );
      return;
    }

    let fingerprintCompleted = false;

    setFormData(prev => {
      const nextStep = (prev.biometricInfo.fingerprintSamples?.length || 0) + 1;
      const nextSamples = [
        ...(prev.biometricInfo.fingerprintSamples || []),
        { step: nextStep, quality, capturedAt: new Date().toISOString() },
      ];
      const enrolled = nextSamples.length >= FINGERPRINT_REQUIRED_STEPS;
      fingerprintCompleted = enrolled;

      return {
        ...prev,
        biometricInfo: {
          ...prev.biometricInfo,
          fingerprint: fingerprintId,
          fingerprintEnrolled: enrolled,
          fingerprintCapturedAt: enrolled ? new Date().toISOString() : prev.biometricInfo.fingerprintCapturedAt,
          fingerprintSamples: nextSamples,
        }
      };
    });

    if (fingerprintCompleted) {
      setShowScanner(false);
      showToast(`Fingerprint enrollment completed for ${teacherName}`, 'success');
      return;
    }

    showToast(
      `Fingerprint step captured for ${teacherName}. Quality ${quality}%. Complete all ${FINGERPRINT_REQUIRED_STEPS} steps.`,
      'success'
    );
  }, [formData.personalInfo.name]);

  const handleFaceMatch = useCallback((userId) => {
    const teacherName = formData.personalInfo.name.trim() || 'Teacher';
    const faceId = String(userId || `FACE-${Date.now()}`);
    const confidence = Math.floor(Math.random() * 16) + 80;

    if (confidence < MIN_FACE_CONFIDENCE) {
      showToast(
        `Face confidence ${confidence}% is too low. Minimum ${MIN_FACE_CONFIDENCE}% required.`,
        'error'
      );
      return;
    }

    let faceCompleted = false;

    setFormData(prev => {
      const nextStep = (prev.biometricInfo.faceSamples?.length || 0) + 1;
      const nextSamples = [
        ...(prev.biometricInfo.faceSamples || []),
        { step: nextStep, confidence, capturedAt: new Date().toISOString() },
      ];
      const enrolled = nextSamples.length >= FACE_REQUIRED_STEPS;
      faceCompleted = enrolled;

      return {
        ...prev,
        biometricInfo: {
          ...prev.biometricInfo,
          facerecognition: faceId,
          faceEnrolled: enrolled,
          faceCapturedAt: enrolled ? new Date().toISOString() : prev.biometricInfo.faceCapturedAt,
          faceSamples: nextSamples,
        }
      };
    });

    if (faceCompleted) {
      setShowFaceScanner(false);
      showToast(`Face recognition enrollment completed for ${teacherName}`, 'success');
      return;
    }

    showToast(
      `Face step captured for ${teacherName}. Confidence ${confidence}%. Complete all ${FACE_REQUIRED_STEPS} steps.`,
      'success'
    );
  }, [formData.personalInfo.name]);

  const handleFingerprintModalClose = useCallback(() => {
    setShowScanner(false);
  }, []);

  const handleFaceModalClose = useCallback(() => {
    setShowFaceScanner(false);
  }, []);

  // Validation helper
  const isFormValid = useMemo(() => {
    const { teacherType, classIncharge, totalPeriods } = formData.classAssign;
    return formData.personalInfo.name.trim() !== '' &&
           teacherType !== '' &&
           Number.isInteger(Number(totalPeriods)) &&
           Number(totalPeriods) >= 1 &&
           (teacherType !== 'Class Incharge' || classIncharge.trim() !== '');
  }, [
    formData.personalInfo.name,
    formData.classAssign,
  ]);

  const handleAddNewTeacher = useCallback(() => {
    setFormData(createInitialFormData());
    setTeacherPhotoPreview(null);
    setSelectedMajorSubject('');
    setActiveTab(0);

    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    if (resetSignal > 0) {
      handleAddNewTeacher();
    }
  }, [resetSignal, handleAddNewTeacher]);

  useEffect(() => {
    if (!initialData) {
      setFormData(createInitialFormData());
      setTeacherPhotoPreview(null);
      setSelectedMajorSubject('');
      return;
    }

    const nextFormData = normalizeTeacherToFormData(initialData);
    setFormData(nextFormData);
    setTeacherPhotoPreview(nextFormData.personalInfo.photo || null);
    setSelectedMajorSubject('');
    setActiveTab(0);

    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  }, [initialData]);

  return (
    <div className={hideHeader ? 'w-full' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6'}>
      <div className={hideHeader ? 'w-full space-y-6' : 'max-w-6xl mx-auto space-y-6'}>
        
        {/* Header */}
        {!hideHeader && (
          <div className="backdrop-blur-xl bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-5 sm:px-8 sm:py-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {mode === 'edit' ? 'Edit Teacher' : 'Teacher Management'}
                    </h1>
                    <p className="text-blue-100 text-sm mt-1">
                      {mode === 'edit' ? 'Update teacher profile with complete details' : 'Register new teacher with complete profile'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="flex items-center gap-2 text-blue-100">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Admin Access Only</span>
                  </div>
                  <Button
                    onClick={handleAddNewTeacher}
                    className="w-full rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:bg-blue-50 sm:w-auto"
                  >
                    {mode === 'edit' ? 'Reset Form' : 'Add New Teachers'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-blue-200/50 bg-blue-50/30">
            <div className="flex overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium transition-all duration-200 whitespace-nowrap relative group ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-blue-600'
                  }`}
                >
                  <span className="mr-2 text-lg">{tab.icon}</span>
                  {tab.name}
                  <span className="hidden group-hover:block absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full text-xs text-slate-400 bg-white px-2 py-0.5 rounded shadow-sm">
                    {tab.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Personal Info Tab */}
            {activeTab === 0 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Personal Information Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={formData.personalInfo.name} onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Enter teacher&apos;s full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Father&apos;s/Husband Name</label>
                    <input type="text" value={formData.personalInfo.fatherHusbandName} onChange={(e) => handleInputChange('personalInfo', 'fatherHusbandName', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Father&apos;s or husband&apos;s name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.personalInfo.dob}
                      onChange={(e) => handleInputChange('personalInfo', 'dob', formatDobInput(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CNIC Number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.personalInfo.cnic}
                      onChange={(e) => handleInputChange('personalInfo', 'cnic', formatCnicInput(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="12345-1234567-1"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formData.personalInfo.contactNumber}
                      onChange={(e) => handleInputChange('personalInfo', 'contactNumber', formatPhoneInput(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="0300-1234567"
                      maxLength={12}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Whatsapp No.</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formData.personalInfo.whatsappNumber}
                      onChange={(e) => handleInputChange('personalInfo', 'whatsappNumber', formatPhoneInput(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="0300-1234567"
                      maxLength={12}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea value={formData.personalInfo.address} onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)} rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Complete residential address" />
                  </div>
                </div>

                
              </div>
            )}

            {/* Education Info Tab */}
            {activeTab === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Academic Qualification</label>
                    <select value={formData.educationInfo.academicQualification} onChange={(e) => handleInputChange('educationInfo', 'academicQualification', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                      {ACADEMIC_QUALIFICATIONS.map(qual => (
                        <option key={qual.value} value={qual.value}>{qual.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Major Subject</label>
                    <textarea
                      value={formData.educationInfo.majorSubject}
                      onChange={(e) => handleInputChange('educationInfo', 'majorSubject', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Selected subjects will appear here, separated by commas"
                      rows={2}
                    />
                    <select
                      value={selectedMajorSubject}
                      onChange={(e) => handleMajorSubjectSelect(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Select subject to add</option>
                      {SUBJECT_OPTIONS.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Professional Qualification</label>
                    <select value={formData.educationInfo.professionalQualification} onChange={(e) => handleInputChange('educationInfo', 'professionalQualification', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                      {PROFESSIONAL_QUALIFICATIONS.map(qual => (
                        <option key={qual.value} value={qual.value}>{qual.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Appointment</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.educationInfo.dateOfAppointment}
                      onChange={(e) => handleInputChange('educationInfo', 'dateOfAppointment', formatDobInput(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teaching Experience (Years)</label>
                    <select
                      value={formData.educationInfo.experience}
                      onChange={(e) => handleInputChange('educationInfo', 'experience', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Select experience</option>
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Institute</label>
                    <input type="text" value={formData.educationInfo.lastInstitute} onChange={(e) => handleInputChange('educationInfo', 'lastInstitute', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Previous workplace" />
                  </div>
                </div>
              </div>
            )}

            {/* Class Assign Tab */}
            {activeTab === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teacher Type <span className="text-red-500">*</span></label>
                    <select value={formData.classAssign.teacherType} onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange('classAssign', 'teacherType', value);
                        if (value !== 'Class Incharge') handleInputChange('classAssign', 'classIncharge', '');
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                      {TEACHER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {formData.classAssign.teacherType === 'Class Incharge' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Class Incharge <span className="text-red-500">*</span></label>
                      <select value={formData.classAssign.classIncharge} onChange={(e) => handleInputChange('classAssign', 'classIncharge', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                        <option value="">Select Class</option>
                        {CLASS_OPTIONS.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Periods Assign <span className="text-red-500">*</span></label>
                    <select value={formData.classAssign.totalPeriods} onChange={(e) => handleTotalPeriodsChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all">
                      <option value="">Select Total Periods</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>{num} Period{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Form Progress Indicator */}
          <div className="px-6 py-3 bg-blue-50/30 border-t border-blue-200/50">
            <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Step {activeTab + 1} of {tabs.length}</span>
              <div className="flex gap-1">
                {tabs.map((_, idx) => (
                  <div key={idx} className={`w-6 h-1 rounded-full transition-all ${idx <= activeTab ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                ))}
              </div>
              <span>{Math.round(((activeTab + 1) / tabs.length) * 100)}% Complete</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-5 bg-white/30 backdrop-blur-sm border-t border-white/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="secondary" onClick={() => setShowCancelModal(true)} className="w-full border border-slate-300 hover:bg-slate-100 rounded-lg px-6 py-2.5 transition-all sm:w-auto">
                Cancel
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {activeTab > 0 && (
                  <Button variant="secondary" onClick={() => setActiveTab(activeTab - 1)} className="w-full border border-slate-300 hover:bg-slate-100 rounded-lg px-6 py-2.5 transition-all sm:w-auto">
                    ← Previous
                  </Button>
                )}
                {activeTab < tabs.length - 1 ? (
                  <Button onClick={() => setActiveTab(activeTab + 1)} className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all sm:w-auto">
                    Next →
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading || !isFormValid} className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      mode === 'edit' ? 'Update Teacher' : 'Save Teacher'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Table Modal */}
      <Modal isOpen={showTimeTableModal} onClose={() => setShowTimeTableModal(false)} title="Teacher Time Table" size="lg">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl p-6 text-white">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Teacher Time Table</h2>
              <p className="text-blue-100 mt-1">Weekly Schedule & Class Assignments</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-white/20 pt-4 sm:grid-cols-2">
              <div><p className="text-sm text-blue-100">Teacher Name</p><p className="font-semibold">{formData.personalInfo.name || '—'}</p></div>
              <div><p className="text-sm text-blue-100">Appointment Date</p><p className="font-semibold">{formData.educationInfo.dateOfAppointment || '—'}</p></div>
            </div>
          </div>

          {timeTableData.periods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-emerald-50">
                  <tr><th className="text-left py-3 px-4 font-semibold text-blue-800">Period</th><th className="text-left py-3 px-4 font-semibold text-blue-800">Class</th><th className="text-left py-3 px-4 font-semibold text-blue-800">Subject</th><th className="text-left py-3 px-4 font-semibold text-blue-800">Time</th><th className="text-left py-3 px-4 font-semibold text-blue-800">Type</th></tr>
                </thead>
                <tbody>
                  {timeTableData.periods.map((_, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium">{timeTableData.periods[idx] || '—'}</td>
                      <td className="py-3 px-4">{timeTableData.classes[idx] || '—'}</td>
                      <td className="py-3 px-4">{timeTableData.subjects[idx] || '—'}</td>
                      <td className="py-3 px-4">{timeTableData.times[idx] || '—'}</td>
                      <td className="py-3 px-4"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${timeTableData.types[idx] === 'Class Incharge' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{timeTableData.types[idx] || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8"><p className="text-slate-500">No time table data available</p></div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setShowTimeTableModal(false)} className="w-full sm:w-auto">Close</Button>
          <Button onClick={handleSaveTimeTablePDF} className="bg-emerald-600 text-white">💾 Save as PDF</Button>
          <Button onClick={handlePrintTimeTable} className="bg-blue-600 text-white">🖨️ Print</Button>
        </div>
      </Modal>

      <Modal isOpen={showScanner} onClose={handleFingerprintModalClose} title="Hardware Scanner Active" size="md">
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Fingerprint Progress</p>
              <span className="text-xs font-medium text-blue-700">
                {formData.biometricInfo.fingerprintSamples.length}/{FINGERPRINT_REQUIRED_STEPS}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (formData.biometricInfo.fingerprintSamples.length / FINGERPRINT_REQUIRED_STEPS) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Complete all {FINGERPRINT_REQUIRED_STEPS} scans with minimum quality {MIN_FINGERPRINT_QUALITY}%.
            </p>
          </div>
          <FingerprintScanner
            onMatch={handleFingerprintMatch}
            type="teacher"
            users={biometricPreviewUsers}
          />
        </div>
      </Modal>

      <Modal isOpen={showFaceScanner} onClose={handleFaceModalClose} title="Camera Active" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Face Recognition Progress</p>
              <span className="text-xs font-medium text-emerald-700">
                {formData.biometricInfo.faceSamples.length}/{FACE_REQUIRED_STEPS}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (formData.biometricInfo.faceSamples.length / FACE_REQUIRED_STEPS) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Complete all {FACE_REQUIRED_STEPS} captures with minimum confidence {MIN_FACE_CONFIDENCE}%.
            </p>
          </div>
          <FaceRecognition
            onMatch={handleFaceMatch}
            type="teacher"
            users={biometricPreviewUsers}
          />
        </div>
      </Modal>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Success
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">{modalMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Something went wrong
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">{modalMessage}</p>
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
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Unsaved changes
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Are you sure? All unsaved changes will be lost.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 sm:w-auto"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
