"use client";

import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../authservice/api";
import { MIN_PASSWORD_LENGTH } from "../../authservice/auth";

const REGISTER_ROLE_LABELS = {
  ADMIN: "Admin",
  PRINCIPAL: "Principal",
  CLERK: "Clerck",
  TEACHERS: "Teachers",
  STUDENTS: "Students",
};

const DEFAULT_REGISTER_ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "CLERK", label: "Clerck" },
  { value: "TEACHERS", label: "Teachers" },
  { value: "STUDENTS", label: "Students" },
];

export default function RegisterUserModal({
  isOpen,
  onClose,
  onSubmit,
  registerData,
  setRegisterData,
  rolesData = [],
  canCreateUser = true,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const phonePattern = /^03\d{2}-\d{7}$/;
  const registerRoleOptions = rolesData.length
    ? rolesData.map((role) => ({
        label: REGISTER_ROLE_LABELS[String(role.name || "").toUpperCase()] || role.label || role.name,
        value: role.value || role.name,
      }))
    : DEFAULT_REGISTER_ROLE_OPTIONS;

  const formatPhoneNumber = (value) => {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateUser) {
      alert("You do not have permission to create users.");
      return;
    }

    const { name, email, password, phone, role, department, status } = registerData;

    if (!name || !email || !password || !role || !department || !status) {
      alert("Please fill all required fields");
      return;
    }
    if (String(password).trim().length < MIN_PASSWORD_LENGTH) {
      alert(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (phone && !phonePattern.test(phone)) {
      alert("Phone number must be in 0300-1234567 format.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    try {
      setIsSubmitting(true);

      const normalizedStatus =
        String(status).toLowerCase() === "inactive" ? "Inactive" : "Active";
      const normalizedRole = String(role || "").trim().toUpperCase();

      const response = await apiRequest("/user-management/createUser", {
        method: "POST",
        includeAuth: true,
        data: {
          name,
          email,
          password,
          phone,
          role: normalizedRole,
          department,
          status: normalizedStatus,
        },
      });

      const createdUser = response?.data || {};
      if (typeof onSubmit === "function") {
        onSubmit({
          id: createdUser.id,
          name: createdUser.name || name,
          email: createdUser.email || email,
          phone: phone || "To be added",
          role: createdUser.role || normalizedRole,
          department,
          status: String(createdUser.status || normalizedStatus).toLowerCase(),
          createdAt: createdUser.createdAt,
        });
      }

      setRegisterData({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "",
        department: "",
        status: "active",
      });
      setConfirmPassword("");
      setPasswordMismatch(false);
      onClose();
    } catch (error) {
      alert(error?.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/90 dark:bg-gray-900/70 rounded-3xl shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/70 dark:border-gray-700/60 backdrop-blur">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-700 p-6 sm:p-8 flex items-center justify-between rounded-t-3xl">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white  ">New User Register</h1>
              <p className="text-sm text-white/90 mt-1">Create a user account with role and access details.</p>
            </div>
            <button onClick={onClose} className="text-white/90 hover:text-white rounded-full p-2 hover:bg-white/10 transition">
              <X size={28} />
            </button>
          </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: "Name *",
                value: registerData.name,
                onChange: (e) => setRegisterData({ ...registerData, name: e.target.value }),
                placeholder: "User Name",
                type: "text",
              },
              {
                label: "Email *",
                value: registerData.email,
                onChange: (e) => setRegisterData({ ...registerData, email: e.target.value }),
                placeholder: "example@example.com",
                type: "email",
              },
              {
                label: "Password *",
                value: registerData.password,
                onChange: (e) => setRegisterData({ ...registerData, password: e.target.value }),
                placeholder: "Enter password",
                type: "password",
                isPassword: true,
              },
              {
                label: "Confirm Password *",
                value: confirmPassword,
                onChange: (e) => setConfirmPassword(e.target.value),
                placeholder: "Confirm password",
                type: "password",
                isConfirm: true,
                isPassword: true,
              },
              {
                label: "Phone",
                value: registerData.phone,
                onChange: (e) => setRegisterData({ ...registerData, phone: e.target.value }),
                placeholder: "0311-1234567",
                type: "tel",
              },
              {
                label: "Role *",
                value: registerData.role,
                onChange: (e) => setRegisterData({ ...registerData, role: e.target.value }),
                type: "select",
                options: registerRoleOptions,
              },
              {
                label: "Department *",
                value: registerData.department,
                onChange: (e) => setRegisterData({ ...registerData, department: e.target.value }),
                type: "select",
                options: [
                  { label: "Administration", value: "Administration" },
                  { label: "Management", value: "Management" },
                  { label: "Teaching", value: "Teaching" },
                ],
              },
              {
                label: "Status *",
                value: registerData.status,
                onChange: (e) => setRegisterData({ ...registerData, status: e.target.value }),
                type: "select",
                options: [
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ],
              },
            ].map((field, idx) => (
              <div key={idx}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full px-4 py-3 border border-slate-200/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
                    required={field.label.includes("*")}
                  >
                    <option value="">Select {field.label.replace(" *", "")}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="relative">
                    <input
                      type={field.isPassword && (field.isConfirm ? showConfirmPassword : showPassword) ? "text" : field.type}
                      value={field.value}
                      onChange={(e) => {
                        if (field.label === "Phone") {
                          const formattedValue = formatPhoneNumber(e.target.value);
                          field.onChange({ ...e, target: { ...e.target, value: formattedValue } });
                        } else {
                          field.onChange(e);
                        }
                        setPasswordMismatch(false);
                      }}
                      placeholder={field.placeholder}
                      className={`w-full px-4 py-3 border border-slate-200/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition ${field.isPassword ? "pr-12" : ""}`}
                      required={field.label.includes("*")}
                      pattern={field.label === "Phone" ? "03[0-9]{2}-[0-9]{7}" : undefined}
                      inputMode={field.label === "Phone" ? "numeric" : undefined}
                      maxLength={field.label === "Phone" ? 12 : undefined}
                    />
                    {field.isPassword && (
                      <button
                        type="button"
                        onClick={() => field.isConfirm
                          ? setShowConfirmPassword((visible) => !visible)
                          : setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={`${(field.isConfirm ? showConfirmPassword : showPassword) ? "Hide" : "Show"} password`}
                      >
                        {(field.isConfirm ? showConfirmPassword : showPassword)
                          ? <EyeOff className="h-5 w-5" />
                          : <Eye className="h-5 w-5" />}
                      </button>
                    )}
                    </div>
                    {field.isConfirm && passwordMismatch && (
                      <p className="mt-2 text-sm text-red-600">Passwords are mismatched.</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition font-semibold order-2 sm:order-1 shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canCreateUser}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-2xl font-semibold transition order-1 sm:order-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? "Registering..." : "Register User"}
            </button>
          </div>
        </form>
        </div>
      </div>

    </>
  );
}
