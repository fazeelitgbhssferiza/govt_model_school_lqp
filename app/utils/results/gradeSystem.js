export const gradeSystem = {
  'A+': { min: 90, max: 100, color: 'text-emerald-600', gpa: 4.0 },
  'A': { min: 80, max: 89, color: 'text-emerald-600', gpa: 3.7 },
  'B': { min: 70, max: 79, color: 'text-blue-600', gpa: 3.0 },
  'C': { min: 60, max: 69, color: 'text-blue-600', gpa: 2.3 },
  'D': { min: 50, max: 59, color: 'text-amber-600', gpa: 1.7 },
  'F': { min: 0, max: 49, color: 'text-red-600', gpa: 0.0 }
};

export const calculateGrade = (percentage) => {
  const numericPercentage = parseFloat(percentage);
  
  for (const [grade, range] of Object.entries(gradeSystem)) {
    if (numericPercentage >= range.min && numericPercentage <= range.max) {
      return { grade, color: range.color, gpa: range.gpa };
    }
  }
  
  return { grade: 'F', color: 'text-red-600', gpa: 0.0 };
};

export const getGradePoints = (grade) => {
  return gradeSystem[grade]?.gpa || 0;
};