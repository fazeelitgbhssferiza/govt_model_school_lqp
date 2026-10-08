import { Shield } from "lucide-react";

export default function SecretCodeBestPractices() {
  return (
    <div className="bg-[linear-gradient(135deg,_#eef2ff,_#ecfeff)] dark:bg-indigo-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-indigo-200 mb-4 flex items-center gap-2  ">
        <Shield className="w-5 h-5" />
        Secret Code Best Practices
      </h3>
      <ul className="space-y-3 text-slate-700 dark:text-indigo-300 text-sm font-sans">
        <li className="flex items-start gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <span><strong>One code per role:</strong> Each role should have its own unique secret code</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <span><strong>Limited usage:</strong> Set usage limits per code based on expected number of users</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <span><strong>Secure distribution:</strong> Share codes through secure channels only</span>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <span><strong>Regular rotation:</strong> Regenerate codes every 30-90 days for enhanced security</span>
        </li>
      </ul>
    </div>
  );
}
