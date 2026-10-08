'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { hasPermission } from '../../../authservice/auth';
import { useAuth } from '../../../authservice/useAuth';
import Button from '../../../components/ui/Button';
import Tabs from '../../../components/ui/Tabs';
import { showToast } from '../../../../utils/helpers';
import classService from '../../../../services/classService';

// Types and Constants
const StudentFormData = {
  id: '',
  name: '',
  regNo: '',
  classRoleNumber: '',
  fatherName: '',
  fatherCNIC: '',
  fatherPhone: '',
  parentWhatsApp: '',
  gender: 'Male',
  dob: '',
  cnic: '',
  address: '',
  class: '',
  section: '',
  group: '',
  admissionDate: '',
  previousSchool: '',
  previousClass: '',
  registrationNo: '',
  enrollmentClass: '',
  photo: null
};

const OtherCharge = {
  books: 0,
  notebooks: 0,
  stationary: 0,
  labCharges: 0,
  sports: 0,
  uniform: 0,
  otherCharges: 0
};

const OtherChargeType = {
  books: 'One-time',
  notebooks: 'One-time',
  stationary: 'One-time',
  labCharges: 'Monthly',
  sports: 'Annual',
  uniform: 'One-time',
  otherCharges: 'One-time'
};

const FeeStructure = {
  registrationFee: 5000,
  monthlyFee: 8000,
  mode: 'Monthly',
  discount: 0,
  annualDiscount: 0,
  total: 8000,
  otherCharges: { ...OtherCharge },
  otherChargesType: { ...OtherChargeType }
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CLASS_9_GROUP_OPTIONS = [
  'Science Group With Biology',
  'Science Group With Computer Sc.',
  'Arts Group',
];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHONE_NUMBER_PATTERN = /^03\d{2}-\d{7}$/;
const formatPhoneNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
};
const formatDateInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
const formatDateForDisplay = (value) => {
  const stringValue = String(value || '').trim();
  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return isoMatch ? `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}` : formatDateInput(stringValue);
};
const isValidDisplayDate = (value) => {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day);
};
const CHARGE_TYPES = [
  { value: 'One-time', label: 'One-time' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Annual', label: 'Annual' }
];


// Components
const StatusBadge = ({ status }) => {
  const getStatusStyles = () => {
    switch(status?.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {status}
    </span>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-[60vh]">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-slate-500 font-medium">Loading student information...</p>
    </div>
  </div>
);

const AdminNotice = () => (
  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
    <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Only administrators can edit or delete student information.
    </p>
  </div>
);

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, permissions } = useAuth();
  const canDeleteStudent = hasPermission(permissions, 'STUDENTS_DELETE');
  const canDeleteFee = hasPermission(permissions, 'FEES_DELETE');
  const studentId = params?.id ? decodeURIComponent(params.id) : '';

  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  
  const photoInputRef = useRef(null);
  
  const [formData, setFormData] = useState({ ...StudentFormData });
  const [fieldErrors, setFieldErrors] = useState({});
  const [feeRecords, setFeeRecords] = useState([]);
  const [feeStructure, setFeeStructure] = useState({ ...FeeStructure });
  const [billFilter, setBillFilter] = useState({
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: ''
  });

  const tabs = [
    { id: 0, name: '', icon: '👨‍🎓' },
  ];

  // Fee Calculation Functions
  const calculateTotalOtherCharges = useCallback(() => {
    const charges = feeStructure.otherCharges;
    const types = feeStructure.otherChargesType;
    let total = 0;
    
    const chargeItems = [
      { value: charges.books, type: types.books },
      { value: charges.notebooks, type: types.notebooks },
      { value: charges.stationary, type: types.stationary },
      { value: charges.labCharges, type: types.labCharges },
      { value: charges.sports, type: types.sports },
      { value: charges.uniform, type: types.uniform },
      { value: charges.otherCharges, type: types.otherCharges }
    ];
    
    chargeItems.forEach(item => {
      if (item.type === 'Monthly') {
        total += item.value * 12;
      } else {
        total += item.value;
      }
    });
    
    return total;
  }, [feeStructure]);

  const calculateMonthlyOtherCharges = useCallback(() => {
    const charges = feeStructure.otherCharges;
    const types = feeStructure.otherChargesType;
    let monthlyTotal = 0;
    
    const chargeItems = [
      { value: charges.books, type: types.books },
      { value: charges.notebooks, type: types.notebooks },
      { value: charges.stationary, type: types.stationary },
      { value: charges.labCharges, type: types.labCharges },
      { value: charges.sports, type: types.sports },
      { value: charges.uniform, type: types.uniform },
      { value: charges.otherCharges, type: types.otherCharges }
    ];
    
    chargeItems.forEach(item => {
      if (item.type === 'Monthly') {
        monthlyTotal += item.value;
      } else if (item.type === 'Annual') {
        monthlyTotal += item.value / 12;
      }
    });
    
    return monthlyTotal;
  }, [feeStructure]);

  const calculateMonthlyPayable = useCallback(() => {
    let monthlyAmount = feeStructure.monthlyFee - (feeStructure.mode === 'Monthly' ? feeStructure.discount : 0);
    monthlyAmount += calculateMonthlyOtherCharges();
    return monthlyAmount;
  }, [feeStructure, calculateMonthlyOtherCharges]);

  const calculateAnnualPayable = useCallback(() => {
    let annualAmount = (feeStructure.monthlyFee * 12) - (feeStructure.annualDiscount || 0);
    annualAmount += calculateTotalOtherCharges();
    return annualAmount;
  }, [feeStructure, calculateTotalOtherCharges]);

  const getOtherChargesBreakdown = useCallback(() => {
    const charges = feeStructure.otherCharges;
    const types = feeStructure.otherChargesType;
    const breakdown = [];
    
    const chargeItems = [
      { label: 'Books', name: 'books', value: charges.books, type: types.books },
      { label: 'Note Books', name: 'notebooks', value: charges.notebooks, type: types.notebooks },
      { label: 'Stationary', name: 'stationary', value: charges.stationary, type: types.stationary },
      { label: 'Lab Charges', name: 'labCharges', value: charges.labCharges, type: types.labCharges },
      { label: 'Sports', name: 'sports', value: charges.sports, type: types.sports },
      { label: 'Uniform', name: 'uniform', value: charges.uniform, type: types.uniform },
      { label: 'Other Charges', name: 'otherCharges', value: charges.otherCharges, type: types.otherCharges }
    ];
    
    chargeItems.forEach(item => {
      if (item.value > 0) {
        breakdown.push({
          label: item.label,
          amount: item.value,
          type: item.type,
          annualAmount: item.type === 'Monthly' ? item.value * 12 : item.value
        });
      }
    });
    
    return breakdown;
  }, [feeStructure]);

  const getMonthNumber = useCallback((monthName) => MONTHS.indexOf(monthName), []);

  const calculateSummary = useCallback(() => {
    const totalFee = feeRecords.reduce((sum, record) => sum + record.amount, 0);
    const paidAmount = feeRecords.filter(r => r.status === 'Paid').reduce((sum, record) => sum + record.amount, 0);
    const pendingAmount = totalFee - paidAmount;
    return { totalFee, paidAmount, pendingAmount };
  }, [feeRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...feeRecords];
    
    if (billFilter.startMonth && billFilter.startYear) {
      const startDate = new Date(parseInt(billFilter.startYear), getMonthNumber(billFilter.startMonth));
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.year, getMonthNumber(record.month));
        return recordDate >= startDate;
      });
    }
    
    if (billFilter.endMonth && billFilter.endYear) {
      const endDate = new Date(parseInt(billFilter.endYear), getMonthNumber(billFilter.endMonth));
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.year, getMonthNumber(record.month));
        return recordDate <= endDate;
      });
    }
    
    return filtered;
  }, [feeRecords, billFilter, getMonthNumber]);

  // Photo Handling
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
      setStudentPhotoPreview(reader.result);
      setFormData(prev => ({ ...prev, photo: reader.result }));
      showToast('Photo uploaded successfully!', 'success');
    };
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback(() => {
    setStudentPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo: null }));
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    showToast('Photo removed', 'info');
  }, []);

  // Other Charges Handlers
  const handleOtherChargeChange = useCallback((chargeName, value) => {
    setFeeStructure(prev => ({
      ...prev,
      otherCharges: { ...prev.otherCharges, [chargeName]: value }
    }));
  }, []);

  const handleOtherChargeTypeChange = useCallback((chargeName, type) => {
    setFeeStructure(prev => ({
      ...prev,
      otherChargesType: { ...prev.otherChargesType, [chargeName]: type }
    }));
  }, []);

  // Fee Management
  const handleEditFeeRecord = useCallback((record, index) => {
    setEditingRecord({ ...record, index });
    setShowEditFeeModal(true);
  }, []);

  const handleSaveFeeRecord = useCallback(() => {
    if (!editingRecord) return;
    
    const updatedRecords = [...feeRecords];
    updatedRecords[editingRecord.index] = {
      month: editingRecord.month,
      year: editingRecord.year,
      amount: editingRecord.amount,
      status: editingRecord.status,
      paidDate: editingRecord.status === 'Paid' ? editingRecord.paidDate || new Date().toISOString().split('T')[0] : null
    };
    setFeeRecords(updatedRecords);
    setShowEditFeeModal(false);
    setEditingRecord(null);
    showToast('Fee record updated successfully!', 'success');
  }, [editingRecord, feeRecords]);

  const handleAddFeeRecord = useCallback(() => {
    const newRecord = {
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear(),
      amount: calculateMonthlyPayable(),
      status: 'Pending',
      paidDate: null
    };
    setFeeRecords(prev => [...prev, newRecord]);
    showToast('New fee record added!', 'success');
  }, [calculateMonthlyPayable]);

  const handleDeleteFeeRecord = useCallback((index) => {
    if (!canDeleteFee) {
      showToast('You do not have permission to delete fee records.', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this fee record?')) {
      setFeeRecords(prev => prev.filter((_, i) => i !== index));
      showToast('Fee record deleted successfully!', 'success');
    }
  }, [canDeleteFee]);

  const handleUpdateFeeStructure = useCallback(() => {
    setFeeStructure(prev => ({ ...prev, total: calculateAnnualPayable() }));
    showToast('Fee structure updated successfully!', 'success');
    
    const shouldUpdateRecords = window.confirm('Do you want to update existing fee records with the new amount?');
    if (shouldUpdateRecords) {
      setFeeRecords(prev => prev.map(record => ({ ...record, amount: calculateMonthlyPayable() })));
      showToast('Fee records updated with new amount!', 'success');
    }
  }, [calculateAnnualPayable, calculateMonthlyPayable]);

  // Print and PDF Functions
  const handlePrintProfile = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const summary = calculateSummary();
    const chargesBreakdown = getOtherChargesBreakdown();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Profile - ${formData.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
          .profile-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #0d9488, #059669); color: white; padding: 30px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 5px; }
          .photo-section { text-align: center; margin-top: -50px; margin-bottom: 20px; }
          .student-photo { width: 120px; height: 120px; border-radius: 60px; border: 4px solid white; box-shadow: 0 5px 15px rgba(0,0,0,0.2); display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0d9488, #059669); }
          .student-photo img { width: 100%; height: 100%; border-radius: 60px; object-fit: cover; }
          .student-photo span { font-size: 48px; }
          .content { padding: 30px; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .info-card { background: #f8fafc; padding: 15px; border-radius: 12px; border-left: 4px solid #0d9488; }
          .info-card h3 { font-size: 14px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-card p { font-size: 16px; font-weight: 600; color: #1e293b; }
          .section-title { font-size: 18px; font-weight: 600; color: #0d9488; margin: 20px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
          .charges-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
          .charges-table th, .charges-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          @media print { body { padding: 0; background: white; } .profile-container { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="profile-container">
          <div class="header">
            <h1>Student Profile</h1>
            <p>Academic Information & Records</p>
          </div>
          <div class="photo-section">
            <div class="student-photo">
              ${studentPhotoPreview ? `<img src="${studentPhotoPreview}" alt="Student Photo" />` : '<span>📸</span>'}
            </div>
          </div>
          <div class="content">
            <div class="info-grid">
              <div class="info-card"><h3>Student Name</h3><p>${formData.name || '—'}</p></div>
              <div class="info-card"><h3>Registration No</h3><p>${formData.regNo || '—'}</p></div>
              <div class="info-card"><h3>Class & Section</h3><p>${formData.class} - ${formData.section}</p></div>
              <div class="info-card"><h3>Gender</h3><p>${formData.gender || '—'}</p></div>
              <div class="info-card"><h3>Date of Birth</h3><p>${formData.dob || '—'}</p></div>
            </div>
            <div class="section-title">Parent Information</div>
            <div class="info-grid">
              <div class="info-card"><h3>Father's Name</h3><p>${formData.fatherName || '—'}</p></div>
            </div>
            <div class="section-title">Fee Summary</div>
            <div class="info-grid">
              <div class="info-card"><h3>Total Fee</h3><p>PKR ${summary.totalFee.toLocaleString()}</p></div>
              <div class="info-card"><h3>Paid Amount</h3><p>PKR ${summary.paidAmount.toLocaleString()}</p></div>
              <div class="info-card"><h3>Pending Amount</h3><p>PKR ${summary.pendingAmount.toLocaleString()}</p></div>
            </div>
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>This is an official student profile document</p>
          </div>
        </div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [formData, studentPhotoPreview, calculateSummary, getOtherChargesBreakdown]);

  // Save as PDF function (triggers print)
  const handleSaveAsPDF = useCallback(() => {
    handlePrintProfile();
  }, [handlePrintProfile]);

  // Save updated student data to localStorage
  const saveToLocalStorage = useCallback((updatedStudent) => {
    const existingStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
    const studentIndex = existingStudents.findIndex(s => s.id === updatedStudent.id);
    
    if (studentIndex !== -1) {
      existingStudents[studentIndex] = updatedStudent;
    } else {
      existingStudents.push(updatedStudent);
    }
    
    localStorage.setItem('school_students', JSON.stringify(existingStudents));
    
    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('studentUpdated', { detail: updatedStudent }));
  }, []);

  const populateStudentForm = useCallback((student) => {
    if (!student) return false;

    const [enrollmentClassName = '', enrollmentSection = ''] = String(
      student.enrollmentClass || ''
    ).split(' - ');

    setFormData({
      id: student.id || '',
      name: student.name || student.fullName || '',
      regNo: student.regNo || student.registrationNumber || '',
      classRoleNumber: student.classRoleNumber || '',
      fatherName: student.fatherName || '',
      fatherCNIC: student.fatherCNIC || '',
      fatherPhone: formatPhoneNumber(student.fatherPhone),
      parentWhatsApp: formatPhoneNumber(student.parentWhatsApp || student.whatsappNumber),
      gender: student.gender || 'Male',
      dob: formatDateForDisplay(student.dob),
      cnic: student.cnic || student.cnicBForm || '',
      address: student.address || '',
      class: student.class || student.className || enrollmentClassName,
      section: student.section || enrollmentSection,
      group: student.group || '',
      admissionDate: formatDateForDisplay(student.admissionDate),
      previousSchool: student.previousSchool || '',
      previousClass: student.previousClass || '',
      registrationNo: student.registrationNo || '',
      enrollmentClass: student.enrollmentClass || '',
      photo: student.photo || null
    });

    setStudentPhotoPreview(student.photo || null);

    if (student.feeStructure) {
      setFeeStructure({
        ...student.feeStructure,
        otherCharges: student.feeStructure.otherCharges || { ...OtherCharge },
        otherChargesType: student.feeStructure.otherChargesType || { ...OtherChargeType }
      });
    } else {
      setFeeStructure({ ...FeeStructure });
    }

    setFeeRecords(student.feeRecords || [
      { month: 'January', year: 2024, amount: 8000, status: 'Paid', paidDate: '2024-01-10' },
      { month: 'February', year: 2024, amount: 8000, status: 'Paid', paidDate: '2024-02-08' },
      { month: 'March', year: 2024, amount: 8000, status: 'Pending', paidDate: null }
    ]);

    setLoading(false);

    return true;
  }, []);

  // Data Loading
  useEffect(() => {
    const savedStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
    const matchedStudent = savedStudents.find((student) =>
      String(student.id || student._id || student.regNo) === String(studentId)
    );

    if (populateStudentForm(matchedStudent)) {
      return;
    }

    const studentDataParam = searchParams.get('data');
    if (studentDataParam) {
      try {
        const student = JSON.parse(decodeURIComponent(studentDataParam));
        if (populateStudentForm(student)) {
          return;
        }
      } catch (error) {
        console.error('Error parsing student data:', error);
      }
    }

    showToast('No student data found', 'error');
    router.back();
  }, [searchParams, router, studentId, populateStudentForm]);

  // Load classes for dropdown
  useEffect(() => {
    classService.getAll().then((result) => {
      setClasses(result.success && Array.isArray(result.data) ? result.data : []);
    });
  }, []);

  // Form Handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    const errorKey = name === 'name' ? 'fullName'
      : name === 'classRoleNumber' ? 'classRoleNumber'
        : name === 'class' || name === 'section' ? 'classSection'
          : name;
    setFieldErrors(prev => ({ ...prev, [errorKey]: '' }));
  }, []);

  const handlePhoneChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
  }, []);

  const handleDateChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: formatDateInput(value) }));
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!isAdmin) {
      showToast('Only admin can update student information', 'error');
      return;
    }

    const validationErrors = {};
    if (!formData.name.trim()) validationErrors.fullName = 'Full Name is required';
    if (!formData.fatherName.trim()) validationErrors.fatherName = "Father's Name is required";
    if (!formData.classRoleNumber.trim()) validationErrors.classRoleNumber = 'Class Roll No. is required';
    if (!formData.class.trim() || !formData.section.trim()) validationErrors.classSection = 'Class & Section is required';
    if (formData.classRoleNumber.trim() && formData.class.trim() && formData.section.trim()) {
      const existingStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
      const duplicateRoleNumber = existingStudents.some((student) => {
        const existingId = student.id ?? student._id ?? student.regNo;
        return String(existingId) !== String(studentId) &&
          String(student.classRoleNumber || '').trim().toLowerCase() === formData.classRoleNumber.trim().toLowerCase() &&
          String(student.class || '').trim() === formData.class.trim() &&
          String(student.section || '').trim() === formData.section.trim();
      });
      if (duplicateRoleNumber) validationErrors.classRoleNumber = 'This Class Roll No. is already assigned in this class and section';
    }
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (
      (formData.fatherPhone && !PHONE_NUMBER_PATTERN.test(formData.fatherPhone)) ||
      (formData.parentWhatsApp && !PHONE_NUMBER_PATTERN.test(formData.parentWhatsApp))
    ) {
      showToast('Phone and WhatsApp numbers must use the format 0300-1234567', 'error');
      return;
    }

    if (
      (formData.dob && !isValidDisplayDate(formData.dob)) ||
      (formData.admissionDate && !isValidDisplayDate(formData.admissionDate))
    ) {
      showToast('Date of Birth and Date of Admission must use the format dd/mm/yyyy', 'error');
      return;
    }

    setSaving(true);
    
    const updatedStudent = {
      ...formData,
      feeRecords,
      feeStructure,
      lastUpdated: new Date().toISOString()
    };
    
    saveToLocalStorage(updatedStudent);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    showToast('Student information updated successfully!', 'success');
    setShowUpdateSuccessModal(true);
    setSaving(false);
  }, [isAdmin, formData, feeRecords, feeStructure, saveToLocalStorage, studentId]);

  const handleDelete = useCallback(async () => {
    if (!canDeleteStudent) {
      showToast('You do not have permission to delete students.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${formData.name}? This action cannot be undone.`
    );

    if (confirmed) {
      setSaving(true);
      
      const existingStudents = JSON.parse(localStorage.getItem('school_students') || '[]');
      const filteredStudents = existingStudents.filter(s => s.id !== formData.id);
      localStorage.setItem('school_students', JSON.stringify(filteredStudents));
      
      window.dispatchEvent(new CustomEvent('studentDeleted', { detail: { id: formData.id } }));
      
      showToast(`${formData.name} has been deleted successfully`, 'success');
      setSaving(false);
      router.push('/frontEnd/students');
    }
  }, [canDeleteStudent, formData.name, formData.id, router]);

  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  const generateBill = useCallback(() => setShowBillModal(true), []);
  const handlePrintBill = useCallback(() => {
    const printContent = document.getElementById('bill-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fee Bill - ${formData.name}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 40px; }
              .bill-container { max-width: 800px; margin: 0 auto; }
              .text-center { text-align: center; }
              .mb-4 { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background-color: #f5f5f5; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="bill-container">
              ${printContent.innerHTML}
            </div>
            <script>window.onload = () => window.print(); setTimeout(() => window.close(), 500);<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  }, [formData.name]);

  const summary = calculateSummary();
  const chargesBreakdown = getOtherChargesBreakdown();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30 px-4 pb-8 pt-0 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-white/20 bg-gradient-to-r from-blue-600/90 to-emerald-600/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur-sm">
              ✏️
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Enrollment</h1>
              <p className="text-sm text-blue-100">Update student enrollment information</p>
            </div>
            <button
              type="button"
              onClick={handleExit}
              className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 sm:ml-auto sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-2xl backdrop-blur-xl">
          <Tabs tabs={tabs.map((tab) => tab.name)} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="p-4 sm:p-6">
            {/* Student Info Tab */}
            {activeTab === 0 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50/50 to-emerald-50/50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white">
                        {studentPhotoPreview ? (
                          <img src={studentPhotoPreview} alt="Student preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="text-xs text-blue-600 mt-1">Add photo</p>
                          </div>
                        )}
                      </div>
                      
                      {isAdmin && (
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button onClick={() => photoInputRef.current?.click()} className="p-2 bg-white rounded-full hover:bg-blue-50 transition-colors" title="Upload photo">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          {studentPhotoPreview && (
                            <button onClick={removePhoto} className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors" title="Remove photo">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={!isAdmin} />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1">Student Photo</h3>
                      <p className="text-sm text-slate-500 mb-3">Upload a clear passport-size photo for student ID card and records.</p>
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <Button onClick={() => photoInputRef.current?.click()} className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-sm px-4 py-2 rounded-lg hover:shadow-lg transition-all">
                            📸 Upload Photo
                          </Button>
                          <p className="text-xs text-slate-400 self-center">JPG, PNG (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                  <h3 className="mb-4 text-lg font-semibold text-black">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={!isAdmin}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed ${fieldErrors.fullName ? 'border-red-500' : 'border-slate-200'}`} />
                    {fieldErrors.fullName && <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input type="text" name="dob" value={formData.dob} onChange={handleDateChange} disabled={!isAdmin}
                      inputMode="numeric" maxLength={10} placeholder="dd/mm/yyyy"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CNIC/B-Form Number</label>
                    <input type="text" name="cnic" value={formData.cnic} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parent Information */}
            {activeTab === 0 && (
              <div className="mt-6 rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                <h3 className="mb-4 text-lg font-semibold text-black">Parent/Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Father's Name *</label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} disabled={!isAdmin}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed ${fieldErrors.fatherName ? 'border-red-500' : 'border-slate-200'}`} />
                    {fieldErrors.fatherName && <p className="mt-1 text-sm text-red-600">{fieldErrors.fatherName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Father's CNIC</label>
                    <input type="text" name="fatherCNIC" value={formData.fatherCNIC} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                    <input type="tel" name="fatherPhone" value={formData.fatherPhone ?? ''} onChange={handlePhoneChange} disabled={!isAdmin}
                      inputMode="numeric" pattern="03[0-9]{2}-[0-9]{7}" maxLength={12} placeholder="0300-1234567"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp No.</label>
                    <input type="tel" name="parentWhatsApp" value={formData.parentWhatsApp ?? ''} onChange={handlePhoneChange} disabled={!isAdmin}
                      inputMode="numeric" pattern="03[0-9]{2}-[0-9]{7}" maxLength={12} placeholder="0300-1234567"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  </div>
                </div>
            )}

            {/* Education Information */}
            {activeTab === 0 && (
              <div className="mt-6 rounded-xl border border-gray-300 bg-gray-200 p-6 [&_label]:text-black">
                <h3 className="mb-4 text-lg font-semibold text-black">Education</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration No.</label>
                    <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class Roll No. *</label>
                    <input type="text" name="classRoleNumber" value={formData.classRoleNumber} onChange={handleInputChange} disabled={!isAdmin}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed ${fieldErrors.classRoleNumber ? 'border-red-500' : 'border-slate-200'}`} />
                    {fieldErrors.classRoleNumber && <p className="mt-1 text-sm text-red-600">{fieldErrors.classRoleNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Class *</label>
                    <select name="class" value={formData.class} onChange={handleInputChange} disabled={!isAdmin}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed ${fieldErrors.classSection ? 'border-red-500' : 'border-slate-200'}`}>
                      <option value="">Select Class</option>
                      {[...new Set(classes.map(c => c.name))].map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Section *</label>
                    <select name="section" value={formData.section} onChange={handleInputChange} disabled={!isAdmin}
                      className={`w-full rounded-lg border bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed ${fieldErrors.classSection ? 'border-red-500' : 'border-slate-200'}`}>
                      <option value="">Select Section</option>
                      {classes.filter(c => c.name === formData.class).map(c => (
                        <option key={c.section} value={c.section}>Section {c.section}</option>
                      ))}
                    </select>
                    {fieldErrors.classSection && <p className="mt-1 text-sm text-red-600">{fieldErrors.classSection}</p>}
                  </div>
                  {/^(?:class|grade)?\s*9(?:th)?$/i.test(String(formData.class || '').trim()) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                      <select name="group" value={formData.group} onChange={handleInputChange} disabled={!isAdmin}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed">
                        <option value="">Select Group</option>
                        {CLASS_9_GROUP_OPTIONS.map((group) => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Admission</label>
                    <input type="text" name="admissionDate" value={formData.admissionDate} onChange={handleDateChange} disabled={!isAdmin}
                      inputMode="numeric" maxLength={10} placeholder="dd/mm/yyyy"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Previous School</label>
                    <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Previous Class</label>
                    <input type="text" name="previousClass" value={formData.previousClass} onChange={handleInputChange} disabled={!isAdmin}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all disabled:bg-white disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Action Buttons */}
          <div className="px-6 py-5 bg-slate-50/50 border-t border-blue-200/50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="order-2 sm:order-1">
                <Button onClick={handleDelete} disabled={!canDeleteStudent || saving} className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-lg px-6 py-2.5 disabled:opacity-50 transition-all duration-200">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Student
                </Button>
              </div>
              <div className="flex gap-3 order-1 sm:order-2">
                <Button onClick={() => setShowProfileModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-lg px-6 py-2.5 transition-all duration-200">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </Button>
                <Button onClick={handleExit} variant="secondary" disabled={saving} className="border border-slate-300 hover:bg-slate-100 rounded-lg px-6 py-2.5 transition-all duration-200">
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit
                </Button>
                <Button onClick={handleUpdate} disabled={!isAdmin || saving} className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-md rounded-lg px-6 py-2.5 disabled:opacity-50 transition-all duration-200">
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Student
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!isAdmin && <AdminNotice />}
      </div>

      {/* Profile View Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-blue-100 dark:border-blue-800 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Student Profile</h2>
                <button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-6 text-white">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white/20 flex items-center justify-center">
                    {studentPhotoPreview ? (
                      <img src={studentPhotoPreview} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👨‍🎓</span>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold">{formData.name}</h2>
                    <p className="text-blue-100">Registration No: {formData.regNo}</p>
                    <p className="text-blue-100 text-sm">{formData.class} - {formData.section}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-3">👤 Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Full Name</p><p className="font-medium">{formData.name}</p></div>
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Gender</p><p className="font-medium">{formData.gender}</p></div>
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Date of Birth</p><p className="font-medium">{formData.dob || '—'}</p></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-3">👨‍👩‍👧 Parent Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Father's Name</p><p className="font-medium">{formData.fatherName || '—'}</p></div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-blue-600 mb-3">💰 Fee Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Total Fee</p>
                    <p className="text-lg font-bold text-emerald-700">PKR {summary.totalFee.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-emerald-600">Paid</p>
                    <p className="text-lg font-bold text-emerald-700">PKR {summary.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-600">Pending</p>
                    <p className="text-lg font-bold text-amber-700">PKR {summary.pendingAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-50 p-6 border-t border-blue-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowProfileModal(false)}>Close</Button>
              <Button onClick={handleSaveAsPDF} className="bg-emerald-600 text-white">💾 Save as PDF</Button>
              <Button onClick={handlePrintProfile} className="bg-blue-600 text-white">🖨️ Print Profile</Button>
            </div>
          </div>
        </div>
      )}

      {showUpdateSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-emerald-700 bg-emerald-600 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Success</h2>
            </div>
            <div className="px-6 py-6">
              <p className="text-base font-semibold text-black">
                Student Data is successfully updated
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <Button
                onClick={() => {
                  setShowUpdateSuccessModal(false);
                  handleExit();
                }}
                className="bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Fee Record Modal */}
      {showEditFeeModal && editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Edit Fee Record</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select value={editingRecord.month} onChange={(e) => setEditingRecord({ ...editingRecord, month: e.target.value })} className="w-full rounded-lg border px-3 py-2">
                  {MONTHS.map(month => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input type="number" value={editingRecord.year} onChange={(e) => setEditingRecord({ ...editingRecord, year: parseInt(e.target.value) })} className="w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (PKR)</label>
                <input type="number" value={editingRecord.amount} onChange={(e) => setEditingRecord({ ...editingRecord, amount: parseInt(e.target.value) })} className="w-full rounded-lg border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={editingRecord.status} onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value, paidDate: e.target.value === 'Paid' ? new Date().toISOString().split('T')[0] : null })} className="w-full rounded-lg border px-3 py-2">
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              {editingRecord.status === 'Paid' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Paid Date</label>
                  <input type="date" value={editingRecord.paidDate || ''} onChange={(e) => setEditingRecord({ ...editingRecord, paidDate: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowEditFeeModal(false)}>Cancel</Button>
              <Button onClick={handleSaveFeeRecord} className="bg-blue-600 text-white">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Generation Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">Generate Fee Bill</h3>
            <div id="bill-content">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Fee Bill</h2>
                <p className="text-gray-600">Student Fee Statement</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 pb-4 border-b">
                <div>
                  <p><strong>Student Name:</strong> {formData.name}</p>
                  <p><strong>Registration No:</strong> {formData.regNo}</p>
                  <p><strong>Class:</strong> {formData.class} - {formData.section}</p>
                </div>
                <div className="text-right">
                  <p><strong>Father's Name:</strong> {formData.fatherName}</p>
                  <p><strong>Generated Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <table className="w-full mb-6">
                <thead className="bg-gray-50">
                  <tr><th className="text-left py-2">Month</th><th className="text-left py-2">Year</th><th className="text-right py-2">Amount (PKR)</th><th className="text-left py-2">Status</th></tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">{record.month}</td><td className="py-2">{record.year}</td>
                      <td className="text-right py-2">{record.amount.toLocaleString()}</td><td className="py-2">{record.status}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr><td colSpan="2" className="py-2 font-bold">Total Amount:</td><td className="text-right py-2 font-bold">PKR {filteredRecords.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}</td><td></td></tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowBillModal(false)}>Close</Button>
              <Button onClick={handlePrintBill} className="bg-blue-600 text-white">🖨️ Print Bill</Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
