"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiRequest } from "../../AdminDashboard/authservice/api";
import {
  ALLOWED_ROLES,
  getFirstAccessibleDashboardRoute,
  getRolePermissions,
  MIN_PASSWORD_LENGTH,
  normalizeRole,
  sanitizePermissions,
  setAuthSessionCookies,
} from "../../AdminDashboard/authservice/auth";
import {
  FaUserCog,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    try {
      const rememberedLogin = JSON.parse(localStorage.getItem("rememberedLogin") || "null");
      const rememberedRole = normalizeRole(rememberedLogin?.role);

      setForm((currentForm) => ({
        ...currentForm,
        email: String(rememberedLogin?.email || ""),
        role: ALLOWED_ROLES.includes(rememberedRole) ? rememberedRole : "",
      }));
    } catch {
      // Ignore invalid remembered login data and keep the form empty.
    }
  }, []);

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const resolveAllowedRoute = (role, permissions = []) => {
    const nextRoute = getFirstAccessibleDashboardRoute(role, permissions);
    return nextRoute || "/AdminDashboard/dashboard";
  };

  const getLoginErrorMessage = (error) => {
    const status = error?.status || error?.response?.status;
    const backendReason =
      error?.response?.data?.reason ||
      error?.original?.response?.data?.reason ||
      "";
    const backendMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.original?.response?.data?.message ||
      error?.original?.response?.data?.error ||
      error?.message ||
      "Unable to sign in.";

    if (/role_mismatch/i.test(backendReason)) {
      return "The selected role does not match this account. Please choose the correct role and try again.";
    }

    if (/inactive_user/i.test(backendReason)) {
      return "This account is inactive. Please contact the administrator.";
    }

    if (/invalid email or password/i.test(backendMessage)) {
      return "Invalid email or password.";
    }

    if (/selected role does not match/i.test(backendMessage)) {
      return "The selected role does not match this account. Please choose the correct role and try again.";
    }

    if (/invalid login response/i.test(backendMessage)) {
      return "The server accepted the login but returned incomplete account data. Please contact the administrator.";
    }

    if (/no permissions assigned/i.test(backendMessage)) {
      return "Your account does not have any permissions assigned yet. Please contact the administrator.";
    }

    if (status === 503 || /database_unavailable/i.test(backendReason)) {
      return "The sign-in service is temporarily unavailable because the database cannot be reached. Please try again shortly.";
    }

    if (status >= 500) {
      return "The server could not complete the login request. Please try again in a moment.";
    }

    if (/request timed out/i.test(backendMessage)) {
      return "The login request timed out. Please try again.";
    }

    if (/network error/i.test(backendMessage)) {
      return "Unable to reach the server. Check your internet connection and backend API URL, then try again.";
    }

    return backendMessage;
  };

  const isInvalidCredentialError = (error) => {
    const status = error?.status || error?.response?.status;
    const backendMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "";

    return status === 401 && /invalid email or password/i.test(backendMessage);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const email = form.email.trim();
    const password = form.password;
    const selectedRole = normalizeRole(form.role);

    if (!emailPattern.test(email)) {
      setMessage("Please enter a valid email address");
      setShowErrorModal(true);
      return;
    }

    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      setMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      setShowErrorModal(true);
      return;
    }

    if (!ALLOWED_ROLES.includes(selectedRole)) {
      setMessage("Please select a valid role");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);

    try {
      const loginPayload = {
        email,
        password,
        role: selectedRole,
      };

      let response;

      try {
        response = await apiRequest("/user-management/login", {
          method: "POST",
          data: loginPayload,
        });
      } catch (error) {
        if (!selectedRole || !isInvalidCredentialError(error)) {
          throw error;
        }

        // Some deployed backends validate the credentials first and reject
        // mismatched roles with the same generic 401 message. Retry once
        // without the role field so the backend can return the account role.
        response = await apiRequest("/user-management/login", {
          method: "POST",
          data: {
            email,
            password,
          },
        });
      }

      const loginData = response?.data && typeof response.data === "object" ? response.data : response;
      const { token, user } = loginData || {};
      const returnedRole = normalizeRole(user?.role);

      if (!token || !user || !ALLOWED_ROLES.includes(returnedRole)) {
        throw new Error("Invalid login response");
      }

      if (returnedRole !== selectedRole) {
        throw new Error("Selected role does not match your account role");
      }

      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("permissions");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("permissions");

      const userData = { ...user, role: returnedRole };

      sessionStorage.setItem("authToken", token);
      sessionStorage.setItem("user", JSON.stringify(userData));
      sessionStorage.setItem("role", returnedRole);
      const normalizedPermissions = getRolePermissions(
        returnedRole,
        sanitizePermissions(Array.isArray(user?.permissions) ? user.permissions : [])
      );
      if (returnedRole !== "ADMIN" && normalizedPermissions.length === 0) {
        throw new Error("Your account has no permissions assigned. Contact administrator.");
      }
      sessionStorage.setItem("permissions", JSON.stringify(normalizedPermissions));

      setAuthSessionCookies(returnedRole);

      window.dispatchEvent(new Event("storage"));
      setShowSuccess(true);
      const nextRoute = resolveAllowedRoute(returnedRole, normalizedPermissions);

      setTimeout(() => {
        window.location.replace(nextRoute);
      }, 800);
    } catch (err) {
      setMessage(getLoginErrorMessage(err));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#e0f2fe_45%,#fff7ed_100%)] text-slate-900">
      <Image
        src="/impage/school_logo.png"
        alt="School background image"
        fill
        priority
        className="object-contain object-center opacity-10"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_24%)]" />
      <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="absolute bottom-[-7rem] right-[-4rem] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-emerald-100 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <FaCheckCircle className="text-emerald-600 text-5xl mx-auto mb-3" />
            <h2 className="text-xl font-bold text-emerald-700">Login Successful</h2>
            <p className="text-slate-600 mt-2">Redirecting...</p>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-rose-100 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <FaTimesCircle className="text-rose-600 text-5xl mx-auto mb-3" />
            <h2 className="text-xl font-bold text-rose-700">Unable to sign in</h2>
            <p className="text-slate-600 mt-2">{message}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <section className="relative z-10 flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="max-w-2xl rounded-[2.5rem] border border-white/80 bg-white/75 p-8 shadow-[0_30px_90px_rgba(14,116,144,0.16)] backdrop-blur-xl xl:p-10">
              <div className="mb-8 flex items-center gap-5">
                <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2rem] border border-cyan-100 bg-white p-2 shadow-[0_16px_50px_rgba(14,165,233,0.20)] xl:h-40 xl:w-48">
                  <Image
                    src="/impage/shoollogo.png"
                    alt="Govt. Modal Secondary School LQP logo"
                    fill
                    className="rounded-full object-contain "
                  />
                </div>
                <div>
                  <p className="text-sm font-times uppercase tracking-[0.35em] text-cyan-700/90">
                    Welcome To
                  </p>
                  <h1 className="mt-2 bg-gradient-to-r from-slate-900 via-cyan-700 to-sky-500 bg-clip-text text-4xl font-Montserrat font-bold italic leading-tight text-transparent xl:text-5xl">
                    Govt. Modal
                    <span className="block text-sky-600">Secondary School LQP</span>
                  </h1>
                </div>
              </div>

              <p className="max-w-xl text-lg leading-8 text-slate-600 xl:text-xl">
                Empowering bright minds with discipline, knowledge, and the confidence to lead tomorrow.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.6rem] border border-cyan-100 bg-cyan-50/80 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Focused Learning</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Learn in a modern academic environment built for focus, growth, and achievement.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-amber-100 bg-amber-50/80 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Quick Access</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Connect with your school system quickly and continue your journey with clarity and purpose.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-[520px] rounded-[2rem] border border-white/90 bg-white/88 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-8 lg:ml-auto">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white text-2xl shadow-[0_16px_40px_rgba(14,165,233,0.35)]">
                <FaUserCog />
              </div>
              <div className="mb-4 lg:hidden">
                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-cyan-100 bg-white p-2 shadow-[0_12px_35px_rgba(14,165,233,0.24)]">
                  <Image
                    src="/impage/schoollogo.png"
                    alt="AL-Flaha Public Secondary School Feroza logo"
                    fill
                    className="rounded-full object-contain"
                  />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700/90">
                  Oxford Public Higher Secondary School Feroza
                </p>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Sign In</h2>
              <p className="mt-3 text-base sm:text-lg text-slate-500">Use your account credentials to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-11 py-3.5 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-11 py-3.5 pr-11 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-base sm:text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 tm-2"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="">Select Role</option>
                <option value="ADMIN">Admin</option>
                <option value="CLERK">Clerk</option>
                <option value="PRINCIPAL">Principal</option>
                <option value="TEACHERS">Teachers</option>
                <option value="STUDENTS">Students</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 py-3.5 text-base sm:text-lg font-semibold text-white shadow-[0_18px_40px_rgba(14,165,233,0.35)] hover:from-cyan-400 hover:via-sky-500 hover:to-blue-500 disabled:opacity-70"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}



