'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getInvoiceBreakdown, getSalarySlipEmployeeId } from '../components/SalaryInvoiceView';

function formatCurrency(amount) {
  return `PKR ${Number(amount || 0).toLocaleString()}`;
}

function sanitizeFilePart(value) {
  return String(value || 'invoice')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function downloadSalaryInvoicePdf({ teacher, month, year }) {
  if (!teacher) return;

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const breakdown = getInvoiceBreakdown(teacher);
  const employeeName = teacher.personalInfo?.name || 'Unknown Teacher';
  const employeeId = getSalarySlipEmployeeId(teacher);
  const designation = teacher.educationInfo?.majorSubject
    ? `${teacher.educationInfo.majorSubject} Teacher`
    : 'Teacher';
  const payPeriod = `${month} ${year}`;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginX = 42;
  const rightX = pageWidth - marginX;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Al-Flah Public School Feroza', pageWidth / 2, 42, { align: 'center' });
  pdf.setFontSize(16);
  pdf.text('Salary Slip', pageWidth / 2, 66, { align: 'center' });
  pdf.setDrawColor(0, 0, 0);
  pdf.line(marginX, 78, rightX, 78);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Month:', marginX, 104);
  pdf.text('Year:', rightX - 120, 104);
  pdf.setFont('helvetica', 'normal');
  pdf.text(String(month), marginX + 40, 104);
  pdf.text(String(year), rightX - 80, 104);

  autoTable(pdf, {
    startY: 122,
    margin: { left: marginX, right: marginX },
    body: [
      ['Employee Name', employeeName, 'Employee ID', employeeId],
      ['Designation', designation, 'Pay Period', payPeriod],
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
    startY: (pdf.lastAutoTable?.finalY || 160) + 18,
    margin: { left: marginX, right: marginX },
    head: [['Earnings', 'Amount (PKR)', 'Deductions', 'Amount (PKR)']],
    body: [
      ['Basic Salary', formatCurrency(breakdown.basicSalary), 'Income Tax', formatCurrency(breakdown.incomeTax)],
      ['House Rent Allowance', formatCurrency(breakdown.houseRent), 'Professional Tax', formatCurrency(breakdown.professionalTax)],
      ['Medical Allowance', formatCurrency(breakdown.medicalAllowance), 'Loan Deduction', formatCurrency(breakdown.loanDeduction)],
      ['Conveyance Allowance', formatCurrency(breakdown.conveyanceAllowance), 'Other Deductions', formatCurrency(breakdown.otherDeductions)],
      ['Total Earnings', formatCurrency(breakdown.totalEarnings), 'Total Deductions', formatCurrency(breakdown.totalDeductions)],
      ['Net Payable Amount', formatCurrency(breakdown.netPayable), '', ''],
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
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    didParseCell: (hookData) => {
      const rowIndex = hookData.row.index;
      if (rowIndex === 4) {
        hookData.cell.styles.fontStyle = 'bold';
      }
      if (rowIndex === 5) {
        hookData.cell.styles.fontStyle = 'bold';
        if (hookData.column.index > 1) {
          hookData.cell.text = [''];
        }
      }
    },
  });

  const finalY = pdf.lastAutoTable?.finalY || 540;

  pdf.setDrawColor(0, 0, 0);
  pdf.line(marginX + 20, finalY + 72, marginX + 150, finalY + 72);
  pdf.line(pageWidth - marginX - 150, finalY + 72, pageWidth - marginX - 20, finalY + 72);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Authorized Signature', marginX + 20, finalY + 92);
  pdf.text('Employee Signature', pageWidth - marginX - 20, finalY + 92, { align: 'right' });

  pdf.setFontSize(9);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, marginX, 800);

  const filename = `salary-invoice-${sanitizeFilePart(employeeName)}-${sanitizeFilePart(month)}-${year}.pdf`;
  pdf.save(filename);
}
