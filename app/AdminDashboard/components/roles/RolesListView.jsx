import Link from "next/link";
import { Shield, Edit2, Trash2 } from "lucide-react";

export default function RolesListView({
  roles,
  handleDeleteRole,
  canEditRole = true,
  canDeleteRole = true,
}) {
  return (
    <div className="bg-white/90 dark:bg-gray-800 rounded-xl border border-slate-200/70 dark:border-gray-700 overflow-x-auto shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)]">
      <table className="w-full min-w-[900px] table-fixed text-sm">
        <thead className="bg-blue-600">
          <tr>
            <th className="w-[22%] text-left px-4 py-3 text-base font-semibold text-white">Role</th>
            <th className="w-[46%] text-left px-4 py-3 text-base font-semibold text-white">Description</th>
            <th className="w-[12%] text-left px-4 py-3 text-base font-semibold text-white">Users</th>
            <th className="w-[20%] text-right px-4 py-3 text-base font-semibold text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role._id} className="border-t border-slate-200/70 dark:border-gray-700 hover:bg-slate-50/70 transition">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{role.role}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-base text-gray-600 dark:text-gray-400">
                {role.description || "No description"}
              </td>
              <td className="px-3 py-2.5 text-base text-gray-700 dark:text-gray-300">{role.userCount}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={canEditRole ? `/AdminDashboard/roles/add?id=${role._id}` : "#"}
                    aria-disabled={!canEditRole}
                    onClick={(event) => {
                      if (!canEditRole) event.preventDefault();
                    }}
                    className={`p-1.5 rounded transition ${
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
                    className={`p-1.5 rounded transition ${
                      canDeleteRole
                        ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        : "text-gray-300 bg-gray-100 cursor-not-allowed"
                    }`}
                    title={canDeleteRole ? "Delete Role" : "No permission to delete role"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
