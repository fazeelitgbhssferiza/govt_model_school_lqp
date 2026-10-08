export const validators = {
  required: (value) => value ? null : 'This field is required',
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email address';
  },
  
  cnic: (value) => {
    const cnicRegex = /^[0-9]{5}-[0-9]{7}-[0-9]$/;
    return cnicRegex.test(value) ? null : 'Invalid CNIC format (xxxxx-xxxxxxx-x)';
  },
  
  phone: (value) => {
    const phoneRegex = /^[0-9]{4}-[0-9]{7}$/;
    return phoneRegex.test(value) ? null : 'Invalid phone number format (0300-1234567)';
  },
  
  minLength: (min) => (value) => {
    return value.length >= min ? null : `Minimum ${min} characters required`;
  },
  
  maxLength: (max) => (value) => {
    return value.length <= max ? null : `Maximum ${max} characters allowed`;
  },
  
  number: (value) => {
    return !isNaN(value) ? null : 'Must be a number';
  },
  
  positive: (value) => {
    return parseFloat(value) > 0 ? null : 'Must be a positive number';
  },
  
  range: (min, max) => (value) => {
    const num = parseFloat(value);
    return (num >= min && num <= max) ? null : `Must be between ${min} and ${max}`;
  }
};

export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  for (const field in validationRules) {
    const rules = validationRules[field];
    const value = formData[field];
    
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
