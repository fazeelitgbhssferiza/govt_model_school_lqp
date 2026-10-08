'use client';

import { calculateResultSummary } from '../../utils/results/resultCalculator';

export default function ResultTable({ students, onView, onEdit, classSummary = null }) {
  const columns = [
    { key: "regNo", header: "Registration No", width: "w-32" },
    { key: "name", header: "Student Name", width: "w-48" },
    { key: "fatherName", header: "Father Name", width: "w-48" },
    { key: "class", header: "Class", width: "w-24" }
  ];

  const getSubjectWiseStatus = (student) => {
    const subjects = student.subjects || [];
    let passCount = 0;
    let totalCount = 0;
    
    // This would need to be implemented based on your data structure
    // Simplified version for now
    return { passCount, totalCount };
  };

  const getOverallStatus = (student) => {
    const summary = calculateResultSummary(student, 'finalTerm');
    return summary?.status || 'N/A';
  };

  const getGrandTotal = (student) => {
    const summary = calculateResultSummary(student, 'finalTerm');
    if (!summary) return '0/0';
    return `${summary.obtainedMarks}/${summary.totalMarks}`;
  };

  const getPercentage = (student) => {
    const summary = calculateResultSummary(student, 'finalTerm');
    return summary?.percentage || 0;
  };

  const getCellValue = (student, columnKey) => {
    const value = student[columnKey];
    if (columnKey === 'class' && /^(?:nursery|nursary)$/i.test(String(value || '').trim())) {
      return 'ECCE';
    }
    return value || '-';
  };

  return (
    <div className="overflow-x-auto">
      {classSummary && (
        <div className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryItem
              label={`${classSummary.className} Result Summary`}
              value={`${classSummary.appeared}`}
              helper="Total No. of Student Appear in Exam"
            />
            <SummaryItem
              label="Passed"
              value={`${classSummary.passed}`}
              helper="No. of Passed"
            />
            <SummaryItem
              label="Failed"
              value={`${classSummary.failed}`}
              helper="No. of Failed"
            />
            <SummaryItem
              label="Class Percentage"
              value={`${classSummary.percentage}%`}
              helper="Result Class Percentage"
            />
          </div>
        </div>
      )}
      <table className="min-w-[960px] w-full">
        <thead className="bg-blue-600 border-b border-blue-700">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`${col.width || ''} px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider ${
                  idx === 0 ? 'rounded-tl-xl' : ''
                }`}
              >
                {col.header}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Total (Obtained/Total)</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Percentage</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
            <th className="rounded-tr-xl px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const summary = calculateResultSummary(student, 'finalTerm');
            return (
              <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-900">
                      {getCellValue(student, col.key)}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold text-emerald-600">
                    {summary ? `${summary.obtainedMarks}/${summary.totalMarks}` : '0/0'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold text-blue-600">
                    {summary?.percentage || 0}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    summary?.status === 'PASS' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {summary?.status || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex justify-center gap-1.5">
                    <button
                      onClick={() => onView(student)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      title="View Result"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => onEdit(student)}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
                      title="Edit Result"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {students.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-500">No students found matching your search criteria</p>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, helper }) {
  let toneClasses = 'border-sky-500 bg-sky-400 text-sky-900';

  if (label === 'Passed') {
    toneClasses = 'border-emerald-500 bg-emerald-400 text-emerald-900';
  } else if (label === 'Failed') {
    toneClasses = 'border-rose-500 bg-rose-400 text-rose-900';
  } else if (label === 'Class Percentage') {
    toneClasses = 'border-violet-500 bg-violet-400 text-violet-900';
  } else if (label.includes('Result Summary')) {
    toneClasses = 'border-amber-500 bg-amber-400 text-amber-900';
  }

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}
