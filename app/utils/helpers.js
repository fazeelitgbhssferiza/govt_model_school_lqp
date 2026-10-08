// Toast notification helper
let toastCallback = null;

export const setToastCallback = (callback) => {
  toastCallback = callback;
};

export const showToast = (message, type = 'info') => {
  if (toastCallback) {
    toastCallback({ message, type });
  }
};

// Formatters
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR'
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-PK');
};

// Validators
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateCNIC = (cnic) => {
  return /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(cnic);
};

// Calculators
export const calculateFeeTotal = (monthlyFee, discount, mode) => {
  const baseAmount = mode === 'Monthly' ? monthlyFee : monthlyFee * 12;
  return baseAmount - discount;
};

export const calculateAttendancePercentage = (present, total) => {
  return ((present / total) * 100).toFixed(1);
};