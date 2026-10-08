import Link from "next/link";
import { Shield, Edit2, Trash2 } from "lucide-react";

export default function RolesGridView({
  roles,
  handleDeleteRole,
  canEditRole = true,
  canDeleteRole = true,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {roles.map((role) => (
        <div
          key={role._id}
          className="bg-white/90 dark:bg-gray-800 rounded-xl border border-slate-200/70 dark:border-gray-700 p-4 hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)] transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-900 rounded-lg shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex gap-1.5">
              <Link
                href={canEditRole ? `/AdminDashboard/roles/add?id=${role._id}` : "#"}
                aria-disabled={!canEditRole}
                onClick={(event) => {
                  if (!canEditRole) event.preventDefault();
                }}
                className={`p-1.5 rounded-lg transition ${
                  canEditRole
                    ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    : "text-gray-300 bg-gray-100 cursor-not-allowed"
                }`}
                title={canEditRole ? "Edit Role" : "No permission to edit role"}
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDeleteRole(role._id)}
                disabled={!canDeleteRole}
                className={`p-1.5 rounded-lg transition ${
                  canDeleteRole
                    ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                    : "text-gray-300 bg-gray-100 cursor-not-allowed"
                }`}
                title={canDeleteRole ? "Delete Role" : "No permission to delete role"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5  ">
            {role.role}
          </h3>

          <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 font-sans">
            {role.description || "No description"}
          </p>

          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">
                Permissions ({role.permissions.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 3).map((perm, idx) => (
                <span
                  key={idx}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-full text-[11px]"
                >
                  {perm}
                </span>
              ))}
              {role.permissions.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{role.permissions.length - 3} more
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/70 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-sans">
              {role.userCount} users
            </span>
            <Link
              href={`/AdminDashboard/users?role=${role.role}`}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium font-sans"
            >
              View Users
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
