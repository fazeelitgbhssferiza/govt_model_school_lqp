"use client";

import React from "react";
import { Shield, Pen, Check, X } from "lucide-react";

const RoleCard = ({ role, onEdit, onPermissions }) => {
  if (!role) return null;

  return (
    <div className="rounded-2xl bg-white/85 backdrop-blur border border-slate-200/70 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)] transition-all">
      <div className="p-6 border-b border-slate-200/70 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-700 text-white flex items-center justify-center"
          >
            <Shield className="w-12 h-6" />
          </div>
          <div>
            <div className="font-semibold text-xl  ">{role.role}</div>
            {role.description && (
              <p className="text-xs text-slate-500 mt-1">{role.description}</p>
            )}
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
            role.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {role.status}
        </span>
      </div>

      <div className="p-6 space-y-4">
        {role.permissions && role.permissions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2 tracking-wide">
              Permissions Summary
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {role.permissions.map((perm) => (
                <div key={perm} className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="capitalize text-slate-600">{perm.replace(/_/g, " ").toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onPermissions(role)}
            className="flex-1 h-9 text-xs rounded-lg border border-emerald-200 bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center gap-2 transition"
          >
            Permissions
          </button>

          <button
            onClick={() => onEdit(role)}
            className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            <Pen className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleCard;
