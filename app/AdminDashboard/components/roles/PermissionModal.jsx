"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { apiRequest } from "../../authservice/api";
import {
  ALL_PERMISSIONS,
  PERMISSION_MODULES,
  PERMISSION_OPTIONS,
  getPermissionLabel,
} from "./permissionCatalog";

const PermissionsModal = ({ role, open, onClose, onSave }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && Array.isArray(role?.permissions)) {
      setPermissions([...new Set(role.permissions)]);
    } else if (open) {
      setPermissions([]);
    }
  }, [role, open]);

  const filteredPermissions = useMemo(
    () =>
      (PERMISSION_OPTIONS || []).filter((perm) =>
        getPermissionLabel(perm.key).toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const selectAll = () => setPermissions([...ALL_PERMISSIONS]);
  const unselectAll = () => setPermissions([]);

  const handleSave = async () => {
    if (!role?._id) return;
    if (permissions.length === 0) {
      alert("At least one permission is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest(`/roles/updateRole/${role._id}`, {
        method: "PUT",
        data: {
          role: role.role,
          description: role.description || "",
          status: role.status || "ACTIVE",
          permissions,
        },
        includeAuth: true,
      });

      onSave(role._id, res?.role?.permissions || permissions);
      onClose();
    } catch (error) {
      alert(error?.message || "Failed to save permissions.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur rounded-3xl shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/70">
        <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-700 text-white p-6 rounded-t-3xl">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold  ">Manage Permissions</h2>
            <p className="text-sm text-indigo-200">Role: {role?.role || "N/A"}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X />
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-3 flex-wrap justify-between border-b border-slate-200">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions..."
            className="border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 rounded-xl w-full sm:w-72 text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition"
            >
              Select All
            </button>
            <button
              onClick={unselectAll}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="space-y-3 p-6">
          {(PERMISSION_MODULES || []).map((module) => {
            const modulePermissions = filteredPermissions.filter((item) => item.moduleKey === module.key);
            if (modulePermissions.length === 0) return null;

            return (
              <div key={module.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-sm text-slate-700">{module.label}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPermissions((prev) => [...new Set([...prev, ...modulePermissions.map((item) => item.key)])])}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermissions((prev) => prev.filter((item) => !modulePermissions.some((option) => option.key === item)))}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {modulePermissions.map((perm) => (
                    <div
                      key={perm.key}
                      onClick={() => togglePermission(perm.key)}
                      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-sm transition ${
                        permissions.includes(perm.key)
                          ? "bg-emerald-500 text-white border-emerald-400 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {permissions.includes(perm.key) && <Check size={16} />}
                      {getPermissionLabel(perm.key).replace(`${module.label} `, "")}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-blue-600 transition"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;
