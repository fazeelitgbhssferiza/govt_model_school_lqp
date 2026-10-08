'use client';
import { useState, useEffect } from 'react';
import Tabs from '../ui/Tabs';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { validators, validateForm } from '../../../utils/validators';
import { showToast } from '../../../utils/helpers';

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

export default function EnrollmentForm({ 
  initialData = null,
  classes = [],
  onSubmit,
  onCancel,
  readOnly = false 
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    studentInfo: {
      name: '',
      dob: '',
      cnic: '',
      address: '',
      gender: ''
    },
    parentInfo: {
      fatherName: '',
      fatherCNIC: '',
      monthlyIncome: '',
      phone: ''
    },
    education: {
      registrationNo: '',
      enrollmentClass: '',
      section: '',
      previousClass: '',
      previousSchool: '',
      documents: []
    },
    fee: {
      registrationFee: 5000,
      monthlyFee: 8000,
      mode: 'Monthly',
      discount: 0,
      total: 8000
    }
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const tabs = ['Student Info', 'Parent Info', 'Education', 'Fee Section'];

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        studentInfo: {
          ...initialData.studentInfo,
          dob: formatDateForDisplay(initialData.studentInfo?.dob),
          cnic: formatCnicInput(initialData.studentInfo?.cnic),
        },
        parentInfo: {
          ...initialData.parentInfo,
          fatherCNIC: formatCnicInput(initialData.parentInfo?.fatherCNIC),
          phone: formatPhoneInput(initialData.parentInfo?.phone),
        },
      });
    }
  }, [initialData]);

  // Calculate total fee when monthly fee, discount, or mode changes
  useEffect(() => {
    const total = formData.fee.mode === 'Monthly'
      ? formData.fee.monthlyFee - formData.fee.discount
      : (formData.fee.monthlyFee * 12) - formData.fee.discount;
    
    setFormData(prev => ({
      ...prev,
      fee: { ...prev.fee, total: Math.max(0, total) }
    }));
  }, [formData.fee.monthlyFee, formData.fee.discount, formData.fee.mode]);

  const validationRules = {
    'studentInfo.name': [validators.required],
    'studentInfo.gender': [validators.required],
    'studentInfo.cnic': [validators.required, validators.cnic],
    'parentInfo.fatherName': [validators.required],
    'parentInfo.phone': [validators.required, validators.phone],
    'education.registrationNo': [validators.required],
    'education.enrollmentClass': [validators.required],
    'education.section': [validators.required]
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error for this field
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateCurrentTab = () => {
    const fieldsToValidate = [];
    
    if (activeTab === 0) {
      fieldsToValidate.push('studentInfo.name', 'studentInfo.gender', 'studentInfo.cnic');
    } else if (activeTab === 1) {
      fieldsToValidate.push('parentInfo.fatherName', 'parentInfo.phone');
    } else if (activeTab === 2) {
      fieldsToValidate.push('education.registrationNo', 'education.enrollmentClass', 'education.section');
    }
    
    const formValues = {};
    fieldsToValidate.forEach(field => {
      const [section, key] = field.split('.');
      formValues[field] = formData[section][key];
    });
    
    const rules = {};
    fieldsToValidate.forEach(field => {
      rules[field] = validationRules[field];
    });
    
    const { isValid, errors: validationErrors } = validateForm(formValues, rules);
    setErrors(validationErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentTab()) {
      if (activeTab < tabs.length - 1) {
        setActiveTab(activeTab + 1);
      } else {
        handleSubmit();
      }
    } else {
      showToast('Please fill all required fields correctly', 'error');
    }
  };

  const handlePrevious = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all tabs
    let isValid = true;
    const allErrors = {};
    
    for (const field in validationRules) {
      const [section, key] = field.split('.');
      const value = formData[section][key];
      for (const rule of validationRules[field]) {
        const error = rule(value);
        if (error) {
          allErrors[field] = error;
          isValid = false;
          break;
        }
      }
    }
    
    if (!isValid) {
      setErrors(allErrors);
      showToast('Please fix all errors before submitting', 'error');
      return;
    }

    if (
      formData.studentInfo.dob &&
      convertDisplayDateToIso(formData.studentInfo.dob) === formData.studentInfo.dob
    ) {
      showToast('Date of Birth must use dd/mm/yyyy format', 'error');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate registration number if not provided
      if (!formData.education.registrationNo) {
        formData.education.registrationNo = `REG${Date.now()}`;
      }
      
      onSubmit({
        ...formData,
        studentInfo: {
          ...formData.studentInfo,
          dob: convertDisplayDateToIso(formData.studentInfo.dob),
        },
      });
      showToast('Student enrolled successfully!', 'success');
    } catch (error) {
      showToast('Error enrolling student. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStudentInfo = () => (
    <div className="space-y-4">
      <Input
        label="Full Name *"
        value={formData.studentInfo.name}
        onChange={(e) => handleInputChange('studentInfo', 'name', e.target.value)}
        error={errors['studentInfo.name']}
        disabled={readOnly}
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Gender *"
          value={formData.studentInfo.gender}
          onChange={(e) => handleInputChange('studentInfo', 'gender', e.target.value)}
          options={[
            { value: '', label: 'Select Gender' },
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' }
          ]}
          error={errors['studentInfo.gender']}
          disabled={readOnly}
          required
        />
        
        <Input
          label="Date of Birth"
          type="text"
          value={formData.studentInfo.dob}
          onChange={(e) => handleInputChange('studentInfo', 'dob', formatDateInput(e.target.value))}
          placeholder="dd/mm/yyyy"
          inputMode="numeric"
          maxLength={10}
          disabled={readOnly}
        />
      </div>
      
        <Input
          label="CNIC/B-Form Number *"
          value={formData.studentInfo.cnic}
          onChange={(e) => handleInputChange('studentInfo', 'cnic', formatCnicInput(e.target.value))}
          placeholder="12345-6789012-3"
          inputMode="numeric"
          maxLength={15}
          error={errors['studentInfo.cnic']}
          disabled={readOnly}
          required
        />
      
      <Input
        label="Address"
        value={formData.studentInfo.address}
        onChange={(e) => handleInputChange('studentInfo', 'address', e.target.value)}
        textarea
        disabled={readOnly}
      />
    </div>
  );

  const renderParentInfo = () => (
    <div className="space-y-4">
      <Input
        label="Father's Name *"
        value={formData.parentInfo.fatherName}
        onChange={(e) => handleInputChange('parentInfo', 'fatherName', e.target.value)}
        error={errors['parentInfo.fatherName']}
        disabled={readOnly}
        required
      />
      
      <Input
        label="Father's CNIC"
        value={formData.parentInfo.fatherCNIC}
        onChange={(e) => handleInputChange('parentInfo', 'fatherCNIC', formatCnicInput(e.target.value))}
        placeholder="12345-6789012-3"
        inputMode="numeric"
        maxLength={15}
        disabled={readOnly}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Phone Number *"
          type="tel"
          value={formData.parentInfo.phone}
          onChange={(e) => handleInputChange('parentInfo', 'phone', formatPhoneInput(e.target.value))}
          placeholder="0300-1234567"
          inputMode="numeric"
          maxLength={12}
          error={errors['parentInfo.phone']}
          disabled={readOnly}
          required
        />
        
        <Input
          label="Monthly Income"
          type="number"
          value={formData.parentInfo.monthlyIncome}
          onChange={(e) => handleInputChange('parentInfo', 'monthlyIncome', e.target.value)}
          placeholder="Enter amount"
          disabled={readOnly}
        />
      </div>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-4">
      <Input
        label="Registration Number *"
        value={formData.education.registrationNo}
        onChange={(e) => handleInputChange('education', 'registrationNo', e.target.value)}
        error={errors['education.registrationNo']}
        disabled={readOnly}
        required
      />
      
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Enrollment Class *"
          value={formData.education.enrollmentClass}
          onChange={(e) => handleInputChange('education', 'enrollmentClass', e.target.value)}
          options={[
            { value: '', label: 'Select Class' },
            ...classes.map(c => ({ value: c.name, label: c.name }))
          ]}
          error={errors['education.enrollmentClass']}
          disabled={readOnly}
          required
        />
        
        <Select
          label="Section *"
          value={formData.education.section}
          onChange={(e) => handleInputChange('education', 'section', e.target.value)}
          options={[
            { value: '', label: 'Select Section' },
            { value: 'A', label: 'Section A' },
            { value: 'B', label: 'Section B' },
            { value: 'C', label: 'Section C' }
          ]}
          error={errors['education.section']}
          disabled={readOnly}
          required
        />
      </div>
      
      <Input
        label="Previous Class"
        value={formData.education.previousClass}
        onChange={(e) => handleInputChange('education', 'previousClass', e.target.value)}
        disabled={readOnly}
      />
      
      <Input
        label="Previous School"
        value={formData.education.previousSchool}
        onChange={(e) => handleInputChange('education', 'previousSchool', e.target.value)}
        disabled={readOnly}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Documents
        </label>
        <div className="space-y-2">
          {['B-Form', 'Father CNIC', 'Previous School Certificate', 'Medical Certificate'].map(doc => (
            <label key={doc} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.education.documents.includes(doc)}
                onChange={(e) => {
                  const docs = e.target.checked
                    ? [...formData.education.documents, doc]
                    : formData.education.documents.filter(d => d !== doc);
                  handleInputChange('education', 'documents', docs);
                }}
                disabled={readOnly}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{doc}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFee = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Registration Fee"
          type="number"
          value={formData.fee.registrationFee}
          onChange={(e) => handleInputChange('fee', 'registrationFee', parseFloat(e.target.value) || 0)}
          disabled={readOnly}
        />
        
        <Input
          label="Monthly Fee"
          type="number"
          value={formData.fee.monthlyFee}
          onChange={(e) => handleInputChange('fee', 'monthlyFee', parseFloat(e.target.value) || 0)}
          disabled={readOnly}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Fee Mode"
          value={formData.fee.mode}
          onChange={(e) => handleInputChange('fee', 'mode', e.target.value)}
          options={[
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Annual', label: 'Annual' }
          ]}
          disabled={readOnly}
        />
        
        <Input
          label="Discount"
          type="number"
          value={formData.fee.discount}
          onChange={(e) => handleInputChange('fee', 'discount', parseFloat(e.target.value) || 0)}
          disabled={readOnly}
        />
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Fee:</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            PKR {formData.fee.total.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {formData.fee.mode === 'Annual' ? 'Annual Package' : 'Monthly Payment'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} disabled={readOnly} />
      
      <div className="p-6">
        {activeTab === 0 && renderStudentInfo()}
        {activeTab === 1 && renderParentInfo()}
        {activeTab === 2 && renderEducation()}
        {activeTab === 3 && renderFee()}
        
        <div className="flex justify-between mt-8">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={activeTab === 0 || readOnly}
          >
            Previous
          </Button>
          
          {!readOnly && (
            <Button onClick={handleNext} disabled={submitting}>
              {submitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : activeTab === tabs.length - 1 ? (
                'Submit Enrollment'
              ) : (
                'Next'
              )}
            </Button>
          )}
          
          {readOnly && (
            <Button variant="secondary" onClick={onCancel}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
