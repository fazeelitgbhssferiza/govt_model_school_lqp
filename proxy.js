import { NextResponse } from "next/server";

const AUTH_SESSION_COOKIE = "app_auth";
const AUTH_ROLE_COOKIE = "app_role";

const ROLE_HOME_ROUTES = {
  ADMIN: "/AdminDashboard",
  SALES_MANAGER: "/AdminDashboard/pos",
  PHARMACY: "/AdminDashboard/pos",
};

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function getRoleHomeRoute(role) {
  const normalized = normalizeRole(role);
  return ROLE_HOME_ROUTES[normalized] || "/AdminDashboard/dashboard";
}

export function proxy(req) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const roleCookie = normalizeRole(req.cookies.get(AUTH_ROLE_COOKIE)?.value);

  const isAuthenticated = sessionCookie === "1";
  const hasValidRole = roleCookie.length > 0;
  const isValidSession = isAuthenticated && hasValidRole;
  const isDashboardRoute = pathname.startsWith("/AdminDashboard");
  const isLoginRoute = pathname.startsWith("/auth/login");

  if (isDashboardRoute && !isValidSession) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_SESSION_COOKIE);
    response.cookies.delete(AUTH_ROLE_COOKIE);
    return response;
  }

  if (isLoginRoute && isValidSession) {
    return NextResponse.redirect(new URL(getRoleHomeRoute(roleCookie), req.url));
  }

  if (pathname === "/") {
    const target = isValidSession ? getRoleHomeRoute(roleCookie) : "/auth/login";
    return NextResponse.redirect(new URL(target, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/AdminDashboard/:path*", "/auth/login"],
};

