'use client';

import { useState } from 'react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import jsPDF from 'jspdf';

function normalizeDateKey(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return rawDate.toISOString().split('T')[0];
}

function formatDisplayDate(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return String(value || '');
  }

  const day = String(rawDate.getDate()).padStart(2, '0');
  const month = String(rawDate.getMonth() + 1).padStart(2, '0');
  const year = rawDate.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDisplayDateTime(value) {
  const rawDate = value ? new Date(value) : new Date();
  if (Number.isNaN(rawDate.getTime())) {
    return String(value || '');
  }

  const datePart = formatDisplayDate(rawDate);
  const timePart = rawDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${datePart}, ${timePart}`;
}

function matchesReportDate(entry, reportType, selectedDate, selectedMonth, selectedYear) {
  if (!entry) return false;

  const rawDate = new Date(entry.date);
  if (Number.isNaN(rawDate.getTime())) {
    return false;
  }

  if (reportType === 'daily') {
    return normalizeDateKey(entry.date) === normalizeDateKey(selectedDate);
  }

  return rawDate.getMonth() === selectedMonth && rawDate.getFullYear() === selectedYear;
}

export default function AttendanceReport({ attendance, students, teachers, selectedDate }) {
  const [reportType, setReportType] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = [2023, 2024, 2025, 2026];

  const generateReport = () => ({
    type: reportType,
    date: reportType === 'daily' ? selectedDate : `${months[selectedMonth]} ${selectedYear}`,
    students: students.map((student) => ({
      name: student.name,
      regNo: student.regNo,
      class: student.class,
      attendance:
        attendance.students.find(
          (entry) => String(entry.id) === String(student.id) && matchesReportDate(entry, reportType, selectedDate, selectedMonth, selectedYear)
        )?.status || 'Not Marked'
    })),
    teachers: teachers.map((teacher) => ({
      name: teacher.name,
      teacherId: teacher.teacherId,
      attendance:
        attendance.teachers.find(
          (entry) => String(entry.id) === String(teacher.id) && matchesReportDate(entry, reportType, selectedDate, selectedMonth, selectedYear)
        )?.status || 'Not Marked'
    }))
  });

  const reportData = generateReport();

  const downloadPDF = async () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const tableWidth = 260;
    let y = margin;

    const ensureSpace = (heightNeeded) => {
      if (y + heightNeeded > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    const drawTable = (title, headers, rows, widths) => {
      ensureSpace(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 0, 0);
      pdf.text(title, margin, y);
      y += 6;

      const rowHeight = 8;

      const drawRow = (columns, isHeader = false) => {
        ensureSpace(rowHeight + 2);
        let x = margin;

        if (isHeader) {
          pdf.setFillColor(0, 0, 0);
          pdf.rect(margin, y - 5.5, tableWidth, rowHeight, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');
        }

        columns.forEach((column, index) => {
          pdf.rect(x, y - 5.5, widths[index], rowHeight);
          pdf.text(String(column ?? ''), x + 2, y, {
            maxWidth: widths[index] - 4
          });
          x += widths[index];
        });

        y += rowHeight;
      };

      drawRow(headers, true);
      rows.forEach((row) => drawRow(row));
      y += 6;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Attendance Report', margin, y);
    y += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(
      reportType === 'daily'
        ? `Date: ${formatDisplayDate(selectedDate)}`
        : `Month: ${months[selectedMonth]} ${selectedYear}`,
      margin,
      y
    );
    y += 12;

    drawTable(
      'Students Attendance',
      ['Name', 'Reg No', 'Class', 'Status'],
      reportData.students.map((student) => [student.name, student.regNo, student.class, student.attendance]),
      [80, 55, 70, 55]
    );

    drawTable(
      'Teachers Attendance',
      ['Name', 'Teacher ID', 'Status'],
      reportData.teachers.map((teacher) => [teacher.name, teacher.teacherId, teacher.attendance]),
      [110, 80, 70]
    );

    ensureSpace(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(70, 70, 70);
    pdf.text(`Generated on ${formatDisplayDateTime(new Date())}`, margin, y);

    pdf.save(`attendance_report_${Date.now()}.pdf`);
  };

  const renderStatus = (value) => (
    <span className="inline-flex min-w-[110px] justify-center rounded-full border border-black px-3 py-1 text-xs font-semibold tracking-wide text-black">
      {value}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-black bg-white p-5">
        <div className="w-40">
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={['daily', 'monthly']}
          />
        </div>
        {reportType === 'daily' ? (
          <div className="w-48">
            <label className="mb-1 block text-sm font-medium text-black">Date</label>
            <input
              type="text"
              value={formatDisplayDate(selectedDate)}
              onChange={() => {}}
              className="w-full rounded-lg border border-black px-3 py-2 text-black"
              readOnly
            />
          </div>
        ) : (
          <>
            <div className="w-40">
              <Select
                label="Month"
                value={months[selectedMonth]}
                onChange={(e) => setSelectedMonth(months.indexOf(e.target.value))}
                options={months}
              />
            </div>
            <div className="w-32">
              <Select
                label="Year"
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                options={years.map((year) => year.toString())}
              />
            </div>
          </>
        )}
        <Button onClick={downloadPDF} className="border border-black bg-black text-white hover:bg-neutral-800">
          Download PDF
        </Button>
      </div>

      <div id="report-content" className="rounded-3xl border border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.12)]">
        <div className="mb-8 border-b border-black pb-5">
          <h2 className="text-3xl font-bold tracking-tight text-black">Attendance Report</h2>
          <p className="mt-2 text-sm font-medium text-neutral-700">
            {reportType === 'daily' ? `Date: ${formatDisplayDate(selectedDate)}` : `Month: ${months[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        <div className="mb-10">
          <h3 className="mb-4 text-lg font-semibold text-black">Students Attendance</h3>
          <div className="overflow-hidden rounded-2xl border border-black">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-black px-4 py-3 text-left font-semibold">Name</th>
                  <th className="border border-black px-4 py-3 text-left font-semibold">Reg No</th>
                  <th className="border border-black px-4 py-3 text-left font-semibold">Class</th>
                  <th className="border border-black px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white text-black">
                {reportData.students.map((student, idx) => (
                  <tr key={idx} className="odd:bg-white even:bg-neutral-50">
                    <td className="border border-black px-4 py-3">{student.name}</td>
                    <td className="border border-black px-4 py-3 font-mono">{student.regNo}</td>
                    <td className="border border-black px-4 py-3">{student.class}</td>
                    <td className="border border-black px-4 py-3 text-center">{renderStatus(student.attendance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-black">Teachers Attendance</h3>
          <div className="overflow-hidden rounded-2xl border border-black">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-black px-4 py-3 text-left font-semibold">Name</th>
                  <th className="border border-black px-4 py-3 text-left font-semibold">Teacher ID</th>
                  <th className="border border-black px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white text-black">
                {reportData.teachers.map((teacher, idx) => (
                  <tr key={idx} className="odd:bg-white even:bg-neutral-50">
                    <td className="border border-black px-4 py-3">{teacher.name}</td>
                    <td className="border border-black px-4 py-3 font-mono">{teacher.teacherId}</td>
                    <td className="border border-black px-4 py-3 text-center">{renderStatus(teacher.attendance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 border-t border-black pt-4 text-xs font-medium text-neutral-600">
          Generated on {formatDisplayDateTime(new Date())}
        </div>
      </div>
    </div>
  );
}
