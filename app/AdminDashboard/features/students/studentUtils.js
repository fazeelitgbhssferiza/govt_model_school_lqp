import { formatDate, formatCurrency } from '../../../utils/helpers';

// Generate a unique registration number
export const generateRegistrationNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${random}`;
};

// Calculate student age from date of birth
export const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Get student status based on fee payment and attendance
export const getStudentStatus = (student) => {
  const latestFee = student.feeRecords?.[student.feeRecords.length - 1];
  const hasOutstandingFee = latestFee?.status !== 'Paid';
  
  // This would normally come from attendance data
  const hasRecentAbsences = Math.random() > 0.7;
  
  if (hasOutstandingFee && hasRecentAbsences) return 'Critical';
  if (hasOutstandingFee) return 'Fee Pending';
  if (hasRecentAbsences) return 'Low Attendance';
  return 'Active';
};

// Get status color for UI
export const getStatusColor = (status) => {
  const colors = {
    'Active': 'bg-green-100 text-green-800',
    'Fee Pending': 'bg-yellow-100 text-yellow-800',
    'Low Attendance': 'bg-orange-100 text-orange-800',
    'Critical': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Calculate fee summary for a student
export const calculateFeeSummary = (student) => {
  if (!student.feeRecords) return null;
  
  const totalFee = student.feeRecords.reduce((sum, record) => sum + record.amount, 0);
  const paidAmount = student.feeRecords
    .filter(record => record.status === 'Paid')
    .reduce((sum, record) => sum + record.amount, 0);
  const pendingAmount = student.feeRecords
    .filter(record => record.status === 'Pending')
    .reduce((sum, record) => sum + record.amount, 0);
  const unpaidAmount = totalFee - paidAmount - pendingAmount;
  
  return {
    totalFee,
    paidAmount,
    pendingAmount,
    unpaidAmount,
    paidPercentage: (paidAmount / totalFee) * 100,
    pendingPercentage: (pendingAmount / totalFee) * 100,
    unpaidPercentage: (unpaidAmount / totalFee) * 100
  };
};

// Calculate academic performance summary
export const calculateAcademicPerformance = (student) => {
  if (!student.results) return null;
  
  const terms = [];
  let totalPercentage = 0;
  let termCount = 0;
  
  Object.entries(student.results).forEach(([term, results]) => {
    if (results && results.percentage) {
      terms.push({
        term: term === 'firstTerm' ? 'First Term' : term === 'secondTerm' ? 'Second Term' : 'Final Term',
        percentage: results.percentage,
        grade: getGradeFromPercentage(results.percentage)
      });
      totalPercentage += results.percentage;
      termCount++;
    }
  });
  
  const averagePercentage = termCount > 0 ? totalPercentage / termCount : 0;
  
  return {
    terms,
    averagePercentage,
    overallGrade: getGradeFromPercentage(averagePercentage),
    isImproving: terms.length >= 2 && terms[terms.length - 1].percentage > terms[0].percentage
  };
};

// Get grade from percentage
export const getGradeFromPercentage = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

// Filter students by various criteria
export const filterStudents = (students, filters) => {
  return students.filter(student => {
    // Search filter
    if (filters.search && !student.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !student.regNo.toLowerCase().includes(filters.search.toLowerCase()) &&
        !student.fatherName.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Gender filter
    if (filters.gender && filters.gender !== 'all' && student.gender !== filters.gender) {
      return false;
    }
    
    // Class filter
    if (filters.class && filters.class !== 'all' && student.class !== filters.class) {
      return false;
    }
    
    // Section filter
    if (filters.section && filters.section !== 'all' && student.section !== filters.section) {
      return false;
    }
    
    // Fee status filter
    if (filters.feeStatus && filters.feeStatus !== 'all') {
      const latestFee = student.feeRecords?.[student.feeRecords.length - 1];
      if (latestFee?.status !== filters.feeStatus) {
        return false;
      }
    }
    
    // Date range filter (based on enrollment date - using created date)
    if (filters.dateRange?.start || filters.dateRange?.end) {
      // This assumes student has a createdDate field
      const enrollmentDate = new Date(student.createdDate || student.dob);
      if (filters.dateRange.start && enrollmentDate < new Date(filters.dateRange.start)) {
        return false;
      }
      if (filters.dateRange.end && enrollmentDate > new Date(filters.dateRange.end)) {
        return false;
      }
    }
    
    return true;
  });
};

// Sort students by specified field
export const sortStudents = (students, sortBy, sortOrder = 'asc') => {
  const sorted = [...students];
  
  sorted.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle special cases
    if (sortBy === 'name') {
      aValue = a.name;
      bValue = b.name;
    } else if (sortBy === 'feeStatus') {
      aValue = a.feeRecords?.[a.feeRecords.length - 1]?.status || '';
      bValue = b.feeRecords?.[b.feeRecords.length - 1]?.status || '';
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
};

// Group students by class
export const groupStudentsByClass = (students) => {
  const groups = {};
  
  students.forEach(student => {
    const key = `${student.class}-${student.section}`;
    if (!groups[key]) {
      groups[key] = {
        class: student.class,
        section: student.section,
        students: [],
        male: 0,
        female: 0
      };
    }
    
    groups[key].students.push(student);
    if (student.gender === 'Male') {
      groups[key].male++;
    } else {
      groups[key].female++;
    }
  });
  
  return Object.values(groups);
};

// Export student data to CSV
export const exportStudentsToCSV = (students, filename = 'students_data.csv') => {
  const headers = [
    'Registration No', 'Name', 'Father Name', 'Gender', 'CNIC', 
    'Class', 'Section', 'Date of Birth', 'Address', 'Phone',
    'Monthly Fee', 'Fee Status', 'Status'
  ];
  
  const csvData = students.map(student => {
    const latestFee = student.feeRecords?.[student.feeRecords.length - 1];
    const status = getStudentStatus(student);
    
    return [
      student.regNo,
      student.name,
      student.fatherName,
      student.gender,
      student.cnic,
      student.class,
      student.section,
      formatDate(student.dob),
      student.address,
      student.parentInfo?.phone || '',
      formatCurrency(student.feeStructure?.monthlyFee || 0),
      latestFee?.status || 'Not Set',
      status
    ];
  });
  
  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Validate student data before submission
export const validateStudentData = (studentData) => {
  const errors = {};
  
  if (!studentData.name?.trim()) {
    errors.name = 'Student name is required';
  }
  
  if (!studentData.fatherName?.trim()) {
    errors.fatherName = 'Father name is required';
  }
  
  if (!studentData.cnic?.trim()) {
    errors.cnic = 'CNIC/B-Form is required';
  } else if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(studentData.cnic)) {
    errors.cnic = 'Invalid CNIC format (xxxxx-xxxxxxx-x)';
  }
  
  if (!studentData.dob) {
    errors.dob = 'Date of birth is required';
  } else {
    const age = calculateAge(studentData.dob);
    if (age < 4 || age > 18) {
      errors.dob = 'Student age must be between 4 and 18 years';
    }
  }
  
  if (!studentData.class) {
    errors.class = 'Class is required';
  }
  
  if (!studentData.section) {
    errors.section = 'Section is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Generate fee structure based on class and mode
export const generateFeeStructure = (className, mode = 'Monthly', discount = 0) => {
  // Different fee structures based on class
  const feeBrackets = {
    'Grade 1': { registration: 5000, monthly: 8000 },
    'Grade 2': { registration: 5000, monthly: 8500 },
    'Grade 3': { registration: 6000, monthly: 9000 },
    'Grade 4': { registration: 6000, monthly: 9500 },
    'Grade 5': { registration: 7000, monthly: 10000 }
  };
  
  const fees = feeBrackets[className] || feeBrackets['Grade 1'];
  const monthlyFee = fees.monthly;
  const registrationFee = fees.registration;
  const total = mode === 'Monthly' ? monthlyFee - discount : (monthlyFee * 12) - discount;
  
  return {
    registrationFee,
    monthlyFee,
    mode,
    discount,
    total: Math.max(0, total)
  };
};