'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatCurrency(amount) {
  return `PKR ${Number(amount || 0).toLocaleString()}`;
}

function sanitizeFilePart(value) {
  return String(value || 'yearly-fee-report')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function downloadYearlyFeeReportPdf({ year, summary, rows }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginX = 42;
  const rightX = pageWidth - marginX;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text('ABS School Systems', pageWidth / 2, 42, { align: 'center' });
  pdf.setFontSize(15);
  pdf.text('Yearly Fee Report', pageWidth / 2, 64, { align: 'center' });
  pdf.setDrawColor(0, 0, 0);
  pdf.line(marginX, 78, rightX, 78);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Year:', marginX, 102);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(year), marginX + 34, 102);

  autoTable(pdf, {
    startY: 120,
    margin: { left: marginX, right: marginX },
    body: [
      ['Students With Record', String(summary.studentsWithRecord), 'Paid Students', String(summary.paidStudents)],
      ['Expected Amount', formatCurrency(summary.totalExpected), 'Collected Amount', formatCurrency(summary.totalCollected)],
      ['Pending Amount', formatCurrency(summary.totalPending), 'Collection Rate', `${summary.collectionRate.toFixed(1)}%`],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.6,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { fontStyle: 'bold' },
    },
  });

  autoTable(pdf, {
    startY: (pdf.lastAutoTable?.finalY || 180) + 18,
    margin: { left: marginX, right: marginX },
    head: [['Class', 'Students', 'Months', 'Expected', 'Collected', 'Pending', 'Paid', 'Pending Students']],
    body: rows.map((row) => ([
      row.classLabel,
      String(row.studentCount),
      String(row.monthsCount),
      formatCurrency(row.expectedAmount),
      formatCurrency(row.collectedAmount),
      formatCurrency(row.pendingAmount),
      String(row.paidStudents),
      String(row.pendingStudents),
    ])),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 7,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.6,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
  });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, marginX, 800);

  const filename = `yearly-fee-report-${sanitizeFilePart(year)}.pdf`;
  pdf.save(filename);
}
