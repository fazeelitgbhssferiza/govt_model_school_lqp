"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, CheckSquare, Square, Layers3, FileText, Sparkles, ArrowLeft } from "lucide-react";
import { apiRequest } from "../../authservice/api";
import {
  getRolePermissions,
  hasPermission,
  normalizeRole,
  readStoredAuth,
  sanitizePermissions,
} from "../../authservice/auth";
import { useAuth } from "../../authservice/useAuth";
import {
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
  PERMISSION_OPTIONS,
  getPermissionLabel,
} from "../../components/roles/permissionCatalog";

const ROLE_DEFAULTS = {
  CLERK: {
    description: "Can manage daily school office tasks and operational records.",
    permissions: ["DASHBOARD_VIEW", "CLASSES_VIEW", "STUDENTS_VIEW", "FEES_VIEW", "ATTENDANCE_VIEW"],
  },
  PRINCIPAL: {
    description: "Can supervise school operations and review administrative reports.",
    permissions: ALL_PERMISSIONS,
  },
  TEACHERS: {
    description: "Can access teacher-related workflows and assigned academic tasks.",
    permissions: ["DASHBOARD_VIEW", "STUDENTS_VIEW", "RESULTS_VIEW", "ATTENDANCE_VIEW", "TIMETABLE_VIEW"],
  },
  STUDENTS: {
    description: "Can access student-related records and limited academic features.",
    permissions: ["DASHBOARD_VIEW", "RESULTS_VIEW", "FEES_VIEW", "ATTENDANCE_VIEW", "TIMETABLE_VIEW"],
  },
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "CLERK", label: "Clerk" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "TEACHERS", label: "Teachers" },
  { value: "STUDENTS", label: "Students" },
];

export default function AddRolePage() {
  const router = useRouter();
  const { isAdmin, role: signedInRole, user: signedInUser, permissions: authPermissions } = useAuth();
  const searchParams = useSearchParams();
  const roleId = searchParams.get("id");
  const requestedRole = normalizeRole(searchParams.get("role"));
  const isEditMode = Boolean(roleId);

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [fetchingRole, setFetchingRole] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canSubmitRole = useMemo(() => {
    const resolvedRole = normalizeRole(signedInRole || signedInUser?.role);
    const hasAdminRole = isAdmin || resolvedRole === "ADMIN" || resolvedRole === "ADMINISTRATOR";
    return isEditMode
      ? hasAdminRole || hasPermission(authPermissions, "ROLES_EDIT")
      : hasAdminRole || hasPermission(authPermissions, "ROLES_CREATE");
  }, [authPermissions, isAdmin, isEditMode, signedInRole, signedInUser?.role]);

  useEffect(() => {
    if (!isEditMode) return;

    const loadRole = async () => {
      try {
        setFetchingRole(true);
        setErrorMessage("");
        const role = await apiRequest(`/roles/${roleId}`, {
          method: "GET",
          includeAuth: true,
        });
        setRoleName(
          role?.role === "SALES_MANAGER"
            ? "Sales_Manager"
            : role?.role === "SERVICE_REPAIR"
              ? "SERVICE_REPAIR"
              : role?.role || ""
        );
        setDescription(role?.description || "");
        setPermissions(Array.isArray(role?.permissions) ? role.permissions : []);
        setStatus(role?.status || "ACTIVE");
      } catch (error) {
        setErrorMessage(error?.message || "Failed to load role.");
      } finally {
        setFetchingRole(false);
      }
    };

    loadRole();
  }, [isEditMode, roleId]);

  useEffect(() => {
    if (isEditMode || !requestedRole || roleName) return;
    const defaults = ROLE_DEFAULTS[requestedRole];
    setRoleName(requestedRole);
    setDescription(defaults?.description || "");
    setPermissions(defaults?.permissions || []);
  }, [isEditMode, requestedRole, roleName]);

  const permissionModules = useMemo(() => PERMISSION_MODULES || [], []);
  const permissionOptions = useMemo(() => PERMISSION_OPTIONS || [], []);
  const selectedModulesCount = useMemo(
    () =>
      permissionModules.filter((module) =>
        permissionOptions.some(
          (item) => item.moduleKey === module.key && permissions.includes(item.key)
        )
      ).length,
    [permissionModules, permissionOptions, permissions]
  );
  const selectedRoleLabel =
    ROLE_OPTIONS.find((option) => option.value === roleName)?.label || "Select Role";
  const permissionCompletion = permissionOptions.length
    ? Math.round((permissions.length / permissionOptions.length) * 100)
    : 0;

  const togglePermission = (permission) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((perm) => perm !== permission)
        : [...prev, permission]
    );
  };

  const handleRoleChange = (value) => {
    setRoleName(value);

    if (isEditMode) return;

    const defaults = ROLE_DEFAULTS[value];
    if (!defaults) return;

    setDescription(defaults.description);
    setPermissions(defaults.permissions);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmitRole) {
      setErrorMessage(
        isEditMode
          ? "You do not have permission to update roles."
          : "You do not have permission to create roles."
      );
      return;
    }

    if (!roleName.trim() || permissions.length === 0) {
      setErrorMessage("Role and at least one permission are required.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await apiRequest(
        isEditMode ? `/roles/updateRole/${roleId}` : "/roles/createRole",
        {
          method: isEditMode ? "PUT" : "POST",
          data: {
            role: roleName.trim().toUpperCase(),
            description: description.trim(),
            permissions,
            status,
          },
          includeAuth: true,
        }
      );

      if (typeof window !== "undefined") {
        const { role: currentRole } = readStoredAuth();
        const savedRole = normalizeRole(response?.role?.role || roleName);
        if (currentRole && currentRole === savedRole) {
          const nextPermissions = getRolePermissions(
            savedRole,
            sanitizePermissions(response?.role?.permissions || permissions)
          );
          sessionStorage.setItem("permissions", JSON.stringify(nextPermissions));
          window.dispatchEvent(new Event("storage"));
        }
      }

      router.push("/AdminDashboard/roles");
    } catch (error) {
      setErrorMessage(error?.message || "Failed to save role.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = fetchingRole || loading || !canSubmitRole;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f4f8f4_55%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/AdminDashboard/roles"
          className="inline-flex items-center gap-2 text-lg font-semibold text-black transition hover:text-black/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Roles
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.45)]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_44%,#0f766e_100%)] px-6 py-7 text-white sm:px-8 sm:py-8">
            <div className="absolute inset-0 bg-blue-700" />
            <div className="relative space-y-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-white/85 uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Role Management
                </div>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
                    <Shield className="h-7 w-7" />
                  </span>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {isEditMode ? "Edit Role" : "Create Role"}
                    </h1>
                  </div>
                </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Selected</p>
                    <p className="mt-1 text-2xl font-semibold">{permissions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Coverage</p>
                    <p className="mt-1 text-2xl font-semibold">{permissionCompletion}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 lg:p-8">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-slate-900">Role Summary</h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="rounded-3xl bg-sky-400 p-5 text-black shadow-[0_18px_40px_-28px_rgba(56,189,248,0.75)]">
                    <p className="text-2xl font-semibold">{selectedRoleLabel}</p>
                    <p className="mt-3 text-sm leading-6 text-black/80">
                      {description?.trim() || "Add a short description so staff can quickly understand this role."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-400 p-4 text-black shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/70">Permissions</p>
                      <p className="mt-2 text-2xl font-semibold text-black">{permissions.length}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-300 bg-violet-400 p-4 text-black shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/70">Modules</p>
                      <p className="mt-2 text-2xl font-semibold text-black">{selectedModulesCount}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-300 bg-amber-400 p-4 text-black shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/70">Status</p>
                      <p className="mt-2 text-base font-semibold text-black">{status}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-300 bg-rose-400 p-4 text-black shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/70">Coverage</p>
                      <p className="mt-2 text-base font-semibold text-black">{permissionCompletion}%</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Layers3 className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Role Details</h2>                      
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Role Key</label>
                      <select
                        value={roleName}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        disabled={disabled || isEditMode}
                      >
                        <option value="">Select Role</option>
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        disabled={disabled}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Permission Modules</h2>                        
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                        {selectedModulesCount} of {permissionModules.length} modules
                      </span>
                      <button
                        type="button"
                        onClick={() => setPermissions([...ALL_PERMISSIONS])}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        disabled={disabled}
                      >
                        <CheckSquare className="h-3.5 w-3.5" />
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissions([])}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        disabled={disabled}
                      >
                        <Square className="h-3.5 w-3.5" />
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {permissionModules.map((module) => {
                      const moduleOptions = permissionOptions.filter((item) => item.moduleKey === module.key);
                      const activeCount = moduleOptions.filter((item) => permissions.includes(item.key)).length;

                      return (
                        <div
                          key={module.key}
                          className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm transition hover:border-slate-300"
                        >
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-base text-slate-800">{module.label}</p>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                  {activeCount}/{moduleOptions.length}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPermissions((prev) => [
                                    ...new Set([...prev, ...moduleOptions.map((item) => item.key)]),
                                  ])
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                disabled={disabled}
                              >
                                <CheckSquare className="h-3 w-3" />
                                All
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPermissions((prev) =>
                                    prev.filter((item) => !moduleOptions.some((option) => option.key === item))
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                disabled={disabled}
                              >
                                <Square className="h-3 w-3" />
                                Clear
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {moduleOptions.map((permission) => (
                              <label
                                key={permission.key}
                                className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-base cursor-pointer transition ${
                                  permissions.includes(permission.key)
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={permissions.includes(permission.key)}
                                  onChange={() => togglePermission(permission.key)}
                                  disabled={disabled}
                                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                {getPermissionLabel(permission.key).replace(`${module.label} `, "")}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/AdminDashboard/roles"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={disabled}
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#059669_0%,#0284c7_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_-18px_rgba(2,132,199,0.7)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_40px_-18px_rgba(5,150,105,0.65)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Saving..." : isEditMode ? "Update Role" : "Create Role"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
