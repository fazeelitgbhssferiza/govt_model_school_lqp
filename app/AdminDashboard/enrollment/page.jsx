'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../authservice/useAuth';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import { apiRequest } from '../authservice/api';
import classService from '../../services/classService';
import { showToast } from '../../utils/helpers';

// Constants
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CLASS_9_GROUP_OPTIONS = [
  'Science Group With Biology',
  'Science Group With Computer Sc.',
  'Arts Group',
];

function isClassNine(enrollmentClass) {
  const className = String(enrollmentClass || '').split(' - ')[0].trim();
  return /^(?:class|grade)?\s*9(?:th)?$/i.test(className);
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

function formatDateForDisplay(value) {
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

function formatDateInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8);

  if (digitsOnly.length <= 2) return digitsOnly;
  if (digitsOnly.length <= 4) return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
}

function convertDisplayDateToIso(value) {
  if (!value) return '';

  const trimmedValue = String(value).trim();
  const displayMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!displayMatch) return trimmedValue;

  const [, day, month, year] = displayMatch;
  if (!isValidDateParts(day, month, year)) return trimmedValue;

  return `${year}-${month}-${day}`;
}

function getEnrollmentMonthFeeDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}-05`;
}

function generateRegistrationNumber(students = [], date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const suffix = `-MLQP-${month}-${year}`;
  const highestSerial = students.reduce((highest, student) => {
    const registrationNumber = student?.registrationNumber || student?.regNo || '';
    if (!registrationNumber.endsWith(suffix)) return highest;

    const serial = Number(registrationNumber.slice(0, -suffix.length));
    return Number.isInteger(serial) && serial > highest ? serial : highest;
  }, 0);

  return `${String(highestSerial + 1).padStart(2, '0')}${suffix}`;
}

function formatCnicInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 13);

  if (digitsOnly.length <= 5) return digitsOnly;
  if (digitsOnly.length <= 12) return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`;
  return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12)}`;
}

function formatPhoneInput(value) {
  const digitsOnly = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);

  if (digitsOnly.length <= 4) return digitsOnly;
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
}

export default function EnrollmentPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [classes, setClasses] = useState([]);
  const photoInputRef = useRef(null);
  const printRef = useRef(null);
  
  const [formData, setFormData] = useState({
    enrollmentType: 'Private',
    studentInfo: {
      name: '',
      dob: '',
      cnic: '',
      address: '',
      gender: 'Male',
      photo: null
    },
    parentInfo: {
      fatherName: '',
      fatherCNIC: '',
      fatherPhone: '',
      parentWhatsApp: ''
    },
    education: {
      registrationNo: generateRegistrationNumber(),
      classRoleNumber: '',
      enrollmentClass: '',
      admissionDate: '',
      group: '',
      previousClass: '',
      previousSchool: '',
      documents: []
    },
    fee: {
      registrationFee: 0,
      monthlyFee: 0,
      monthlyFeeDate: getEnrollmentMonthFeeDate(),
      discount: 0,
      annualDiscount: 0
    }
  });

  const [submitted, setSubmitted] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Load classes from the API.
  useEffect(() => {
    const loadClasses = async () => {
      const result = await classService.getAll();
      setClasses(result.success && Array.isArray(result.data) ? result.data : []);
    };

    loadClasses();

    // Listen for class updates
    const handleClassesUpdate = (event) => {
      classService.getAll().then((result) => {
        setClasses(result.success && Array.isArray(result.data) ? result.data : []);
      });
    };

    window.addEventListener('classesUpdated', handleClassesUpdate);
    
    return () => {
      window.removeEventListener('classesUpdated', handleClassesUpdate);
    };
  }, []);

  useEffect(() => {
    const initializeRegistrationNumber = async () => {
      let savedStudents = [];

      try {
        savedStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
      } catch {
        savedStudents = [];
      }

      let students = savedStudents;
      try {
        const result = await apiRequest('/students');
        if (result?.success && Array.isArray(result.students)) {
          students = [...result.students, ...savedStudents];
        }
      } catch {
        // Local student data still provides a safe offline fallback.
      }

      setFormData(prev => ({
        ...prev,
        education: {
          ...prev.education,
          registrationNo: generateRegistrationNumber(students),
        },
      }));
    };

    initializeRegistrationNumber();
  }, []);

  useEffect(() => {
    if (!showSuccessModal) return undefined;

    const timeoutId = window.setTimeout(() => {
      setShowSuccessModal(false);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSuccessModal]);

  const tabs = [
    { id: 0, name: '', icon: '👤' },
  ];

  const calculateMonthlyPayable = useCallback(() => {
    return formData.fee.monthlyFee - formData.fee.discount;
  }, [formData.fee]);

  const calculateAnnualPayable = useCallback(() => {
    return (formData.fee.monthlyFee * 12) - (formData.fee.annualDiscount || 0);
  }, [formData.fee]);

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
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
      setStudentPhoto(file);
      setStudentPhotoPreview(reader.result);
      setFormData(prev => ({
        ...prev,
        studentInfo: { ...prev.studentInfo, photo: reader.result }
      }));
      showToast('Photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const removePhoto = () => {
    setStudentPhoto(null);
    setStudentPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      studentInfo: { ...prev.studentInfo, photo: null }
    }));
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    showToast('Photo removed', 'info');
  };

  // Print Bill Function
  const printBill = () => {
    const printContent = printRef.current.innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Enrollment Bill - ${currentStudent.regNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 14mm; }
            body { background: #fff; color: #172033; font-family: Inter, "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.45; padding: 24px; }
            .bill-container { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; }
            .bill-container > div { padding: 28px !important; }
            h1 { font-family: Georgia, "Times New Roman", serif; letter-spacing: .2px; }
            h2 { letter-spacing: .08em; text-transform: uppercase; }
            h3 { color: #0f4c81 !important; font-size: 14px !important; letter-spacing: .06em; text-transform: uppercase; }
            .bill-meta { display: flex; align-items: center; justify-content: center; gap: 32px; }
            .student-details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; row-gap: 16px; }
            .student-details-grid > div { min-width: 0; break-inside: avoid; }
            .student-details-grid p:first-child { color: #64748b; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
            .student-details-grid p:last-child { color: #172033; font-size: 13px; font-weight: 700; margin-top: 2px; overflow-wrap: anywhere; }
            .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 80px; }
            .signature-grid > div { padding-top: 36px; text-align: center; }
            .signature-grid > div > div { width: 190px; margin: 8px auto 0; border-top: 1px solid #334155; }
            .fee-table { width: 100%; border: 2px solid #000; border-collapse: collapse; }
            .fee-table th, .fee-table td { border: 1px solid #000; padding: 10px 12px !important; }
            .fee-table th { background: #eef5fb !important; color: #000 !important; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
            .fee-table tbody tr:last-child td { border-top: 2px solid #000; font-weight: 700; }
            p { orphans: 3; widows: 3; }
            @media print { body { padding: 0; } .bill-container { border-radius: 0; } }
          </style>
        </head>
        <body>
          <div class="bill-container">${printContent}</div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = () => {
    if (!isAdmin) {
      showToast('Only admin can enroll students', 'error');
      return;
    }
    
    const [selectedClass = '', selectedSection = ''] =
      formData.education.enrollmentClass.split(' - ');
    const validationErrors = {};
    if (!formData.studentInfo.name.trim()) validationErrors.fullName = 'Full Name is required';
    if (!formData.parentInfo.fatherName.trim()) validationErrors.fatherName = "Father's Name is required";
    if (!formData.education.classRoleNumber.trim()) validationErrors.classRoleNumber = 'Class Roll No. is required';
    if (!selectedClass.trim()) validationErrors.classSection = 'Class & Section is required';
    if (formData.education.classRoleNumber.trim() && selectedClass.trim()) {
      const existingStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
      const duplicateRoleNumber = existingStudents.some((student) =>
        (() => {
          const [studentEnrollmentClass = '', studentEnrollmentSection = ''] =
            String(student.enrollmentClass || '').split(' - ');
          const studentClass = String(
            student.className || student.class || studentEnrollmentClass
          ).trim();
          const studentSection = String(
            student.section || studentEnrollmentSection
          ).trim();

          return (
            String(student.classRoleNumber || '').trim().toLowerCase() ===
              formData.education.classRoleNumber.trim().toLowerCase() &&
            studentClass.toLowerCase() === selectedClass.trim().toLowerCase() &&
            studentSection.toLowerCase() === selectedSection.trim().toLowerCase()
          );
        })()
      );
      if (duplicateRoleNumber) validationErrors.classRoleNumber = 'This Class Roll No. is already assigned in this class and section';
    }
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (
      formData.studentInfo.dob &&
      convertDisplayDateToIso(formData.studentInfo.dob) === formData.studentInfo.dob
    ) {
      showToast('Date of Birth must use dd/mm/yyyy format', 'error');
      return;
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setEnrollmentProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        (async () => {
          try {
            const selectedClassData = classes.find(
              (c) => `${c.name} - ${c.section}` === formData.education.enrollmentClass
            );
            const [fallbackClass = '', fallbackSection = ''] =
              formData.education.enrollmentClass.split(' - ');
            const registrationNumber = formData.education.registrationNo;
            const isPrivateStudent = formData.enrollmentType === 'Private';
            const feeRecords = isPrivateStudent ? [
              {
                month: new Date().toLocaleString('default', { month: 'long' }),
                year: new Date().getFullYear(),
                registrationFee: Number(formData.fee.registrationFee || 0),
                monthlyFee: calculateMonthlyPayable(),
                amount: Number(formData.fee.registrationFee || 0) + calculateMonthlyPayable(),
                dueDate: formData.fee.monthlyFeeDate,
                status: 'Pending',
                paidDate: null,
              },
            ] : [];

            const payload = {
              fullName: formData.studentInfo.name,
              gender: formData.studentInfo.gender,
              dob: convertDisplayDateToIso(formData.studentInfo.dob),
              cnicBForm: formData.studentInfo.cnic,
              address: formData.studentInfo.address,
              fatherName: formData.parentInfo.fatherName,
              fatherCNIC: formData.parentInfo.fatherCNIC,
              fatherPhone: formData.parentInfo.fatherPhone,
              whatsappNumber: formData.parentInfo.parentWhatsApp,
              registrationNumber,
              classRoleNumber: formData.education.classRoleNumber,
              enrollmentClass: formData.education.enrollmentClass,
              className: selectedClassData?.name || fallbackClass,
              section: selectedClassData?.section || fallbackSection,
              admissionDate: formData.education.admissionDate || null,
              group: isClassNine(formData.education.enrollmentClass)
                ? formData.education.group
                : '',
              previousClass: formData.education.previousClass,
              previousSchool: formData.education.previousSchool,
              enrollmentType: formData.enrollmentType,
              ...(isPrivateStudent ? { fee: {
                registrationFee: formData.fee.registrationFee,
                monthlyFee: formData.fee.monthlyFee,
                monthlyFeeDate: formData.fee.monthlyFeeDate,
                mode: 'Monthly',
                discount: formData.fee.discount,
                annualDiscount: formData.fee.annualDiscount,
              } } : {}),
              feeRecords,
              photo: formData.studentInfo.photo,
              status: 'Active',
            };

            const result = await apiRequest('/students/createStudent', {
              method: 'POST',
              data: payload,
              successMessage: 'Student successfully added to the database',
            });

            const savedStudent = result?.student;
            const newStudent = {
              id: savedStudent?._id || Date.now(),
              name: savedStudent?.fullName || formData.studentInfo.name,
              photo: savedStudent?.photo || formData.studentInfo.photo,
              regNo: savedStudent?.registrationNumber || registrationNumber,
              classRoleNumber: savedStudent?.classRoleNumber || formData.education.classRoleNumber,
              cnic: savedStudent?.cnicBForm || formData.studentInfo.cnic,
              class: selectedClassData?.name || fallbackClass,
              section: selectedClassData?.section || fallbackSection,
              gender: savedStudent?.gender || formData.studentInfo.gender,
              dob: savedStudent?.dob || formData.studentInfo.dob,
              address: savedStudent?.address || formData.studentInfo.address,
              fatherName: savedStudent?.fatherName || formData.parentInfo.fatherName,
              fatherCNIC: savedStudent?.fatherCNIC || formData.parentInfo.fatherCNIC,
              fatherPhone: savedStudent?.fatherPhone || formData.parentInfo.fatherPhone,
              parentWhatsApp: savedStudent?.whatsappNumber || formData.parentInfo.parentWhatsApp,
              enrollmentClass: savedStudent?.enrollmentClass || formData.education.enrollmentClass,
              admissionDate: savedStudent?.admissionDate || formData.education.admissionDate,
              group: savedStudent?.group || formData.education.group,
              previousClass: savedStudent?.previousClass || formData.education.previousClass,
              previousSchool: savedStudent?.previousSchool || formData.education.previousSchool,
              enrollmentType: savedStudent?.enrollmentType || formData.enrollmentType,
              documents: formData.education.documents,
              feeStructure: isPrivateStudent ? {
                registrationFee: savedStudent?.fee?.registrationFee ?? formData.fee.registrationFee,
                monthlyFee: savedStudent?.fee?.monthlyFee ?? formData.fee.monthlyFee,
                monthlyFeeDate: savedStudent?.fee?.monthlyFeeDate || formData.fee.monthlyFeeDate,
                mode: 'Monthly',
                discount: savedStudent?.fee?.discount ?? formData.fee.discount,
                annualDiscount:
                  savedStudent?.fee?.annualDiscount ?? formData.fee.annualDiscount,
                total: calculateMonthlyPayable(),
                monthlyPayable: calculateMonthlyPayable(),
                annualPayable: calculateAnnualPayable(),
              } : null,
              feeRecords: savedStudent?.feeRecords || feeRecords,
              results: {},
              attendanceSettings: {
                requireParentNotification: true,
                notificationPreference: 'whatsapp',
                earlyLeavePermission: false,
              },
              enrollmentDate: savedStudent?.createdAt || new Date().toISOString(),
            };

            const existingStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
            existingStudents.push(newStudent);
            localStorage.setItem('school_students', JSON.stringify(existingStudents));

            window.dispatchEvent(new CustomEvent('studentEnrolled', { detail: newStudent }));

            showToast('Student enrollment completed successfully!', 'success');
            router.push('/AdminDashboard/students');
          } catch (error) {
            setEnrollmentProgress(0);
            setModalMessage(error.message || 'Unable to create student right now.');
            setShowErrorModal(true);
          }
        })();
      }
    }, 200);
  };

  if (submitted && currentStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6">
        <div className="max-w-4xl mx-auto">
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

          {/* Bill for Printing */}
          <div ref={printRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 sm:p-8">
              {/* Header */}
              <div className="text-center border-b-2 border-blue-700 pb-6 mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">Official Enrollment Record</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Al-Flah Secondary School Feroza</h1>
                <h2 className="mt-4 text-lg font-semibold text-blue-700 sm:text-xl">New Student Enrollment Bill</h2>
                <div className="bill-meta mt-3 flex flex-col justify-center gap-1 text-sm text-slate-600 sm:flex-row sm:gap-6">
                  <span><strong>Bill Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
                  <span><strong>Registration No:</strong> {currentStudent.regNo}</span>
                </div>
              </div>

              {/* Student Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mb-4">Student Information</h3>
                <div className="student-details-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Student Name</p>
                    <p className="font-semibold text-gray-800">{currentStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-semibold text-gray-800">{formatDateForDisplay(currentStudent.dob) || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Class & Section</p>
                    <p className="font-semibold text-gray-800">{currentStudent.class} - {currentStudent.section}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-semibold text-gray-800">{currentStudent.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CNIC / B-Form</p>
                    <p className="font-semibold text-gray-800">{currentStudent.cnic || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Father's Name</p>
                    <p className="font-semibold text-gray-800">{currentStudent.fatherName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Father's Phone</p>
                    <p className="font-semibold text-gray-800">{currentStudent.fatherPhone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp Number</p>
                    <p className="font-semibold text-gray-800">{currentStudent.parentWhatsApp || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Previous School</p>
                    <p className="font-semibold text-gray-800">{currentStudent.previousSchool || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-semibold text-gray-800">{currentStudent.address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Fee Details */}
              {currentStudent.enrollmentType === 'Private' && currentStudent.feeStructure && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-blue-600 border-b border-gray-200 pb-2 mb-4">Fee Structure</h3>
                <div className="overflow-x-auto">
                <table className="fee-table min-w-[420px] w-full border-2 border-black border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-black text-left p-2">Particulars</th>
                      <th className="border border-black text-right p-2">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2">Registration Fee</td>
                      <td className="border border-black text-right p-2">{currentStudent.feeStructure.registrationFee.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">Monthly Tuition Fee</td>
                      <td className="border border-black text-right p-2">{currentStudent.feeStructure.monthlyFee.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2">Discount ({currentStudent.feeStructure.mode})</td>
                      <td className="border border-black text-right p-2 text-red-600">
                        - {currentStudent.feeStructure.mode === 'Monthly' 
                          ? currentStudent.feeStructure.discount.toLocaleString() 
                          : currentStudent.feeStructure.annualDiscount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-blue-50 font-bold">
                      <td className="border border-black p-2">Total Payable ({currentStudent.feeStructure.mode})</td>
                      <td className="border border-black text-right p-2 text-blue-600">
                        PKR {Math.round(currentStudent.feeStructure.total).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <div className="signature-grid flex flex-col gap-8 sm:flex-row sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Authorized Signature</p>
                    <div className="mt-8 w-40 border-t border-gray-400"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Student/Parent Signature</p>
                    <div className="mt-8 w-40 border-t border-gray-400"></div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button 
              onClick={printBill}
               className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl sm:w-auto"
            >
              <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Bill
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => router.push('/AdminDashboard/students')}
               className="w-full rounded-xl border border-blue-300 px-8 py-3 font-semibold text-blue-600 transition-all hover:bg-blue-50 sm:w-auto"
            >
              Exit to Students
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-white/20 bg-gradient-to-r from-blue-600/90 to-emerald-600/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur-sm">
              📝
            </div>
            <div>
              <h1 className="text-2xl font-bold">Student Enrollment</h1>
              <p className="text-blue-100 text-sm">Register a new student</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 sm:ml-auto sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {enrollmentProgress > 0 && enrollmentProgress < 100 && (
          <div className="mb-6">
            <div className="backdrop-blur-xl bg-white/60 rounded-xl p-4 shadow-xl border border-white/50">
              <p className="text-sm font-medium text-slate-700 mb-2">Enrolling student...</p>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${enrollmentProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">{enrollmentProgress}% complete</p>
            </div>
          </div>
        )}
      
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          <Tabs tabs={tabs.map(t => t.name)} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="p-4 sm:p-6">
            {/* Student Info Tab */}
            {activeTab === 0 && (
              <div className="space-y-6">
                {/* Photo Upload Section */}
                <div className="bg-gradient-to-br from-blue-50/50 to-emerald-50/50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                    <div className="relative group">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-emerald-100 shadow-lg sm:h-28 sm:w-28">
                        {studentPhotoPreview ? (
                          <img 
                            src={studentPhotoPreview} 
                            alt="Student preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="text-xs text-blue-600 mt-1">Add photo</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="p-2 bg-white rounded-full hover:bg-blue-50 transition-colors"
                          title="Upload photo"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        {studentPhotoPreview && (
                          <button
                            onClick={removePhoto}
                            className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                            title="Remove photo"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">Student Photo</h3>
                      <p className="text-sm text-slate-500 mb-3">
                        Upload a clear passport-size photo for student ID card and records.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <Button 
                          onClick={() => photoInputRef.current?.click()}
                          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-sm px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                        >
                          📸 Upload Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                  <h3 className="mb-4 text-lg font-semibold text-black">Personal Information</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={formData.studentInfo.name}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          studentInfo: { ...prev.studentInfo, name: e.target.value }
                        }));
                        setFieldErrors(prev => ({ ...prev, fullName: '' }));
                      }}
                      className={`w-full rounded-lg border bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${fieldErrors.fullName ? 'border-red-500' : 'border-slate-200'}`}
                      placeholder="Enter student's full name"
                    />
                    {fieldErrors.fullName && <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.studentInfo.gender}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        studentInfo: { ...prev.studentInfo, gender: e.target.value }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.studentInfo.dob}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        studentInfo: { ...prev.studentInfo, dob: formatDateInput(e.target.value) }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CNIC/B-Form Number</label>
                    <input
                      type="text"
                      value={formData.studentInfo.cnic}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        studentInfo: { ...prev.studentInfo, cnic: formatCnicInput(e.target.value) }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="12345-6789012-3"
                      inputMode="numeric"
                      maxLength={15}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea
                      value={formData.studentInfo.address}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        studentInfo: { ...prev.studentInfo, address: e.target.value }
                      }))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Enter complete address"
                    />
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parent/Guardian Information */}
            {activeTab === 0 && (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                  <h3 className="mb-4 text-lg font-semibold text-black">Parent/Guardian Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Father's Name *</label>
                      <input
                        type="text"
                        value={formData.parentInfo.fatherName}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            parentInfo: { ...prev.parentInfo, fatherName: e.target.value }
                          }));
                          setFieldErrors(prev => ({ ...prev, fatherName: '' }));
                        }}
                        className={`w-full rounded-lg border bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${fieldErrors.fatherName ? 'border-red-500' : 'border-slate-200'}`}
                        placeholder="Father's full name"
                      />
                      {fieldErrors.fatherName && <p className="mt-1 text-sm text-red-600">{fieldErrors.fatherName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Father's CNIC</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.parentInfo.fatherCNIC}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        parentInfo: { ...prev.parentInfo, fatherCNIC: formatCnicInput(e.target.value) }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="12345-6789012-3"
                      maxLength={15}
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formData.parentInfo.fatherPhone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parentInfo: { ...prev.parentInfo, fatherPhone: formatPhoneInput(e.target.value) }
                        }))}
                        className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0300-1234567"
                        maxLength={12}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formData.parentInfo.parentWhatsApp}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          parentInfo: { ...prev.parentInfo, parentWhatsApp: formatPhoneInput(e.target.value) }
                        }))}
                        className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="0300-1234567"
                        maxLength={12}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enrollment Information */}
            {activeTab === 0 && (
              <div className="mt-6 rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                <h3 className="mb-4 text-lg font-semibold text-black">Education</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration No.</label>
                    <input
                      type="text"
                      value={formData.education.registrationNo}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
                      placeholder="Generating..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class Roll No. *</label>
                    <input
                      type="text"
                      value={formData.education.classRoleNumber}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          education: { ...prev.education, classRoleNumber: e.target.value }
                        }));
                        setFieldErrors(prev => ({ ...prev, classRoleNumber: '' }));
                      }}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${fieldErrors.classRoleNumber ? 'border-red-500' : 'border-slate-200'}`}
                    />
                    {fieldErrors.classRoleNumber && <p className="mt-1 text-sm text-red-600">{fieldErrors.classRoleNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class &amp; Section *</label>
                    <select
                      value={formData.education.enrollmentClass}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          education: {
                            ...prev.education,
                            enrollmentClass: e.target.value,
                            group: isClassNine(e.target.value) ? prev.education.group : '',
                          }
                        }));
                        setFieldErrors(prev => ({ ...prev, classSection: '' }));
                      }}
                      className={`w-full rounded-lg border bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${fieldErrors.classSection ? 'border-red-500' : 'border-slate-200'}`}
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={`${c.name} - ${c.section}`}>
                          {c.name} - Section {c.section} (Incharge: {c.incharge})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.classSection && <p className="mt-1 text-sm text-red-600">{fieldErrors.classSection}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Admission</label>
                    <input
                      type="date"
                      value={formData.education.admissionDate}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        education: { ...prev.education, admissionDate: e.target.value }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  {isClassNine(formData.education.enrollmentClass) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                      <select
                        value={formData.education.group}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          education: { ...prev.education, group: e.target.value }
                        }))}
                        className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">Select Group</option>
                        {CLASS_9_GROUP_OPTIONS.map((group) => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Previous Class</label>
                    <select
                      value={formData.education.previousClass}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        education: { ...prev.education, previousClass: e.target.value }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Select Previous Class</option>
                      {[...new Set(classes.map((classItem) => classItem.name).filter(Boolean))].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Previous School</label>
                    <input
                      type="text"
                      value={formData.education.previousSchool}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        education: { ...prev.education, previousSchool: e.target.value }
                      }))}
                      className="w-full rounded-lg border border-slate-200 bg-white backdrop-blur-sm px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Name of previous school"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-white/50 bg-white/30 px-4 py-5 backdrop-blur-sm sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {activeTab < tabs.length - 1 ? (
                <Button 
                  onClick={() => setActiveTab(activeTab + 1)} 
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-2.5 font-medium text-white transition-all hover:shadow-lg sm:w-auto"
                >
                  Next →
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!isAdmin}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-2.5 font-medium text-white transition-all hover:shadow-lg sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {!isAdmin ? 'Only Admin Can Enroll' : 'Complete Enrollment'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

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
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-bounce {
          animation: bounce 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
