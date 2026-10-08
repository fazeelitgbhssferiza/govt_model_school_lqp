"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shield, Users, Layers } from "lucide-react";
import RolesHeader from "../components/roles/RolesHeader";
import RolesGridView from "../components/roles/RolesGridView";
import RolesListView from "../components/roles/RolesListView";
import { apiRequest } from "../authservice/api";
import { hasPermission, normalizeRole } from "../authservice/auth";
import { useAuth } from "../authservice/useAuth";

export default function RolesPage() {
  const { isAdmin, role, user, permissions } = useAuth();
  const [roles, setRoles] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const { canCreateRole, canEditRole, canDeleteRole } = useMemo(() => {
    const resolvedRole = normalizeRole(role || user?.role);
    const hasAdminRole = isAdmin || resolvedRole === "ADMIN" || resolvedRole === "ADMINISTRATOR";
    return {
      canCreateRole: hasAdminRole || hasPermission(permissions, "ROLES_CREATE"),
      canEditRole: hasAdminRole || hasPermission(permissions, "ROLES_EDIT"),
      canDeleteRole: hasAdminRole || hasPermission(permissions, "ROLES_DELETE"),
    };
  }, [isAdmin, permissions, role, user?.role]);

  const loadRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const response = await apiRequest("/roles", {
        method: "GET",
        includeAuth: true,
      });
      const nextRoles = Array.isArray(response)
        ? response
        : Array.isArray(response?.roles)
          ? response.roles
          : [];
      setRoles(nextRoles);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to load roles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);


  const handleDeleteRole = async (roleId) => {
    if (!canDeleteRole) {
      setErrorMessage("You do not have permission to delete roles.");
      return;
    }
    const targetRole = roles.find((role) => role._id === roleId) || null;
    setDeleteCandidate(targetRole);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteRole = async () => {
    if (!deleteCandidate?._id) return;
    try {
      await apiRequest(`/roles/deleteRole/${deleteCandidate._id}`, {
        method: "DELETE",
        includeAuth: true,
      });
      setRoles((prev) => prev.filter((role) => role._id !== deleteCandidate._id));
      setShowDeleteConfirmModal(false);
      setDeleteCandidate(null);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete role.");
    }
  };

  const hydratedRoles = roles.map((role) => ({
    ...role,
    userCount: role.userCount || 0,
  }));

  const totalPermissions = hydratedRoles.reduce(
    (sum, role) => sum + (Array.isArray(role.permissions) ? role.permissions.length : 0),
    0
  );

  const statCards = [
    {
      title: "Total Roles",
      value: hydratedRoles.length,
      subtitle: "Roles currently configured",
      icon: Layers,
      tone: "from-cyan-500 via-blue-500 to-emerald-500",
    },
    {
      title: "Permission Slots",
      value: totalPermissions,
      subtitle: "Total permission assignments",
      icon: Shield,
      tone: "from-amber-500 via-orange-500 to-rose-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),radial-gradient(circle_at_85%_20%,#dcfce7,transparent_30%),linear-gradient(to_bottom,#f8fafc,#eef2ff)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,transparent_35%),radial-gradient(circle_at_85%_20%,#0b1324,transparent_30%),linear-gradient(to_bottom,#0b1220,#0f172a)] py-4 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-xl border border-white/70 bg-white/80 backdrop-blur shadow-lg shadow-black/5 p-4 sm:p-5 dark:border-gray-700/60 dark:bg-gray-900/70">
          <RolesHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            canCreateRole={canCreateRole}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`rounded-xl border border-white/30 bg-gradient-to-br ${card.tone} p-3 shadow-md shadow-black/15 hover:shadow-lg hover:shadow-black/20 transition-all duration-300`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-white/90">
                      {card.title}
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-white">{card.value}</p>
                    <p className="mt-1 text-[11px] text-white/85">{card.subtitle}</p>
                  </div>
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/70 bg-white/80 p-3 sm:p-4 shadow-md shadow-black/5 backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading roles...
            </div>
          ) : errorMessage ? (
            <div className="rounded-lg bg-red-50 text-red-700 border border-red-200 p-4 text-sm">
              {errorMessage}
            </div>
          ) : hydratedRoles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
              <p className="text-base font-semibold text-slate-800">No roles found</p>
              <p className="mt-1 text-xs text-slate-500">
                Create your first role to start assigning permissions.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <RolesGridView
              roles={hydratedRoles}
              handleDeleteRole={handleDeleteRole}
              canEditRole={canEditRole}
              canDeleteRole={canDeleteRole}
            />
          ) : (
            <RolesListView
              roles={hydratedRoles}
              handleDeleteRole={handleDeleteRole}
              canEditRole={canEditRole}
              canDeleteRole={canDeleteRole}
            />
          )}
        </div>

        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:border-gray-700 dark:bg-gray-800">
              <p className="rounded-2xl bg-red-400 px-4 py-3 text-center text-xl font-semibold text-white">
                Delete Alert
              </p>
              <p className="mt-3 text-center text-lg font-medium text-gray-800 dark:text-gray-200">
                Are you sure want to Delete {deleteCandidate?.role || "Role"} ?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={confirmDeleteRole}
                  className="rounded-xl bg-rose-600 px-6 py-2 font-medium text-white hover:bg-rose-700"
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setDeleteCandidate(null);
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-2 font-medium text-gray-700 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
