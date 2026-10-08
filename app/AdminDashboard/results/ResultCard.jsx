'use client';

import { useEffect, useRef, useState } from 'react';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { getDefaultSubjectTotal, getResultCardSubjects, getResultEntrySubjects } from '../../utils/results/subjectsConfig';
import jsPDF from 'jspdf';
import studentService from '../../services/studentService';
import { apiRequest } from '../authservice/api.jsx';

let lucidaCalligraphyFontBase64Promise = null;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function getLucidaCalligraphyFontBase64() {
  if (!lucidaCalligraphyFontBase64Promise) {
    lucidaCalligraphyFontBase64Promise = fetch('/lucida-calligraphy.ttf')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load Lucida Calligraphy font');
        }

        return response.arrayBuffer();
      })
      .then((buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;

        for (let index = 0; index < bytes.length; index += chunkSize) {
          const chunk = bytes.subarray(index, index + chunkSize);
          binary += String.fromCharCode(...chunk);
        }

        return btoa(binary);
      });
  }

  return lucidaCalligraphyFontBase64Promise;
}

function getStyleMarkup() {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');
}

function getStudentIdentity(student) {
  return student?.id ?? student?._id ?? student?.regNo ?? null;
}

function normalizeComparableValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getResultCardClassName(className) {
  const normalizedClass = String(className || '').trim();
  return /^(?:nursery|nursary)$/i.test(normalizedClass) ? 'ECCE' : normalizedClass;
}

function normalizeSubjectKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function mapBackendTermNameToKey(termName) {
  const normalized = String(termName || '').trim().toLowerCase();

  if (normalized === 'montly test' || normalized === 'monthly test') return 'monthlyTest';
  if (normalized === '1st term' || normalized === 'first term') return 'firstTerm';
  if (normalized === '2nd term' || normalized === 'second term') return 'secondTerm';
  if (normalized === 'final term') return 'finalTerm';

  return null;
}

function mergeBackendResultIntoStudent(student, resultItem, subjects) {
  if (!resultItem || !Array.isArray(resultItem.terms)) {
    return student;
  }

  const subjectLookup = new Map(
    subjects.map((subject) => [normalizeSubjectKey(subject), subject])
  );

  const nextResults = { ...(student?.results || {}) };

  resultItem.terms.forEach((term) => {
    const termKey = mapBackendTermNameToKey(term?.termName);
    if (!termKey) {
      return;
    }

    const normalizedSubjects = {};
    const subjectMarks = Array.isArray(term?.subjectMarks) ? term.subjectMarks : [];
    const availableOptionalSubjects = subjects.filter((subject) => subject.startsWith('Optional Subject'));

    subjectMarks.forEach((item) => {
      const matchedSubject = subjectLookup.get(normalizeSubjectKey(item?.subjectName))
        || availableOptionalSubjects.shift()
        || String(item?.subjectName || '').trim();
      if (!matchedSubject) {
        return;
      }

      normalizedSubjects[matchedSubject] = {
        total: Number(item?.totalMarks || 0),
        obtained: Number(item?.obtainedMarks || 0),
        ...(matchedSubject.startsWith('Optional Subject') ? { subjectName: item?.subjectName || '' } : {}),
      };
    });

    const normalizedTerm = {
      ...(nextResults[termKey] || {}),
      subjects: normalizedSubjects,
      month: term?.month || '',
      remarks: term?.teacherRemarks || nextResults[termKey]?.remarks || '',
    };

    if (termKey === 'monthlyTest' && term?.month) {
      nextResults[termKey] = {
        ...(nextResults[termKey] || {}),
        months: {
          ...(nextResults[termKey]?.months || {}),
          [term.month]: normalizedTerm,
        },
      };
    } else {
      nextResults[termKey] = normalizedTerm;
    }
  });

  return {
    ...student,
    results: nextResults,
  };
}

function findMatchingResultRecord(student, resultRecords = []) {
  const studentId = normalizeComparableValue(getStudentIdentity(student));
  const registrationNumber = normalizeComparableValue(student?.regNo);
  const studentName = normalizeComparableValue(student?.name);
  const className = normalizeComparableValue(student?.class);
  const section = normalizeComparableValue(student?.section);

  return resultRecords.find((item) => {
    const recordStudentId = normalizeComparableValue(item?.studentId);
    const recordRegistrationNumber = normalizeComparableValue(item?.registrationNumber);
    const recordStudentName = normalizeComparableValue(item?.studentName);
    const recordClassName = normalizeComparableValue(item?.className);
    const recordSection = normalizeComparableValue(item?.section);

    if (registrationNumber && recordRegistrationNumber === registrationNumber) {
      return true;
    }

    if (studentId && recordStudentId === studentId) {
      return true;
    }

    return (
      studentName &&
      className &&
      section &&
      recordStudentName === studentName &&
      recordClassName === className &&
      recordSection === section
    );
  }) || null;
}

export default function ResultCard({ student, term = 'finalTerm', onTermChange }) {
  const [selectedTerm, setSelectedTerm] = useState(term);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [resolvedStudent, setResolvedStudent] = useState(student);
  const exportRef = useRef(null);

  useEffect(() => {
    setSelectedTerm(term);
  }, [term]);

  useEffect(() => {
    setResolvedStudent(student);

    if (!getStudentIdentity(student)) {
      return undefined;
    }

    let isActive = true;

    const loadLatestStudent = async () => {
      let nextStudent = student;

      const studentResult = await studentService.getAll();
      if (isActive && studentResult.success) {
        const latestStudent = studentResult.data.find(
          (item) => String(getStudentIdentity(item)) === String(getStudentIdentity(student))
        );
        if (latestStudent) {
          nextStudent = latestStudent;
        }
      }

      const registrationNumber = nextStudent?.regNo || student?.regNo;
      const studentIdentity = getStudentIdentity(nextStudent);

      try {
        if (!studentIdentity && !registrationNumber) {
          if (isActive) {
            setResolvedStudent(nextStudent);
          }
          return;
        }

        const endpointIdentity = studentIdentity ? encodeURIComponent(String(studentIdentity)) : 'unknown';
        const resultResponse = await apiRequest(`/results/student/${endpointIdentity}`, {
          params: registrationNumber ? { registrationNumber } : null,
        });
        let matchedResult = resultResponse?.resultItem || null;

        if (!matchedResult && registrationNumber) {
          const fallbackResponse = await apiRequest('/results', {
            params: { registrationNumber },
          });
          matchedResult = findMatchingResultRecord(
            nextStudent,
            Array.isArray(fallbackResponse?.results) ? fallbackResponse.results : []
          );
        }

        if (!matchedResult && nextStudent?.name) {
          const fallbackByNameResponse = await apiRequest('/results', {
            params: { search: nextStudent.name },
          });
          matchedResult = findMatchingResultRecord(
            nextStudent,
            Array.isArray(fallbackByNameResponse?.results) ? fallbackByNameResponse.results : []
          );
        }

        nextStudent = mergeBackendResultIntoStudent(
          nextStudent,
          matchedResult,
          getResultEntrySubjects(nextStudent?.class, nextStudent?.group) || []
        );
      } catch (error) {
        if (!String(error?.message || '').toLowerCase().includes('result not found for this student')) {
          console.error('Failed to fetch result record:', error);
        }
      }

      if (isActive) {
        setResolvedStudent(nextStudent);
      }
    };

    loadLatestStudent();

    return () => {
      isActive = false;
    };
  }, [student]);

  const terms = [
    { value: 'monthlyTest', label: 'Monthly Test' },
    { value: 'firstTerm', label: '1st Term' },
    { value: 'secondTerm', label: '2nd Term' },
    { value: 'finalTerm', label: 'Final Term' }
  ];

  if (!resolvedStudent) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
        <p className="text-slate-500">No student data available</p>
      </div>
    );
  }

  const configuredSubjects = getResultCardSubjects(resolvedStudent.class, resolvedStudent.group) || [];
  const savedSubjects = Object.values(resolvedStudent.results || {}).flatMap((termResult) => {
    const entries = termResult?.months ? Object.values(termResult.months) : [termResult];
    return entries.flatMap((entry) => Object.keys(entry?.subjects || {}));
  });
  const classMatch = String(resolvedStudent.class || '').match(/\d+/);
  const resultClassNumber = classMatch ? Number(classMatch[0]) : NaN;
  const subjects = Array.from(new Set(
    [...configuredSubjects, ...savedSubjects].map((subject) =>
      subject === 'Quran' ? 'TARJUMA TUL QURAAN MAJEED' : subject
    )
  )).filter((subject) => {
    if ((resultClassNumber === 9 || resultClassNumber === 10) && subject === 'Islamiat') {
      return false;
    }
    return resultClassNumber !== 9 || !['Biology/Computer', 'Pak Studies'].includes(subject);
  });
  const selectedTermLabel = terms.find((item) => item.value === selectedTerm)?.label || selectedTerm;
  const selectedResult = selectedTerm === 'monthlyTest'
    ? resolvedStudent.results?.monthlyTest?.months?.[selectedMonth]
      || (resolvedStudent.results?.monthlyTest?.month === selectedMonth ? resolvedStudent.results.monthlyTest : null)
    : resolvedStudent.results?.[selectedTerm];
  const getSubjectDisplayName = (subject) =>
    selectedResult?.subjects?.[subject]?.subjectName ||
    (subject.startsWith('Optional Subject') ? '________________________' : subject);

  const handleTermChange = (e) => {
    setSelectedTerm(e.target.value);
    if (onTermChange) {
      onTermChange(e.target.value);
    }
  };

  const getSubjectResult = (subject, termType) => {
    try {
      const defaultTotal = getDefaultSubjectTotal(resolvedStudent.class, subject);
      const hasSpecialDefault = defaultTotal !== 100;
      const termResult = termType === selectedTerm ? selectedResult : resolvedStudent.results?.[termType];
      const subjectResult = termResult?.subjects?.[subject]
        ?? (subject === 'TARJUMA TUL QURAAN MAJEED' ? termResult?.subjects?.Quran : undefined);

      if (typeof subjectResult === 'number') {
        return {
          obtained: Number(subjectResult) || 0,
          total: subjectResult !== '' && subjectResult !== null && subjectResult !== undefined ? defaultTotal : (hasSpecialDefault ? defaultTotal : 0)
        };
      }

      if (subjectResult && typeof subjectResult === 'object') {
        return {
          obtained: Number(subjectResult.obtained || 0),
          total: subjectResult.total !== undefined ? Number(subjectResult.total) : defaultTotal
        };
      }

      return {
        obtained: 0,
        total: hasSpecialDefault ? defaultTotal : 0
      };
    } catch (error) {
      console.error('Error getting subject result:', error);
      return {
        obtained: 0,
        total: hasSpecialDefault ? defaultTotal : 0
      };
    }
  };

  const getSelectedTermTotals = (subject) => {
    const subjectResult = getSubjectResult(subject, selectedTerm);
    const percentage = subjectResult.total > 0
      ? ((subjectResult.obtained / subjectResult.total) * 100).toFixed(2)
      : 0;

    return {
      total: subjectResult.total,
      obtained: subjectResult.obtained,
      percentage,
      status: subjectResult.total > 0 && subjectResult.obtained / subjectResult.total >= 0.4 ? 'Pass' : 'Fail'
    };
  };

  const calculateGrandTotals = () => {
    let totalMarks = 0;
    let obtainedMarks = 0;
    let subjectsCount = 0;

    subjects.forEach((subject) => {
      const totals = getSelectedTermTotals(subject);
      totalMarks += totals.total;
      obtainedMarks += totals.obtained;
      if (totals.total > 0) {
        subjectsCount += 1;
      }
    });

    return {
      totalMarks,
      obtainedMarks,
      percentage: totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0,
      subjectsCount
    };
  };

  const grandTotals = calculateGrandTotals();

  const getRemarksText = () => {
    return selectedResult?.remarks || 'No remarks';
  };

  const handlePrint = () => {
    const printContent = exportRef.current;
    if (!printContent) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${resolvedStudent.name || 'Student'} Result Card</title>
          ${getStyleMarkup()}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { margin: 0; padding: 0; background: #ffffff; }
            @media print {
              body { background: #ffffff; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = async () => {
    try {
      const lucidaCalligraphyBase64 = await getLucidaCalligraphyFontBase64();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addFileToVFS('lucida-calligraphy.ttf', lucidaCalligraphyBase64);
      pdf.addFont('lucida-calligraphy.ttf', 'LucidaCalligraphy', 'normal');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const labelColor = [0, 0, 0];
      const textColor = [0, 0, 0];
      const headerGray = [210, 210, 210];
      const border = [0, 0, 0];
      const selectedRemarks = getRemarksText();
      const generatedDate = new Date().toLocaleDateString();
      let y = margin;

      const addPageIfNeeded = (requiredHeight) => {
        if (y + requiredHeight <= pageHeight - margin) {
          return;
        }
        pdf.addPage();
        y = margin;
      };

      const drawInfoBox = (x, top, width, label, value) => {
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, top, width, 14, 2, 2);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...labelColor);
        pdf.text(label, x + 3, top + 4.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...textColor);
        const lines = pdf.splitTextToSize(String(value || '-'), width - 6);
        pdf.text(lines[0] || '-', x + 3, top + 10);
      };

      const drawTableHeader = () => {
        const subjectWidth = 70;
        const totalWidth = 30;
        const obtainedWidth = 32;
        const percentageWidth = 24;
        const statusWidth = contentWidth - (subjectWidth + totalWidth + obtainedWidth + percentageWidth);
        const cols = [
          { key: 'subject', label: 'Subject', width: subjectWidth },
          { key: 'total', label: 'Total', width: totalWidth },
          { key: 'obtained', label: 'Obtained', width: obtainedWidth },
          { key: 'percentage', label: '%', width: percentageWidth },
          { key: 'status', label: 'Status', width: statusWidth }
        ];

        pdf.setFillColor(0, 0, 0);
        pdf.setDrawColor(...border);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        let x = margin;
        cols.forEach((col) => {
          pdf.setFillColor(0, 0, 0);
          pdf.rect(x, y, col.width, 9, 'FD');
          pdf.setTextColor(255, 255, 255);
          pdf.text(col.label, x + col.width / 2, y + 6.1, { align: 'center' });
          x += col.width;
        });
        pdf.setTextColor(...textColor);
        y += 9;
        return cols;
      };

      pdf.setFillColor(...headerGray);
      pdf.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
      pdf.setFont('LucidaCalligraphy', 'normal');
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Govt. Model Secondary School Liaqatpur', margin + 4, y + 8);
      pdf.text('Govt. Model Secondary School Liaqatpur', margin + 4.2, y + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Excellence in Education', margin + 4, y + 14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('Student Result Card', pageWidth - margin - 4, y + 8, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Academic Year 2024-2025 | ${selectedTermLabel}`, pageWidth - margin - 4, y + 14, { align: 'right' });
      y += 26;

      const gap = 4;
      const boxWidth = (contentWidth - gap) / 2;
      drawInfoBox(margin, y, boxWidth, 'Student Name', resolvedStudent.name);
      drawInfoBox(margin + boxWidth + gap, y, boxWidth, 'Registration No', resolvedStudent.regNo);
      y += 18;
      drawInfoBox(margin, y, boxWidth, "Father's Name", resolvedStudent.fatherName);
      drawInfoBox(margin + boxWidth + gap, y, boxWidth, 'Class & Section', `${getResultCardClassName(resolvedStudent.class) || '-'} - ${resolvedStudent.section || '-'}`);
      y += 20;

      let cols = drawTableHeader();

      const drawRow = (values, options = {}) => {
        addPageIfNeeded(8);
        if (y === margin) {
          cols = drawTableHeader();
        }
        let x = margin;
        pdf.setDrawColor(...border);
        pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
        pdf.setFontSize(options.bold ? 9 : 8.5);
        values.forEach((value, index) => {
          const col = cols[index];
          const fill = options.fill ? [248, 250, 252] : null;
          if (fill) {
            pdf.setFillColor(...fill);
            pdf.rect(x, y, col.width, 8, 'FD');
          } else {
            pdf.rect(x, y, col.width, 8);
          }
          const text = String(value ?? '-');
          const align = index === 0 ? 'left' : 'center';
          pdf.setTextColor(...textColor);
          pdf.text(text, align === 'left' ? x + 2 : x + col.width / 2, y + 5.5, { align });
          x += col.width;
        });
        y += 8;
      };

      subjects.forEach((subject) => {
        const totals = getSelectedTermTotals(subject);
        drawRow([
          getSubjectDisplayName(subject),
          totals.total || '-',
          totals.total > 0 ? totals.obtained : '-',
          totals.total > 0 ? `${Number(totals.percentage).toFixed(1)}%` : '-',
          totals.status
        ]);
      });

      drawRow([
        'GRAND TOTAL',
        grandTotals.totalMarks || '-',
        grandTotals.obtainedMarks || '-',
        `${grandTotals.percentage}%`,
        Number(grandTotals.percentage) >= 40 ? 'PASS' : 'FAIL'
      ], { bold: true, fill: true });

      addPageIfNeeded(32);
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...textColor);
      pdf.text("Teacher's Remarks", margin, y);
      y += 3;
      pdf.setDrawColor(...border);
      const remarkLines = pdf.splitTextToSize(selectedRemarks, contentWidth - 6);
      const remarkHeight = Math.max(14, remarkLines.length * 4 + 6);
      pdf.roundedRect(margin, y, contentWidth, remarkHeight, 2, 2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(remarkLines, margin + 3, y + 5);
      y += remarkHeight + 12;

      addPageIfNeeded(24);
      const sigWidth = 48;
      const sigGap = (contentWidth - sigWidth * 3) / 2;
      ['Teacher Signature', 'Principal Signature', `Date: ${generatedDate}`].forEach((label, index) => {
        const x = margin + index * (sigWidth + sigGap);
        pdf.setDrawColor(...border);
        pdf.line(x, y, x + sigWidth, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...labelColor);
        pdf.text(label, x + sigWidth / 2, y + 5, { align: 'center' });
      });

      pdf.save(`${resolvedStudent.name}_result_card.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <>
      <div
        ref={exportRef}
        data-result-print-root
        className="pointer-events-none absolute left-[-20000px] top-0"
      >
        <ResultCardLayout
          student={resolvedStudent}
          subjects={subjects}
          selectedTerm={selectedTerm}
          selectedTermLabel={selectedTermLabel}
          selectedMonth={selectedMonth}
          selectedRemarks={selectedResult?.remarks || ''}
          getSubjectDisplayName={getSubjectDisplayName}
          getSelectedTermTotals={getSelectedTermTotals}
          grandTotals={grandTotals}
          exportMode
        />
      </div>

      <ResultCardLayout
        student={resolvedStudent}
        subjects={subjects}
        selectedTerm={selectedTerm}
        selectedTermLabel={selectedTermLabel}
        selectedMonth={selectedMonth}
        selectedRemarks={selectedResult?.remarks || ''}
        getSubjectDisplayName={getSubjectDisplayName}
        onMonthChange={(event) => setSelectedMonth(event.target.value)}
        getSelectedTermTotals={getSelectedTermTotals}
        grandTotals={grandTotals}
        onTermChange={handleTermChange}
        onPrint={handlePrint}
        onDownloadPDF={handleDownloadPDF}
        terms={terms}
      />
    </>
  );
}

function ResultCardLayout({
  student,
  subjects,
  selectedTerm,
  selectedTermLabel,
  selectedMonth,
  selectedRemarks,
  getSubjectDisplayName,
  getSelectedTermTotals,
  grandTotals,
  onTermChange,
  onMonthChange,
  onPrint,
  onDownloadPDF,
  terms = [],
  exportMode = false
}) {
  const cardClassName = exportMode
    ? 'w-[794px] rounded-none shadow-none'
    : 'mx-auto w-full max-w-4xl rounded-2xl shadow-2xl';
  const sectionPadding = exportMode ? 'p-4' : 'p-4 sm:p-6';
  const headerPadding = exportMode ? 'p-4' : 'p-4 sm:p-6';
  const headingClassName = exportMode ? 'text-lg font-bold' : 'text-xl font-bold sm:text-2xl';
  const subheadingClassName = exportMode ? 'text-xs text-black' : 'text-blue-100 text-sm';
  const metaTitleClassName = exportMode ? 'text-xs text-black' : 'text-sm opacity-90';
  const metaSubtitleClassName = exportMode ? 'text-[10px] text-black' : 'text-xs opacity-75';
  const infoGridClassName = exportMode ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4';
  const tableWrapClassName = exportMode ? 'p-4' : 'overflow-x-auto p-4 sm:p-6';
  const tableClassName = exportMode ? 'w-full table-fixed border-collapse text-[10px]' : 'w-full min-w-[760px] table-fixed border-collapse';
  const topHeaderCellClassName = exportMode ? 'border border-black p-2 text-center text-[10px] font-bold text-black' : 'border border-black p-3 text-center font-bold text-blue-700';
  const firstColumnHeaderClassName = exportMode ? 'border border-black p-2 text-left text-[10px] font-bold text-black' : 'border border-black p-3 text-left font-bold text-slate-700';
  const bodyCellClassName = exportMode ? 'border border-black p-1.5 text-center text-[10px] text-black' : 'border border-black p-3 text-center text-sm';
  const bodyFirstCellClassName = exportMode ? 'border border-black p-1.5 text-[10px] font-medium text-black' : 'border border-black p-3 text-sm font-medium text-black';
  const statusBadgeClassName = exportMode ? 'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium' : 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
  const summaryCellClassName = exportMode ? 'border border-black p-2 text-center font-bold text-[10px] text-black' : 'border border-black p-3 text-center font-bold text-blue-600';
  const signatureContainerClassName = exportMode ? 'p-4 border-t border-slate-200 flex justify-between gap-4 bg-white' : 'flex flex-col gap-6 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-between sm:gap-4 sm:p-6';
  const signatureLineClassName = exportMode ? 'w-32 h-10 border-b-2 border-slate-300 mb-1' : 'mb-1 h-12 w-full max-w-40 border-b-2 border-slate-300';
  const footerClassName = exportMode ? 'bg-slate-50 p-3 text-center border-t border-slate-200' : 'bg-slate-50 p-4 text-center border-t border-slate-200';

  const renderTermTable = () => (
    <>
      <thead>
        <tr className="bg-gradient-to-r from-blue-50 to-emerald-50">
          <th className={firstColumnHeaderClassName}>Subject</th>
          <th className={topHeaderCellClassName}>{selectedTermLabel} Total</th>
          <th className={topHeaderCellClassName}>Obtained</th>
          <th className={topHeaderCellClassName}>%</th>
          <th className={topHeaderCellClassName}>Status</th>
        </tr>
      </thead>
      <tbody>
        {subjects.map((subject) => {
          const totals = getSelectedTermTotals(subject);

          return (
            <tr key={subject} className="border-b border-black hover:bg-slate-50">
              <td className={bodyFirstCellClassName}>{getSubjectDisplayName(subject)}</td>
              <td className={bodyCellClassName}>{totals.total || '-'}</td>
              <td className={`${bodyCellClassName} font-semibold ${exportMode ? 'text-black' : 'text-blue-600'}`}>{totals.total > 0 ? totals.obtained : '-'}</td>
              <td className={`${bodyCellClassName} ${exportMode ? 'text-black' : 'text-emerald-600'}`}>{totals.total > 0 ? `${Number(totals.percentage).toFixed(1)}%` : '-'}</td>
              <td className={bodyCellClassName}>
                <span className={`${
                  exportMode
                    ? 'text-black'
                    : `${statusBadgeClassName} ${
                        totals.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`
                }`}>
                  {totals.status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot className="bg-gradient-to-r from-slate-100 to-blue-50">
        <tr>
          <td className={exportMode ? 'border border-black p-2 text-[10px] font-bold text-black' : 'border border-black p-3 font-bold text-slate-700'}>GRAND TOTAL</td>
          <td className={summaryCellClassName}>
            {grandTotals.totalMarks > 0 ? `${grandTotals.totalMarks}` : '-'}
          </td>
          <td className={summaryCellClassName}>
            {grandTotals.obtainedMarks > 0 || grandTotals.totalMarks > 0 ? `${grandTotals.obtainedMarks}` : '-'}
          </td>
          <td className={summaryCellClassName}>
            {grandTotals.totalMarks > 0 ? `${grandTotals.percentage}%` : '-'}
          </td>
          <td className={`${exportMode ? 'border border-black p-2' : 'border border-black p-3'} text-center`}>
            <span className={`${exportMode ? 'text-[10px] font-bold text-black' : 'inline-flex items-center px-3 py-1 rounded-full text-sm font-bold'} ${
              exportMode ? '' : grandTotals.percentage >= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {grandTotals.percentage >= 40 ? 'PASS' : 'FAIL'}
            </span>
          </td>
        </tr>
        <tr>
          <td colSpan="5" className={exportMode ? 'border border-black p-2 text-center text-[10px] font-semibold text-black' : 'border border-black p-3 text-center font-semibold text-slate-700'}>
            Overall Percentage: {grandTotals.percentage}% | Grade: {grandTotals.percentage >= 90 ? 'A+' : grandTotals.percentage >= 80 ? 'A' : grandTotals.percentage >= 70 ? 'B' : grandTotals.percentage >= 60 ? 'C' : grandTotals.percentage >= 50 ? 'D' : 'F'}
          </td>
        </tr>
      </tfoot>
    </>
  );

  return (
      <div className={`bg-white overflow-hidden ${cardClassName}`}>
       <div className={`${exportMode ? 'bg-white text-black' : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white'} ${headerPadding}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className={`${headingClassName} ${exportMode ? 'text-black' : ''}`}>Govt. Model Secodary School Liaqatpur</h2>
              <p className={subheadingClassName}>Excellence in Education</p>
            </div>
          </div>
            <div className={`${exportMode ? 'text-right text-black' : 'text-left sm:text-right'}`}>
            <div className={metaTitleClassName}>Student Result Card</div>
            <div className={metaSubtitleClassName}>Academic Year 2024-2025</div>
          </div>
        </div>
      </div>

      <div className={`${sectionPadding} border-b border-slate-200 bg-slate-50`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
             <span className={exportMode ? 'text-xs font-medium text-black' : 'text-sm font-medium text-slate-700'}>Select Term to View:</span>
            {exportMode ? (
               <span className="inline-block rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-medium text-black">
                {selectedTermLabel}
              </span>
            ) : (
              <Select
                value={selectedTerm}
                onChange={onTermChange}
                options={terms}
                placeholder="Select term"
              />
            )}
            {selectedTerm === 'monthlyTest' && (exportMode ? (
              <span className="inline-block rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-medium text-black">
                {selectedMonth || 'No month selected'}
              </span>
            ) : (
              <Select
                value={selectedMonth}
                onChange={onMonthChange}
                options={MONTHS}
                placeholder="Select month"
              />
            ))}
          </div>
          {!exportMode && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={onPrint} className="w-full bg-blue-600 px-4 py-2 text-white sm:w-auto">
                Print
              </Button>
              <Button onClick={onDownloadPDF} className="w-full bg-emerald-600 px-4 py-2 text-white sm:w-auto">
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={`${sectionPadding} border-b border-slate-200 bg-white`}>
        <div className={infoGridClassName}>
          <div>
             <p className={exportMode ? 'mb-1 text-[10px] text-black' : 'mb-1 text-xs text-slate-500'}>Student Name</p>
             <p className={exportMode ? 'text-sm font-semibold text-black' : 'font-semibold text-slate-900'}>{student.name || '-'}</p>
          </div>
          <div>
             <p className={exportMode ? 'mb-1 text-[10px] text-black' : 'mb-1 text-xs text-slate-500'}>Registration No</p>
             <p className={exportMode ? 'text-xs font-mono text-black' : 'text-sm font-mono text-blue-600'}>{student.regNo || '-'}</p>
          </div>
          <div>
             <p className={exportMode ? 'mb-1 text-[10px] text-black' : 'mb-1 text-xs text-slate-500'}>Father&apos;s Name</p>
             <p className={exportMode ? 'text-sm font-semibold text-black' : 'font-semibold text-slate-900'}>{student.fatherName || '-'}</p>
          </div>
          <div>
             <p className={exportMode ? 'mb-1 text-[10px] text-black' : 'mb-1 text-xs text-slate-500'}>Class & Section</p>
             <p className={exportMode ? 'text-sm font-semibold text-black' : 'font-semibold text-slate-900'}>{getResultCardClassName(student.class) || '-'} - {student.section || '-'}</p>
          </div>
        </div>
      </div>

      <div className={tableWrapClassName}>
        <table className={tableClassName}>
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          {renderTermTable()}
        </table>
      </div>

      {selectedRemarks && (
        <div className={`${sectionPadding} border-t border-slate-200 bg-slate-50`}>
          <p className={exportMode ? 'mb-1 text-[10px] text-black' : 'mb-1 text-sm text-black'}>Teacher&apos;s Remarks</p>
          <p className={exportMode ? 'text-xs italic text-black' : 'text-black italic'}>&quot;{selectedRemarks}&quot;</p>
        </div>
      )}

      <div className={signatureContainerClassName}>
        <div className="text-center">
          <div className={signatureLineClassName}></div>
          <p className={exportMode ? 'text-[10px] text-black' : 'text-xs text-black'}>Teacher&apos;s Signature</p>
        </div>
        <div className="text-center">
          <div className={signatureLineClassName}></div>
          <p className={exportMode ? 'text-[10px] text-black' : 'text-xs text-black'}>Principal&apos;s Signature</p>
        </div>
        <div className="text-center">
          <div className={signatureLineClassName}></div>
          <p className={exportMode ? 'text-[10px] text-black' : 'text-xs text-black'}>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className={footerClassName}>
        <p className={exportMode ? 'text-[10px] text-black' : 'text-xs text-black'}>This is a computer-generated result card. Valid without signature.</p>
      </div>
    </div>
  );
}
