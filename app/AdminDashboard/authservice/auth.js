export const ALLOWED_ROLES = ["ADMIN", "CLERK", "PRINCIPAL", "TEACHERS", "STUDENTS"];
export const MIN_PASSWORD_LENGTH = 6;

export const ROLE_HOME_ROUTES = {
  ADMIN: "/AdminDashboard/dashboard",
  CLERK: "/AdminDashboard/dashboard",
  PRINCIPAL: "/AdminDashboard/dashboard",
  TEACHERS: "/AdminDashboard/dashboard",
  STUDENTS: "/AdminDashboard/dashboard",
};

export const DASHBOARD_ROUTE_PERMISSIONS = [
  { prefix: "/AdminDashboard/dashboard", permissions: ["DASHBOARD_VIEW"] },
  { prefix: "/AdminDashboard/classes", permissions: ["CLASSES_VIEW"] },
  { prefix: "/AdminDashboard/enrollment", permissions: ["STUDENTS_CREATE"] },
  { prefix: "/AdminDashboard/students/edit", permissions: ["STUDENTS_EDIT"] },
  { prefix: "/AdminDashboard/students/student-detail", permissions: ["STUDENTS_VIEW"] },
  { prefix: "/AdminDashboard/students/class-detail", permissions: ["STUDENTS_VIEW"] },
  { prefix: "/AdminDashboard/students", permissions: ["STUDENTS_VIEW"] },
  { prefix: "/AdminDashboard/teachers", permissions: ["TEACHERS_VIEW"] },
  { prefix: "/AdminDashboard/results", permissions: ["RESULTS_VIEW"] },
  { prefix: "/AdminDashboard/fee", permissions: ["FEES_VIEW"] },
  { prefix: "/AdminDashboard/attendance", permissions: ["ATTENDANCE_VIEW"] },
  { prefix: "/AdminDashboard/timetable", permissions: ["TIMETABLE_VIEW"] },
  { prefix: "/AdminDashboard/monthly-expenses", permissions: ["MONTHLY_EXPENSES_VIEW"] },
  { prefix: "/AdminDashboard/admin/print-invoice", permissions: ["FINANCIAL_ADMINISTRATION_VIEW"] },
  { prefix: "/AdminDashboard/admin", permissions: ["FINANCIAL_ADMINISTRATION_VIEW"] },
  { prefix: "/AdminDashboard/users", permissions: ["USERS_VIEW"] },
  { prefix: "/AdminDashboard/roles/add", permissions: ["ROLES_CREATE", "ROLES_EDIT"] },
  { prefix: "/AdminDashboard/roles", permissions: ["ROLES_VIEW"] },
];

export const AUTH_SESSION_COOKIE = "app_auth";
export const AUTH_ROLE_COOKIE = "app_role";
export const AUTH_STORAGE = "sessionStorage";

export function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toUpperCase();

  if (normalizedRole === "CLERCK") return "CLERK";
  if (normalizedRole === "TEACHER") return "TEACHERS";
  if (normalizedRole === "STUDENT") return "STUDENTS";

  return normalizedRole;
}

export function normalizePermission(permission) {
  return String(permission || "").trim().toUpperCase();
}

export function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
}

export function hasPermission(permissions, requiredPermission) {
  const normalizedPermissions = sanitizePermissions(permissions);
  if (normalizedPermissions.includes("*")) return true;
  return normalizedPermissions.includes(normalizePermission(requiredPermission));
}

export function hasAnyPermission(permissions, requiredPermissions = []) {
  const normalizedRequiredPermissions = Array.isArray(requiredPermissions)
    ? requiredPermissions.map(normalizePermission).filter(Boolean)
    : [];

  if (normalizedRequiredPermissions.length === 0) return true;
  return normalizedRequiredPermissions.some((permission) => hasPermission(permissions, permission));
}

export function getRolePermissions(role, permissions = []) {
  const normalizedPermissions = sanitizePermissions(permissions);

  // Older administrator roles can predate newer permissions. Keep the built-in
  // administrator able to reach core administration workflows.
  if (normalizeRole(role) === "ADMIN") {
    return sanitizePermissions([
      ...normalizedPermissions,
      "STUDENTS_CREATE",
      "STUDENTS_EDIT",
      "STUDENTS_PROMOTE",
      "STUDENTS_DELETE",
      "ROLES_CREATE",
      "ROLES_EDIT",
    ]);
  }

  return normalizedPermissions;
}

export function isAllowedRole(role) {
  return ALLOWED_ROLES.includes(normalizeRole(role));
}

export function getRoleHomeRoute(role) {
  const normalized = normalizeRole(role);
  return ROLE_HOME_ROUTES[normalized] || "/AdminDashboard/dashboard";
}

export function canAccessDashboardPath(pathname, permissions = []) {
  const normalizedPath = String(pathname || "").trim();
  if (!normalizedPath.startsWith("/AdminDashboard")) return true;

  const matchedRoute = DASHBOARD_ROUTE_PERMISSIONS.find((route) =>
    normalizedPath.startsWith(route.prefix)
  );

  if (!matchedRoute) return true;
  return hasAnyPermission(permissions, matchedRoute.permissions);
}

export function getFirstAccessibleDashboardRoute(role, permissions = []) {
  const preferredHome = getRoleHomeRoute(role);
  if (canAccessDashboardPath(preferredHome, permissions)) {
    return preferredHome;
  }

  const firstAccessibleRoute = DASHBOARD_ROUTE_PERMISSIONS.find((route) =>
    canAccessDashboardPath(route.prefix, permissions)
  );

  return firstAccessibleRoute?.prefix || "";
}

export function readStoredAuth() {
  if (typeof window === "undefined") {
    return { token: "", role: "", permissions: [] };
  }

  const token = sessionStorage.getItem("authToken") || "";
  const role = normalizeRole(sessionStorage.getItem("role"));

  let permissions = [];
  try {
    const parsed = JSON.parse(sessionStorage.getItem("permissions") || "[]");
    if (Array.isArray(parsed)) {
      permissions = sanitizePermissions(parsed);
    }
  } catch {
    permissions = [];
  }

  return { token, role, permissions: getRolePermissions(role, permissions) };
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("permissions");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("permissions");
}

export function setAuthSessionCookies(role) {
  if (typeof window === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const normalizedRole = normalizeRole(role);

  document.cookie = `${AUTH_SESSION_COOKIE}=1; Path=/; SameSite=Lax${secure}`;
  document.cookie = `${AUTH_ROLE_COOKIE}=${normalizedRole}; Path=/; SameSite=Lax${secure}`;
}

export function clearAuthSessionCookies() {
  if (typeof window === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `${AUTH_ROLE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

