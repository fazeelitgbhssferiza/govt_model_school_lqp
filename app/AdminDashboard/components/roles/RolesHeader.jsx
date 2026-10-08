import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";

export default function RolesHeader({ viewMode, setViewMode, canCreateRole = true }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Roles Management
        </h1>        
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white/90 dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              viewMode === "grid"
                ? "bg-gradient-to-r from-slate-900 to-indigo-700 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              viewMode === "list"
                ? "bg-gradient-to-r from-slate-900 to-indigo-700 text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
        <Link
          href={canCreateRole ? "/AdminDashboard/roles/add" : "#"}
          aria-disabled={!canCreateRole}
          onClick={(event) => {
            if (!canCreateRole) event.preventDefault();
          }}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            canCreateRole
              ? "bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
          title={canCreateRole ? "Create New Role" : "You do not have permission to create roles"}
        >
          <Plus className="w-4 h-4" />
          Create New Role
        </Link>
      </div>
    </div>
  );
}
