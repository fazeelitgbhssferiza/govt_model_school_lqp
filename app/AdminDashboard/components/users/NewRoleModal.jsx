"use client";

import { X } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "principal", label: "Principal" },
  { value: "clerck", label: "Clerck" },
  { value: "teachers", label: "Teachers" },
  { value: "students", label: "Students" },
];

export default function NewRoleModal({
  isOpen,
  onClose,
  onSubmit,
  newRoleData,
  setNewRoleData,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 dark:bg-gray-800 rounded-3xl shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200/70 dark:border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-700 p-6 sm:p-8 flex items-center justify-between rounded-t-3xl">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white  ">Add New Role</h1>
          <button onClick={onClose} className="text-white/90 hover:text-white rounded-full p-2 hover:bg-white/10 transition">
            <X size={28} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name *
              </label>
              <select
                value={newRoleData.name}
                onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                required
              >
                <option value="">Select Role</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                Continue to the role page to choose the exact CRUD permissions with checkboxes.
              </p>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition font-medium order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-xl font-medium transition order-1 sm:order-2"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
