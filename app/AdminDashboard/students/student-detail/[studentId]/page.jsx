'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';

function normalizeStudentId(value) {
  return String(value ?? '').trim();
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const studentId = normalizeStudentId(params?.studentId);

  useEffect(() => {
    let allStudents = [];

    if (typeof window !== 'undefined') {
      const savedStudents = localStorage.getItem('school_students');
      if (savedStudents) {
        try {
          allStudents = JSON.parse(savedStudents);
        } catch {
          allStudents = [];
        }
      }
    }

    const matchedStudent = allStudents.find((item) => normalizeStudentId(item.id) === studentId) || null;
    setStudent(matchedStudent);
    setLoading(false);
  }, [studentId]);

  const feeSummary = useMemo(() => {
    if (!student) return { total: 0, paid: 0, pending: 0 };

    const total =
      student.feeStructure?.total ||
      (student.feeRecords || []).reduce((sum, record) => sum + (record.amount || 0), 0);
    const paid = (student.feeRecords || [])
      .filter((record) => record.status === 'Paid')
      .reduce((sum, record) => sum + (record.amount || 0), 0);

    return {
      total,
      paid,
      pending: Math.max(total - paid, 0),
    };
  }, [student]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-slate-500">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Student not found</h1>
          <p className="mt-2 text-slate-500">The requested student profile could not be loaded.</p>
          <Button
            onClick={() => router.push('/AdminDashboard/students')}
            className="mt-6 bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to Students
          </Button>
        </div>
      </div>
    );
  }

  const biometricEnrolled = student.biometric?.fingerprint?.enrolled || student.biometric?.face?.enrolled;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
                {student.name?.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{student.name}</h1>
                <p className="mt-1 text-sm text-blue-100">
                  {student.regNo} · Class {student.class} · Section {student.section}
                </p>
              </div>
            </div>

            <Button
              onClick={() => router.push(`/AdminDashboard/students/edit/${student.id}`)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Edit Student
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-200 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Student Information</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow label="Father Name" value={student.fatherName} />
              <InfoRow label="Mother Name" value={student.motherName} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="Date of Birth" value={student.dob} />
              <InfoRow label="Phone" value={student.phone || student.fatherPhone} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="CNIC / B-Form" value={student.cnic} />
              <InfoRow label="Address" value={student.address} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Status</h2>
              <div className="mt-4 space-y-3 text-sm">
                <StatusRow label="Attendance" value={`${student.attendance || 90}%`} tone="text-blue-600" />
                <StatusRow
                  label="Fee Status"
                  value={student.feeStatus || (feeSummary.pending > 0 ? 'Pending' : 'Paid')}
                  tone={feeSummary.pending > 0 ? 'text-amber-600' : 'text-emerald-600'}
                />
                <StatusRow
                  label="Biometric"
                  value={biometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  tone={biometricEnrolled ? 'text-emerald-600' : 'text-slate-500'}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-lg border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Fee Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <StatusRow label="Total" value={`PKR ${feeSummary.total.toLocaleString()}`} />
                <StatusRow label="Paid" value={`PKR ${feeSummary.paid.toLocaleString()}`} tone="text-emerald-600" />
                <StatusRow label="Pending" value={`PKR ${feeSummary.pending.toLocaleString()}`} tone="text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value || 'N/A'}</p>
    </div>
  );
}

function StatusRow({ label, value, tone = 'text-slate-800' }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
