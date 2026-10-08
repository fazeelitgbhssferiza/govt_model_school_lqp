'use client';

import { CircleCheckBig, CircleX } from 'lucide-react';

export default function ResultAnalytics({ data }) {
  if (!data) return null;

  const { passedCount, failedCount, passRate, gradeDistribution } = data;
  const topGrade =
    Object.entries(gradeDistribution || {}).sort(([, countA], [, countB]) => countB - countA)[0]?.[0] || '-';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-amber-500 bg-amber-400 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-slate-700 mb-1">Top Grade</p>
            <p className="text-2xl font-bold text-slate-900">{topGrade}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
            <span className="text-base font-bold text-slate-900">A+</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500 bg-emerald-400 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-slate-700 mb-1">Passed</p>
            <p className="text-2xl font-bold text-slate-900">{passedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
            <CircleCheckBig className="h-5 w-5 text-emerald-700" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-rose-500 bg-rose-400 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700 mb-1">Failed</p>
            <p className="text-2xl font-bold text-slate-900">{failedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
            <CircleX className="h-5 w-5 text-rose-700" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-violet-500 bg-violet-400 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700 mb-1">Pass Rate</p>
            <p className="text-2xl font-bold text-slate-900">{passRate}%</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
            <span className="text-xl">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
