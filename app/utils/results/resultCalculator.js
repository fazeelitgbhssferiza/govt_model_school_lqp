import { getSubjectsByClass } from './subjectsConfig';
import { calculateGrade } from './gradeSystem';

export const calculateResultSummary = (student, term = 'finalTerm') => {
  if (!student || !student.results) {
    return {
      obtainedMarks: 0,
      totalMarks: 0,
      percentage: 0,
      grade: 'F',
      gradeColor: 'text-red-600',
      status: 'FAIL'
    };
  }

  const subjects = getSubjectsByClass(student.class);
  const termData = student.results[term];
  
  if (!termData || !termData.subjects) {
    return {
      obtainedMarks: 0,
      totalMarks: subjects.length * 100,
      percentage: 0,
      grade: 'F',
      gradeColor: 'text-red-600',
      status: 'FAIL'
    };
  }

  let obtainedMarks = 0;
  let totalMarks = 0;

  subjects.forEach(subject => {
    const subjectMarks = termData.subjects[subject];

    if (typeof subjectMarks === 'number') {
      obtainedMarks += subjectMarks;
      totalMarks += 100;
      return;
    }

    if (subjectMarks && typeof subjectMarks === 'object') {
      obtainedMarks += Number(subjectMarks.obtained || 0);
      totalMarks += Number(subjectMarks.total || 0);
    }
  });

  const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;
  const { grade, color: gradeColor } = calculateGrade(percentage);
  const status = percentage >= 40 ? 'PASS' : 'FAIL';

  return {
    obtainedMarks,
    totalMarks,
    percentage,
    grade,
    gradeColor,
    status
  };
};

// New function to calculate subject-wise totals across all terms
export const calculateSubjectTotals = (student) => {
  if (!student || !student.results) return {};
  
  const subjects = getSubjectsByClass(student.class);
  const totals = {};
  
  subjects.forEach(subject => {
    const first = Number(student.results?.firstTerm?.subjects?.[subject]?.obtained || student.results?.firstTerm?.subjects?.[subject] || 0);
    const second = Number(student.results?.secondTerm?.subjects?.[subject]?.obtained || student.results?.secondTerm?.subjects?.[subject] || 0);
    const final = Number(student.results?.finalTerm?.subjects?.[subject]?.obtained || student.results?.finalTerm?.subjects?.[subject] || 0);
    totals[subject] = first + second + final;
  });
  
  return totals;
};

// New function to calculate overall grand total
export const calculateGrandTotal = (student) => {
  const subjectTotals = calculateSubjectTotals(student);
  return Object.values(subjectTotals).reduce((sum, val) => sum + val, 0);
};

// Re-export getSubjectsByClass from subjectsConfig for convenience
// Note: This is just a re-export, not a redefinition
export { getSubjectsByClass };
