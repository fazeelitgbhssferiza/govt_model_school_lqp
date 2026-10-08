"use client";

export const PERMISSION_ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "PROMOTE"];

export const PERMISSION_MODULES = [
  { key: "DASHBOARD", label: "Dashboard", actions: ["VIEW"] },
  { key: "CLASSES", label: "Classes", actions: PERMISSION_ACTIONS },
  { key: "STUDENTS", label: "Students", actions: PERMISSION_ACTIONS },
  { key: "TEACHERS", label: "Teachers", actions: PERMISSION_ACTIONS },
  { key: "RESULTS", label: "Results", actions: PERMISSION_ACTIONS },
  { key: "FEES", label: "Fees", actions: PERMISSION_ACTIONS },
  { key: "ATTENDANCE", label: "Attendance", actions: PERMISSION_ACTIONS },
  { key: "TIMETABLE", label: "Time Table", actions: PERMISSION_ACTIONS },
  { key: "MONTHLY_EXPENSES", label: "Monthly Expenses", actions: PERMISSION_ACTIONS },
  { key: "FINANCIAL_ADMINISTRATION", label: "Financial Administration", actions: PERMISSION_ACTIONS },
  { key: "USERS", label: "Users", actions: PERMISSION_ACTIONS },
  { key: "ROLES", label: "Roles", actions: PERMISSION_ACTIONS },
];

export const PERMISSION_OPTIONS = PERMISSION_MODULES.flatMap((module) =>
  module.actions.map((action) => ({
    key: `${module.key}_${action}`,
    label: `${module.label} ${action.charAt(0)}${action.slice(1).toLowerCase()}`,
    moduleKey: module.key,
    moduleLabel: module.label,
    action,
  }))
);

export const ALL_PERMISSIONS = PERMISSION_OPTIONS.map((item) => item.key);

export function getPermissionLabel(permission) {
  const matched = PERMISSION_OPTIONS.find((item) => item.key === permission);
  if (matched) return matched.label;

  return String(permission || "")
    .split("_")
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(" ");
}
