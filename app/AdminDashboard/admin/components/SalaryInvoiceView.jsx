'use client';

function formatCurrency(amount) {
  return `PKR ${Number(amount || 0).toLocaleString()}`;
}

function getSalarySlipEmployeeId(teacher = {}) {
  const explicitIdCandidates = [
    teacher.employeeId,
    teacher.teacherId,
    teacher.staffId,
    teacher.personalInfo?.employeeId,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const preferredReadableId = explicitIdCandidates.find((value) => /^EMP-/i.test(value));
  if (preferredReadableId) {
    return preferredReadableId.toUpperCase();
  }

  const readableId = explicitIdCandidates.find((value) => /^[A-Z]{2,}-/i.test(value));
  if (readableId) {
    return readableId.toUpperCase();
  }

  const numericSeed = String(
    teacher.employeeNumber ||
    teacher.staffNumber ||
    teacher.serialNumber ||
    teacher.sortOrder ||
    1
  ).replace(/\D/g, '');

  return `EMP-${numericSeed.slice(-2).padStart(2, '0')}`;
}

function getInvoiceBreakdown(teacher = {}) {
  const basicSalary = Number(teacher.salaryInfo?.basicSalary || 0);
  const houseRent = Number(teacher.salaryInfo?.houseRent || 0);
  const medicalAllowance = Number(teacher.salaryInfo?.medicalAllowance || 0);
  const conveyanceAllowance = Number(teacher.salaryInfo?.conveyanceAllowance || 0);
  const incomeTax = Math.floor(basicSalary * 0.05);
  const professionalTax = 1000;
  const loanDeduction = 0;
  const otherDeductions = 0;
  const totalEarnings =
    Number(teacher.salaryInfo?.totalSalary || basicSalary + houseRent + medicalAllowance + conveyanceAllowance);
  const totalDeductions = incomeTax + professionalTax + loanDeduction + otherDeductions;
  const netPayable = totalEarnings - totalDeductions;

  return {
    basicSalary,
    houseRent,
    medicalAllowance,
    conveyanceAllowance,
    incomeTax,
    professionalTax,
    loanDeduction,
    otherDeductions,
    totalEarnings,
    totalDeductions,
    netPayable,
  };
}

export default function SalaryInvoiceView({
  teacher,
  month,
  year,
  actions,
}) {
  if (!teacher) return null;

  const breakdown = getInvoiceBreakdown(teacher);
  const employeeName = teacher.personalInfo?.name || 'Unknown Teacher';
  const employeeId = getSalarySlipEmployeeId(teacher);
  const designation = teacher.educationInfo?.majorSubject
    ? `${teacher.educationInfo.majorSubject} Teacher`
    : 'Teacher';

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">Salary Invoice</p>
            <h1 className="mt-2 text-3xl font-bold">Salary Slip</h1>
            <p className="mt-2 text-base text-white/85">{month} {year}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left backdrop-blur-sm sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/75">Pay Period</p>
            <p className="mt-2 text-lg font-semibold">{month} {year}</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">Employee Name</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{employeeName}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">Employee ID</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{employeeId}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">Designation</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{designation}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-sm text-slate-500">Pay Period</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{month} {year}</p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-slate-200">
          <div className="grid grid-cols-4 bg-slate-100 text-sm font-bold text-slate-700">
            <div className="px-4 py-4">Earnings</div>
            <div className="px-4 py-4 text-right">Amount (PKR)</div>
            <div className="px-4 py-4">Deductions</div>
            <div className="px-4 py-4 text-right">Amount (PKR)</div>
          </div>

          {[
            ['Basic Salary', breakdown.basicSalary, 'Income Tax', breakdown.incomeTax],
            ['House Rent Allowance', breakdown.houseRent, 'Professional Tax', breakdown.professionalTax],
            ['Medical Allowance', breakdown.medicalAllowance, 'Loan Deduction', breakdown.loanDeduction],
            ['Conveyance Allowance', breakdown.conveyanceAllowance, 'Other Deductions', breakdown.otherDeductions],
          ].map(([earningLabel, earningAmount, deductionLabel, deductionAmount]) => (
            <div key={String(earningLabel)} className="grid grid-cols-4 border-t border-slate-200 text-sm text-slate-700">
              <div className="px-4 py-4">{earningLabel}</div>
              <div className="px-4 py-4 text-right font-medium text-slate-900">{formatCurrency(earningAmount)}</div>
              <div className="px-4 py-4">{deductionLabel}</div>
              <div className="px-4 py-4 text-right font-medium text-slate-900">{formatCurrency(deductionAmount)}</div>
            </div>
          ))}

          <div className="grid grid-cols-4 border-t border-slate-200 bg-emerald-50 text-sm font-bold text-slate-800">
            <div className="px-4 py-4">Total Earnings</div>
            <div className="px-4 py-4 text-right">{formatCurrency(breakdown.totalEarnings)}</div>
            <div className="px-4 py-4">Total Deductions</div>
            <div className="px-4 py-4 text-right">{formatCurrency(breakdown.totalDeductions)}</div>
          </div>

          <div className="grid grid-cols-4 border-t border-slate-200 bg-sky-50 text-slate-900">
            <div className="col-span-3 px-4 py-4 text-base font-bold text-sky-700">Net Payable Amount</div>
            <div className="px-4 py-4 text-right text-xl font-bold text-sky-700">{formatCurrency(breakdown.netPayable)}</div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Authorized Signature</p>
            <div className="mt-10 w-40 border-t border-slate-400" />
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-slate-500">Employee Signature</p>
            <div className="mt-10 inline-block w-40 border-t border-slate-400" />
          </div>
        </div>

        {actions ? <div className="mt-8 print:hidden">{actions}</div> : null}
      </div>
    </div>
  );
}

export { getInvoiceBreakdown, formatCurrency, getSalarySlipEmployeeId };
