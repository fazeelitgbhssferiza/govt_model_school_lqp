'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { hasPermission } from '../authservice/auth';
import { useAuth } from '../authservice/useAuth';
import { showToast } from '../../utils/helpers';
import teacherService from '../../services/teacherService';
import classService from '../../services/classService';
import feeService from '../../services/feeService';
import studentService from '../../services/studentService';
import SalaryInvoiceView from './components/SalaryInvoiceView';
import { downloadSalaryInvoicePdf } from './utils/salaryInvoicePdf';
import { downloadMonthlyFeeReportPdf } from './utils/monthlyFeeReportPdf';
import { downloadYearlyFeeReportPdf } from './utils/yearlyFeeReportPdf';

// Glass Morphism Card Component
const GlassCard = ({ children, className = '' }) => (
  <div className={`backdrop-blur-xl bg-white/40 rounded-2xl shadow-lg border border-white/50 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

// Modal Component
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-slate-100 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatSlipDate = (value) => {
  if (!value) return 'Not recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-CA');
};

const sortFeeRecords = (records = []) => [...records].sort((left, right) => {
  const leftDate = new Date(`${left.month || 'January'} 1, ${left.year || 2000}`);
  const rightDate = new Date(`${right.month || 'January'} 1, ${right.year || 2000}`);
  return rightDate - leftDate;
});

const getPrintableFeeRecord = (student) => {
  const latestRecord = sortFeeRecords(Array.isArray(student?.feeRecords) ? student.feeRecords : [])[0];

  if (latestRecord) {
    const registrationFee = Number(latestRecord.registrationFee || 0);
    const monthlyFee = Number(latestRecord.monthlyFee || 0);

    return {
      month: latestRecord.month || new Date().toLocaleString('default', { month: 'long' }),
      year: Number(latestRecord.year || new Date().getFullYear()),
      status: latestRecord.status || 'Pending',
      paidDate: latestRecord.status === 'Paid'
        ? (latestRecord.paidDate || new Date().toISOString().split('T')[0])
        : (latestRecord.paidDate || ''),
      registrationFee,
      monthlyFee,
      amount: Number(latestRecord.amount || (registrationFee + monthlyFee)),
    };
  }

  const registrationFee = Number(student?.feeStructure?.registrationFee || 0);
  const monthlyFee = Number(student?.feeStructure?.monthlyFee || 0);

  return {
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    status: student?.feeStatus || 'Pending',
    paidDate: '',
    registrationFee,
    monthlyFee,
    amount: registrationFee + monthlyFee,
  };
};

const openFeeSlipPrintWindow = (student, recordData) => {
  if (!student) return false;

  const paidDateValue = recordData.status === 'Paid'
    ? recordData.paidDate || new Date().toISOString().split('T')[0]
    : recordData.paidDate || '';
  const slipDate = new Date().toLocaleString();
  const printWindow = window.open('', '_blank', 'width=420,height=900');

  if (!printWindow) {
    showToast('Unable to open print window. Please allow pop-ups and try again.', 'error');
    return false;
  }

  const slipMarkup = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fee Slip - ${escapeHtml(student.name)}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 4mm 4mm 4mm 0.10in;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: "Courier New", Courier, monospace;
            font-size: 12px;
            line-height: 1.35;
            font-weight: 700;
          }

          body {
            width: 72mm;
            margin: 0 auto 0 0.10in;
            padding: 4mm 0;
          }

          .slip {
            width: 100%;
          }

          .center {
            text-align: center;
          }

          .title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 2px;
          }

          .subtitle {
            font-size: 13px;
            margin-bottom: 8px;
            font-weight: 700;
            white-space: nowrap;
          }

          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin: 3px 0;
          }

          .row .label {
            font-weight: 700;
            color: #000000;
          }

          .row .value {
            text-align: right;
            word-break: break-word;
            color: #000000;
            font-weight: 700;
          }

          .block {
            margin: 8px 0;
          }

          .block-title {
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 4px;
            color: #000000;
          }

          .total {
            font-size: 14px;
            font-weight: 700;
          }

          .note {
            margin-top: 10px;
            font-size: 11px;
            text-align: center;
            font-weight: 700;
            color: #000000;
            white-space: nowrap;
          }

          @media print {
            body {
              width: 72mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="slip">
          <div class="center">
            <div class="title">ABS School Systems</div>
            <div class="subtitle">Mob# 0304-3634492</div>
          </div>

          <div class="divider"></div>

          <div class="block">
            <div class="row"><span class="label">Student</span><span class="value">${escapeHtml(student.name || 'N/A')}</span></div>
            <div class="row"><span class="label">Father</span><span class="value">${escapeHtml(student.fatherName || 'N/A')}</span></div>
            <div class="row"><span class="label">Reg No</span><span class="value">${escapeHtml(student.regNo || 'N/A')}</span></div>
            <div class="row"><span class="label">Class</span><span class="value">${escapeHtml(`${student.class || 'N/A'} - Sec ${student.section || 'N/A'}`)}</span></div>
          </div>

          <div class="divider"></div>

          <div class="block">
            <div class="row"><span class="label">Month</span><span class="value">${escapeHtml(recordData.month)}</span></div>
            <div class="row"><span class="label">Year</span><span class="value">${escapeHtml(recordData.year)}</span></div>
            <div class="row"><span class="label">Status</span><span class="value">${escapeHtml(recordData.status)}</span></div>
            <div class="row"><span class="label">Paid Date</span><span class="value">${escapeHtml(formatSlipDate(paidDateValue))}</span></div>
          </div>

          <div class="divider"></div>

          <div class="block">
            <div class="block-title">Fee Details</div>
            <div class="row"><span class="label">Registration</span><span class="value">${escapeHtml(formatCurrency(recordData.registrationFee))}</span></div>
            <div class="row"><span class="label">Monthly</span><span class="value">${escapeHtml(formatCurrency(recordData.monthlyFee))}</span></div>
            <div class="row total"><span class="label">Total</span><span class="value">${escapeHtml(formatCurrency(recordData.amount))}</span></div>
          </div>

          <div class="divider"></div>

          <div class="block">
            <div class="row"><span class="label">Printed At</span><span class="value">${escapeHtml(slipDate)}</span></div>
          </div>

          <div class="divider"></div>

          <div class="note">Rehan Software Solutions  Mob# 0345-8019548</div>
        </div>

        <script>
          window.onload = function () {
            window.print();
            setTimeout(function () { window.close(); }, 300);
          };
        <\/script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(slipMarkup);
  printWindow.document.close();
  return true;
};

const REPORT_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];


// Salary Invoice Component
const SalaryInvoice = ({ teacher, month, year, onClose }) => {
  const handlePrint = () => {
    if (!teacher) return;

    downloadSalaryInvoicePdf({
      teacher,
      month,
      year,
    });
  };

  return (
    <SalaryInvoiceView
      teacher={teacher}
      month={month}
      year={year}
      actions={
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Close</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Print Invoice</button>
        </div>
      }
    />
  );
};

// Teacher Salary Manager Component
const TeacherSalaryManager = ({ teachers, onUpdate }) => {
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryData, setSalaryData] = useState({ basicSalary: 0, houseRent: 0, medicalAllowance: 0, conveyanceAllowance: 0, deductions: 0 });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  }, []);

  const handleEditSalary = (teacher) => {
    if (!teacher) return;
    setSelectedTeacher(teacher);
    setSalaryData({
      basicSalary: teacher.salaryInfo?.basicSalary || 0,
      houseRent: teacher.salaryInfo?.houseRent || 0,
      medicalAllowance: teacher.salaryInfo?.medicalAllowance || 0,
      conveyanceAllowance: teacher.salaryInfo?.conveyanceAllowance || 0,
      deductions: 0
    });
    setShowEditModal(true);
  };

  const handleViewInvoice = (teacher) => {
    setSelectedTeacher(teacher);
    setShowInvoiceModal(true);
  };

  const calculateTotalSalary = useCallback(() => {
    return salaryData.basicSalary + salaryData.houseRent + salaryData.medicalAllowance + salaryData.conveyanceAllowance - salaryData.deductions;
  }, [salaryData]);

  const handleSaveSalary = async () => {
    if (!selectedTeacher) return;
    
    const totalSalary = calculateTotalSalary();
    const updatedTeacher = {
      ...selectedTeacher,
      salaryInfo: {
        basicSalary: salaryData.basicSalary,
        houseRent: salaryData.houseRent,
        medicalAllowance: salaryData.medicalAllowance,
        conveyanceAllowance: salaryData.conveyanceAllowance,
        totalSalary: totalSalary
      }
    };
    
    const result = await teacherService.update(selectedTeacher.id, updatedTeacher);
    if (result.success) {
      showToast('Salary updated successfully!', 'success');
      onUpdate();
      setShowEditModal(false);
    } else {
      showToast('Failed to update salary', 'error');
    }
  };

  const handleAutoCalculate = () => {
    const basic = salaryData.basicSalary;
    setSalaryData({
      ...salaryData,
      houseRent: basic * 0.3,
      medicalAllowance: basic * 0.2,
      conveyanceAllowance: basic * 0.1
    });
    showToast('Allowances auto-calculated (30% HRA, 20% MA, 10% CA)', 'success');
  };

  const totalSalaryExpense = teachers.reduce((sum, t) => sum + (t.salaryInfo?.totalSalary || 0), 0);
  const averageSalary = teachers.length ? totalSalaryExpense / teachers.length : 0;

  if (!teachers || teachers.length === 0) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-black">Teacher Salaries</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly salary breakdown</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total Monthly</p>
            <p className="text-xl font-bold text-blue-600">PKR 0</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500">No teachers found. Add teachers to manage salaries.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="p-5">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-2xl font-semibold text-black">Teacher Salaries</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly salary breakdown and management</p>
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <div className="text-left sm:text-right">
              <p className="text-base text-slate-700">Total Monthly</p>
              <p className="text-xl font-bold text-blue-600">PKR {totalSalaryExpense.toLocaleString()}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-base text-slate-700">Average Salary</p>
              <p className="text-xl font-bold text-emerald-600">PKR {Math.round(averageSalary).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="financial-admin-table min-w-[860px] w-full">
            <thead className="bg-blue-600">
              <tr>
                <th className="rounded-tl-2xl text-left py-4 px-4 text-sm font-bold text-white">Teacher</th>
                <th className="text-right py-4 px-4 text-sm font-bold text-white">Basic</th>
                <th className="text-right py-4 px-4 text-sm font-bold text-white">HRA</th>
                <th className="text-right py-4 px-4 text-sm font-bold text-white">MA</th>
                <th className="text-right py-4 px-4 text-sm font-bold text-white">CA</th>
                <th className="text-right py-4 px-4 text-sm font-bold text-white">Total</th>
                <th className="rounded-tr-2xl text-center py-4 px-4 text-sm font-bold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100/50">
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-3">
                    <div>
                      <p className="text-sm font-medium text-black">{teacher.personalInfo?.name || 'N/A'}</p>
                      <p className="text-xs font-mono text-black">{teacher.teacherId || 'TECH-001'}</p>
                      <p className="text-xs text-slate-500">{teacher.educationInfo?.majorSubject || 'N/A'} • {teacher.educationInfo?.experience || 0} yrs exp</p>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-sm text-black">PKR {(teacher.salaryInfo?.basicSalary || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-sm text-black">PKR {(teacher.salaryInfo?.houseRent || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-sm text-black">PKR {(teacher.salaryInfo?.medicalAllowance || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-sm text-black">PKR {(teacher.salaryInfo?.conveyanceAllowance || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-semibold text-black">PKR {(teacher.salaryInfo?.totalSalary || 0).toLocaleString()}</td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEditSalary(teacher)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Edit Salary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleViewInvoice(teacher)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors" title="View Invoice">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Salary Summary Footer */}
        <div className="mt-4 pt-4 border-t border-blue-100/50 bg-blue-50/30 rounded-lg p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-sm font-medium text-slate-600">Highest Salary</p>
                <p className="text-xl font-bold text-blue-600">
                  PKR {Math.max(...teachers.map(t => t.salaryInfo?.totalSalary || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Lowest Salary</p>
                <p className="text-xl font-bold text-blue-600">
                  PKR {Math.min(...teachers.map(t => t.salaryInfo?.totalSalary || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Teachers</p>
                <p className="text-xl font-bold text-blue-600">{teachers.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Experience</p>
                <p className="text-xl font-bold text-blue-600">
                  {(teachers.reduce((sum, t) => sum + (t.educationInfo?.experience || 0), 0) / teachers.length || 0).toFixed(1)} yrs
                </p>
              </div>
          </div>
        </div>
      </GlassCard>

      {/* Edit Salary Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Salary - ${selectedTeacher?.personalInfo?.name}`} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary (PKR)</label>
              <input type="number" value={salaryData.basicSalary} onChange={(e) => setSalaryData({ ...salaryData, basicSalary: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">House Rent Allowance (PKR)</label>
              <input type="number" value={salaryData.houseRent} onChange={(e) => setSalaryData({ ...salaryData, houseRent: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medical Allowance (PKR)</label>
              <input type="number" value={salaryData.medicalAllowance} onChange={(e) => setSalaryData({ ...salaryData, medicalAllowance: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Conveyance Allowance (PKR)</label>
              <input type="number" value={salaryData.conveyanceAllowance} onChange={(e) => setSalaryData({ ...salaryData, conveyanceAllowance: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deductions (PKR)</label>
            <input type="number" value={salaryData.deductions} onChange={(e) => setSalaryData({ ...salaryData, deductions: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>

          <div className="flex gap-3">
            <button onClick={handleAutoCalculate} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm">
              Auto Calculate Allowances
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-slate-600">Gross Salary</p>
                <p className="text-2xl font-bold text-blue-600">PKR {(salaryData.basicSalary + salaryData.houseRent + salaryData.medicalAllowance + salaryData.conveyanceAllowance).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-600">Net Salary (after deductions)</p>
                <p className="text-2xl font-bold text-emerald-600">PKR {calculateTotalSalary().toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveSalary} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Salary Invoice Modal */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Salary Invoice" size="lg">
        <div className="flex justify-end gap-2 mb-4">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
            {months.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <SalaryInvoice teacher={selectedTeacher} month={selectedMonth} year={selectedYear} onClose={() => setShowInvoiceModal(false)} />
      </Modal>
    </>
  );
};

// Class-wise Fee Details Component
const ClassFeeDetails = ({ classes, onUpdate }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feeData, setFeeData] = useState({ registrationFee: 5000, monthlyFee: 8000 });
  const sortedClasses = useMemo(() => [...(classes || [])].sort((left, right) => {
    const leftNumber = Number.parseInt(left?.name, 10);
    const rightNumber = Number.parseInt(right?.name, 10);

    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber !== rightNumber) {
      return rightNumber - leftNumber;
    }

    const nameCompare = String(right?.name || '').localeCompare(String(left?.name || ''), undefined, { numeric: true });
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return String(left?.section || '').localeCompare(String(right?.section || ''));
  }), [classes]);

  const handleEditFee = async (classItem) => {
    if (!classItem || !classItem.name) return;
    
    try {
      const feeResult = await feeService.getFeeStructure(classItem.name, classItem.section);
      if (feeResult.success) {
        setFeeData({
          registrationFee: feeResult.data.registrationFee || 5000,
          monthlyFee: feeResult.data.monthlyFee || 8000
        });
      }
      setSelectedClass(classItem);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading fee structure:', error);
      showToast('Failed to load fee structure', 'error');
    }
  };

  const handleSaveFee = async () => {
    if (!selectedClass || !selectedClass.name) return;
    
    try {
      const result = await feeService.updateFeeStructure(selectedClass.name, selectedClass.section, feeData);
      if (result.success) {
        showToast('Fee structure updated successfully!', 'success');
        onUpdate();
        setShowModal(false);
      } else {
        showToast('Failed to update fee structure', 'error');
      }
    } catch (error) {
      console.error('Error saving fee structure:', error);
      showToast('Failed to save fee structure', 'error');
    }
  };

  const handleOpenPrintModal = async (classItem) => {
    if (!classItem?.name || !classItem?.section) return;

    try {
      const result = await studentService.getStudentsByClass(classItem.name, classItem.section);
      const classStudents = Array.isArray(result.data) ? result.data : [];

      if (classStudents.length === 0) {
        showToast('No students found in this class section', 'error');
        return;
      }

      setSelectedClass(classItem);
      setStudentsInClass(classStudents);
      setSelectedStudentId(String(classStudents[0].id || classStudents[0]._id || classStudents[0].regNo || ''));
      setShowPrintModal(true);
    } catch (error) {
      console.error('Error loading class students:', error);
      showToast('Failed to load class students', 'error');
    }
  };

  const selectedStudent = studentsInClass.find(
    (student) => String(student.id || student._id || student.regNo || '') === selectedStudentId
  );
  const selectedStudentRecord = selectedStudent ? getPrintableFeeRecord(selectedStudent) : null;

  const handlePrintStudentSlip = () => {
    if (!selectedStudent || !selectedStudentRecord) {
      showToast('Select a student to print the fee slip', 'error');
      return;
    }

    const printed = openFeeSlipPrintWindow(selectedStudent, selectedStudentRecord);
    if (printed) {
      setShowPrintModal(false);
    }
  };

  if (!classes || classes.length === 0) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-3xl text-black font-semibold">Class-wise Fee Details</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500">No classes found</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-3xl font-semibold text-slate-800">Class-wise Fee Details</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
          <thead className="bg-blue-700">
            <tr>
              <th className="rounded-tl-2xl text-left py-3 px-3 text-base font-semibold text-white">Class</th>
              <th className="text-right py-3 px-3 text-base font-semibold text-white">Registration Fee</th>
              <th className="text-right py-3 px-3 text-base font-semibold text-white">Monthly Fee</th>
              <th className="text-right py-3 px-3 text-base font-semibold text-white">Total Collected</th>
              <th className="text-right py-3 px-3 text-base font-semibold text-white">Pending</th>
              <th className="rounded-tr-2xl text-center py-3 px-3 text-base font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100/50">
            {sortedClasses.map((cls) => (
              <tr key={cls.id} className="hover:bg-blue-50/30">
                <td className="py-3 px-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-slate-800">{cls.name || 'N/A'} - Section {cls.section || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{cls.studentCount || 0} Students</p>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">PKR {(cls.registrationFee || 5000).toLocaleString()}</td>
                <td className="py-3 px-3 text-right">PKR {(cls.monthlyFee || 8000).toLocaleString()}</td>
                <td className="py-3 px-3 text-right text-emerald-600">PKR {(cls.collectedFee || 0).toLocaleString()}</td>
                <td className="py-3 px-3 text-right text-amber-600">PKR {(cls.pendingFee || 0).toLocaleString()}</td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditFee(cls)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit Fee"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenPrintModal(cls)}
                      className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      title="Print Fee Slip"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Edit Fee Structure - ${selectedClass?.name || 'Class'} Section ${selectedClass?.section || ''}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Registration Fee (PKR)</label>
            <input type="number" value={feeData.registrationFee} onChange={(e) => setFeeData({ ...feeData, registrationFee: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Fee (PKR)</label>
            <input type="number" value={feeData.monthlyFee} onChange={(e) => setFeeData({ ...feeData, monthlyFee: parseInt(e.target.value) || 0 })}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSaveFee} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`Print Fee Slip - ${selectedClass?.name || 'Class'} Section ${selectedClass?.section || ''}`}
      >
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {studentsInClass.map((student) => {
                const optionKey = String(student.id || student._id || student.regNo || '');
                return (
                  <option key={optionKey} value={optionKey}>
                    {student.name || 'N/A'} - {student.regNo || 'No Reg No'}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedStudent && selectedStudentRecord ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Student:</span> {selectedStudent.name || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">Father:</span> {selectedStudent.fatherName || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">Reg No:</span> {selectedStudent.regNo || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">Class:</span> {selectedStudent.class || 'N/A'} - Sec {selectedStudent.section || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">Month:</span> {selectedStudentRecord.month}</p>
                <p><span className="font-semibold text-slate-900">Year:</span> {selectedStudentRecord.year}</p>
                <p><span className="font-semibold text-slate-900">Status:</span> {selectedStudentRecord.status}</p>
                <p><span className="font-semibold text-slate-900">Paid Date:</span> {formatSlipDate(selectedStudentRecord.paidDate)}</p>
                <p><span className="font-semibold text-slate-900">Registration:</span> {formatCurrency(selectedStudentRecord.registrationFee)}</p>
                <p><span className="font-semibold text-slate-900">Monthly:</span> {formatCurrency(selectedStudentRecord.monthlyFee)}</p>
                <p className="sm:col-span-2"><span className="font-semibold text-slate-900">Total:</span> {formatCurrency(selectedStudentRecord.amount)}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handlePrintStudentSlip} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
              <Printer className="h-4 w-4" />
              Print Fee Slip
            </button>
          </div>
        </div>
      </Modal>
    </GlassCard>
  );
};

// Financial Summary Component
const FinancialSummary = ({ totalIncome, totalExpenses, totalSalaryExpense }) => {
  const netProfit = totalIncome - totalExpenses - totalSalaryExpense;
  const profitMargin = totalIncome ? (netProfit / totalIncome * 100) : 0;

  return (
    <GlassCard className="p-5 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
      <h3 className="font-semibold mb-4">Financial Summary</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm opacity-90">Total Income (Fee)</p>
          <p className="text-2xl font-bold">PKR {totalIncome.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Total Expenses</p>
          <p className="text-2xl font-bold">PKR {(totalExpenses + totalSalaryExpense).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Net Profit</p>
          <p className="text-2xl font-bold">{netProfit >= 0 ? 'PKR' : '-PKR'} {Math.abs(netProfit).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm opacity-90">Profit Margin</p>
          <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>
    </GlassCard>
  );
};

const MonthlyFeeReport = ({ classes, students }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(now.toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const studentYears = (students || []).flatMap((student) =>
      (Array.isArray(student?.feeRecords) ? student.feeRecords : []).map((record) => Number(record?.year)).filter(Boolean)
    );
    const yearSet = new Set([currentYear, ...studentYears]);
    return [...yearSet].sort((left, right) => right - left);
  }, [currentYear, students]);

  const reportRows = useMemo(() => {
    const rows = (classes || []).map((cls) => {
      const classStudents = (students || []).filter(
        (student) => student.class === cls.name && student.section === cls.section
      );
      const matchingRecords = classStudents.map((student) => {
        const records = Array.isArray(student?.feeRecords) ? student.feeRecords : [];
        const currentRecord = records.find(
          (record) => record.month === selectedMonth && Number(record.year) === Number(selectedYear)
        );

        if (!currentRecord) {
          return null;
        }

        const amount = Number(
          currentRecord.amount
          || Number(currentRecord.registrationFee || 0) + Number(currentRecord.monthlyFee || 0)
        );

        return {
          status: currentRecord.status || 'Pending',
          amount,
        };
      }).filter(Boolean);

      const expectedAmount = matchingRecords.reduce((sum, record) => sum + record.amount, 0);
      const collectedAmount = matchingRecords
        .filter((record) => record.status === 'Paid')
        .reduce((sum, record) => sum + record.amount, 0);
      const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
      const paidStudents = matchingRecords.filter((record) => record.status === 'Paid').length;
      const pendingStudents = Math.max(matchingRecords.length - paidStudents, 0);

      return {
        id: cls.id,
        classLabel: `${cls.name || 'N/A'} - Section ${cls.section || 'N/A'}`,
        studentCount: classStudents.length,
        recordsCount: matchingRecords.length,
        expectedAmount,
        collectedAmount,
        pendingAmount,
        paidStudents,
        pendingStudents,
      };
    });

    return rows
      .filter((row) => row.studentCount > 0 || row.recordsCount > 0 || row.expectedAmount > 0)
      .sort((left, right) => {
        const leftNumber = Number.parseInt(left.classLabel, 10);
        const rightNumber = Number.parseInt(right.classLabel, 10);
        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber !== rightNumber) {
          return rightNumber - leftNumber;
        }
        return left.classLabel.localeCompare(right.classLabel, undefined, { numeric: true });
      });
  }, [classes, selectedMonth, selectedYear, students]);

  const summary = useMemo(() => {
    const totalExpected = reportRows.reduce((sum, row) => sum + row.expectedAmount, 0);
    const totalCollected = reportRows.reduce((sum, row) => sum + row.collectedAmount, 0);
    const totalPending = reportRows.reduce((sum, row) => sum + row.pendingAmount, 0);
    const studentsWithRecord = reportRows.reduce((sum, row) => sum + row.recordsCount, 0);
    const paidStudents = reportRows.reduce((sum, row) => sum + row.paidStudents, 0);

    return {
      totalExpected,
      totalCollected,
      totalPending,
      studentsWithRecord,
      paidStudents,
      collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
    };
  }, [reportRows]);

  const handleExportPdf = () => {
    downloadMonthlyFeeReportPdf({
      month: selectedMonth,
      year: selectedYear,
      summary,
      rows: reportRows,
    });
  };

  return (
    <GlassCard className="p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-3xl font-semibold text-slate-800">Monthly Fee Report</h3>
          <p className="mt-1 text-sm text-slate-500">Calculate class-wise monthly fee totals and export them in PDF format.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {REPORT_MONTHS.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-sm text-slate-500">Expected This Month</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalExpected)}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-sm text-slate-500">Collected This Month</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(summary.totalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm text-slate-500">Pending This Month</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Collection Rate</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{summary.collectionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="rounded-tl-2xl px-4 py-3 text-left text-sm font-semibold text-white">Class</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">Students</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Expected</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Collected</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Pending</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">Paid</th>
              <th className="rounded-tr-2xl px-4 py-3 text-center text-sm font-semibold text-white">Pending Students</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportRows.length > 0 ? reportRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.classLabel}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.studentCount}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{formatCurrency(row.expectedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-emerald-600">{formatCurrency(row.collectedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-amber-600">{formatCurrency(row.pendingAmount)}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.paidStudents}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.pendingStudents}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  No fee records found for {selectedMonth} {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

const YearlyFeeReport = ({ classes, students }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const availableYears = useMemo(() => {
    const studentYears = (students || []).flatMap((student) =>
      (Array.isArray(student?.feeRecords) ? student.feeRecords : []).map((record) => Number(record?.year)).filter(Boolean)
    );
    const yearSet = new Set([currentYear, ...studentYears]);
    return [...yearSet].sort((left, right) => right - left);
  }, [currentYear, students]);

  const reportRows = useMemo(() => {
    const rows = (classes || []).map((cls) => {
      const classStudents = (students || []).filter(
        (student) => student.class === cls.name && student.section === cls.section
      );

      const matchingRecords = classStudents.flatMap((student) => {
        const records = Array.isArray(student?.feeRecords) ? student.feeRecords : [];
        return records
          .filter((record) => Number(record.year) === Number(selectedYear))
          .map((record) => ({
            month: record.month || '',
            status: record.status || 'Pending',
            amount: Number(record.amount || Number(record.registrationFee || 0) + Number(record.monthlyFee || 0)),
          }));
      });
      const monthsCount = new Set(matchingRecords.map((record) => record.month).filter(Boolean)).size;

      const expectedAmount = matchingRecords.reduce((sum, record) => sum + record.amount, 0);
      const collectedAmount = matchingRecords
        .filter((record) => record.status === 'Paid')
        .reduce((sum, record) => sum + record.amount, 0);
      const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
      const paidStudents = matchingRecords.filter((record) => record.status === 'Paid').length;
      const pendingStudents = Math.max(matchingRecords.length - paidStudents, 0);

      return {
        id: cls.id,
        classLabel: `${cls.name || 'N/A'} - Section ${cls.section || 'N/A'}`,
        studentCount: classStudents.length,
        recordsCount: matchingRecords.length,
        monthsCount,
        expectedAmount,
        collectedAmount,
        pendingAmount,
        paidStudents,
        pendingStudents,
      };
    });

    return rows
      .filter((row) => row.studentCount > 0 || row.recordsCount > 0 || row.expectedAmount > 0)
      .sort((left, right) => {
        const leftNumber = Number.parseInt(left.classLabel, 10);
        const rightNumber = Number.parseInt(right.classLabel, 10);
        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber) && leftNumber !== rightNumber) {
          return rightNumber - leftNumber;
        }
        return left.classLabel.localeCompare(right.classLabel, undefined, { numeric: true });
      });
  }, [classes, selectedYear, students]);

  const summary = useMemo(() => {
    const totalExpected = reportRows.reduce((sum, row) => sum + row.expectedAmount, 0);
    const totalCollected = reportRows.reduce((sum, row) => sum + row.collectedAmount, 0);
    const totalPending = reportRows.reduce((sum, row) => sum + row.pendingAmount, 0);
    const studentsWithRecord = reportRows.reduce((sum, row) => sum + row.recordsCount, 0);
    const paidStudents = reportRows.reduce((sum, row) => sum + row.paidStudents, 0);

    return {
      totalExpected,
      totalCollected,
      totalPending,
      studentsWithRecord,
      paidStudents,
      collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
    };
  }, [reportRows]);

  const handleExportPdf = () => {
    downloadYearlyFeeReportPdf({
      year: selectedYear,
      summary,
      rows: reportRows,
    });
  };

  return (
    <GlassCard className="p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-3xl font-semibold text-slate-800">Yearly Fee Report</h3>
          <p className="mt-1 text-sm text-slate-500">Calculate class-wise yearly fee totals and export them in PDF format.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={handleExportPdf}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-sm text-slate-500">Expected This Year</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalExpected)}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-sm text-slate-500">Collected This Year</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{formatCurrency(summary.totalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm text-slate-500">Pending This Year</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Collection Rate</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{summary.collectionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="rounded-tl-2xl px-4 py-3 text-left text-sm font-semibold text-white">Class</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">Students</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">Months</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Expected</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Collected</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-white">Pending</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-white">Paid</th>
              <th className="rounded-tr-2xl px-4 py-3 text-center text-sm font-semibold text-white">Pending Students</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportRows.length > 0 ? reportRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.classLabel}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.studentCount}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.monthsCount}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-700">{formatCurrency(row.expectedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-emerald-600">{formatCurrency(row.collectedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-amber-600">{formatCurrency(row.pendingAmount)}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.paidStudents}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-700">{row.pendingStudents}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No fee records found for {selectedYear}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// Main Admin Page
export default function AdminPage() {
  const { permissions } = useAuth();
  const canViewFinancialAdministration = hasPermission(
    permissions,
    'FINANCIAL_ADMINISTRATION_VIEW'
  );
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [feeCollection, setFeeCollection] = useState({ totalCollected: 0, totalExpected: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load teachers with sample data if empty
      const teachersResult = await teacherService.getAll();
      if (teachersResult.success && teachersResult.data && teachersResult.data.length > 0) {
        setTeachers(teachersResult.data);
      } else {
        // Initialize with sample data
        for (const sampleTeacher of SAMPLE_TEACHERS) {
          await teacherService.create(sampleTeacher);
        }
        const newResult = await teacherService.getAll();
        if (newResult.success) setTeachers(newResult.data);
        else setTeachers(SAMPLE_TEACHERS);
      }

      // Load classes
      const classesResult = await classService.getAll();
      if (classesResult.success && classesResult.data) {
        const classesWithFee = await Promise.all(classesResult.data.map(async (cls) => {
          try {
            const [feeResult, feeStructureResult] = await Promise.all([
              feeService.getCollectionReport(cls.name, cls.section),
              feeService.getFeeStructure(cls.name, cls.section),
            ]);
            return {
              ...cls,
              collectedFee: feeResult.success ? feeResult.data.totalCollected : 0,
              pendingFee: feeResult.success ? feeResult.data.totalPending : 0,
              registrationFee: feeStructureResult.success ? (feeStructureResult.data.registrationFee || 5000) : 5000,
              monthlyFee: feeStructureResult.success ? (feeStructureResult.data.monthlyFee || 8000) : 8000,
              studentCount: cls.studentCount || 0
            };
          } catch (error) {
            console.error('Error loading fee for class:', error);
            return {
              ...cls,
              collectedFee: 0,
              pendingFee: 0,
              registrationFee: cls.registrationFee || 5000,
              monthlyFee: cls.monthlyFee || 8000,
              studentCount: cls.studentCount || 0
            };
          }
        }));
        setClasses(classesWithFee);
      } else {
        setClasses([]);
      }

      const studentsResult = await studentService.getAll();
      if (studentsResult.success && studentsResult.data) {
        setStudents(studentsResult.data);
      } else {
        setStudents([]);
      }

      // Load fee collection summary
      try {
        const feeResult = await feeService.getCollectionReport();
        if (feeResult.success && feeResult.data) {
          setFeeCollection({
            totalCollected: feeResult.data.totalCollected || 0,
            totalExpected: feeResult.data.totalExpected || 0
          });
        }
      } catch (error) {
        console.error('Error loading fee collection:', error);
      }

      // Load expenses from localStorage
      const savedExpenses = localStorage.getItem('school_expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      } else {
        const defaultExpenses = [
          { category: 'Maintenance', amount: 45000, date: new Date().toISOString().split('T')[0] },
          { category: 'Utilities', amount: 35000, date: new Date().toISOString().split('T')[0] },
          { category: 'Stationery', amount: 15000, date: new Date().toISOString().split('T')[0] }
        ];
        setExpenses(defaultExpenses);
        localStorage.setItem('school_expenses', JSON.stringify(defaultExpenses));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewFinancialAdministration) {
      loadData();
    }
  }, [canViewFinancialAdministration, loadData]);

  const totalSalaryExpense = teachers.reduce((sum, t) => sum + (t.salaryInfo?.totalSalary || 0), 0);
  const totalOtherExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = feeCollection.totalCollected || 0;

  if (!canViewFinancialAdministration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 flex items-center justify-center p-6">
        <GlassCard className="p-10 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Required</h2>
          <p className="text-slate-500 text-sm">
            This page is available only for roles with Financial Administration access.
          </p>
        </GlassCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 px-4 pb-8 pt-0 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <GlassCard className="p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Financial Administration
              </h1>
              <p className="text-sm text-slate-500 mt-1">Manage teacher salaries, fee structures, and overall financial summary</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-slate-500">Current Month</p>
              <p className="text-lg font-semibold text-slate-800">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </GlassCard>

        {/* Financial Summary */}
        <FinancialSummary 
          totalIncome={totalIncome}
          totalExpenses={totalOtherExpenses}
          totalSalaryExpense={totalSalaryExpense}
        />

        {/* Teacher Salaries Section */}
        <TeacherSalaryManager teachers={teachers} onUpdate={loadData} />

        {/* Class-wise Fee Details */}
        <ClassFeeDetails classes={classes} onUpdate={loadData} />

        {/* Yearly Projection */}
        <GlassCard className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Yearly Projection</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Projected Annual Income</p>
              <p className="text-2xl font-bold text-emerald-600">PKR {(totalIncome * 12).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Projected Annual Expenses</p>
              <p className="text-2xl font-bold text-red-600">PKR {((totalOtherExpenses + totalSalaryExpense) * 12).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">Projected Annual Profit</p>
              <p className="text-2xl font-bold text-blue-600">PKR {((totalIncome - totalOtherExpenses - totalSalaryExpense) * 12).toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>

        <MonthlyFeeReport classes={classes} students={students} />

        <YearlyFeeReport classes={classes} students={students} />
      </div>
    </div>
  );
}
