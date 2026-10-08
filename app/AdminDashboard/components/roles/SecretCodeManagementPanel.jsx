import { Key } from "lucide-react";

export default function SecretCodeManagementPanel() {
  return (
    <div className="bg-white/90 dark:bg-gray-800 rounded-2xl p-6 border border-slate-200/70 dark:border-gray-700 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)]">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2  ">
        <Key className="w-5 h-5" />
        Secret Code Management
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">How It Works</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Generate unique secret codes for each role</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Share codes securely with intended users</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Users register with code to get auto-assigned role</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Security Tips</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Regenerate codes periodically</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Monitor code usage statistics</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
              <span>Revoke unused codes after expiration</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Quick Actions</h4>
          <div className="flex flex-col gap-2">
            <button className="w-full text-sm bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg transition shadow-sm">
              Generate All New Codes
            </button>
            <button className="w-full text-sm bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 px-4 py-2 rounded-lg transition">
              Export All Codes
            </button>
            <button className="w-full text-sm bg-rose-50 hover:bg-rose-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-rose-700 dark:text-red-300 px-4 py-2 rounded-lg transition">
              Revoke All Unused Codes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
