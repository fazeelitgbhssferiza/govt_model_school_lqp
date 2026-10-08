// app/users/page.jsx - UPDATED WITH ALL REQUESTS
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../authservice/api";
import { hasPermission, sanitizePermissions } from "../authservice/auth";
import { useAuth } from "../authservice/useAuth";
import NewRoleModal from "../components/users/NewRoleModal";
import RegisterUserModal from "../components/users/RegisterUserModal";
import { getPermissionLabel } from "../components/roles/permissionCatalog";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Shield,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  LayoutGrid,
  List
} from "lucide-react";


const ROLE_VISUALS = {
  ADMIN: { label: "Admin", codePrefix: "ADM", color: "from-purple-600 to-indigo-500" },
  CLERK: { label: "Clerk", codePrefix: "CLK", color: "from-blue-600 to-cyan-500" },
  PRINCIPAL: { label: "Principal", codePrefix: "PRI", color: "from-amber-500 to-orange-500" },
  TEACHERS: { label: "Teachers", codePrefix: "TCH", color: "from-emerald-600 to-green-500" },
  STUDENTS: { label: "Students", codePrefix: "STD", color: "from-rose-500 to-pink-500" },
};

const statuses = ["All Status", "active", "pending", "inactive"];

const getRoleMeta = (roleKey, overrides = {}) => {
  const normalizedRole = normalizeSelectedRoleKey(roleKey);
  const baseMeta = ROLE_VISUALS[normalizedRole] || {};

  return {
    name: normalizedRole,
    label: overrides.label || baseMeta.label || normalizedRole,
    codePrefix: overrides.codePrefix || baseMeta.codePrefix || "USR",
    permissions: sanitizePermissions(overrides.permissions),
    color: overrides.color || baseMeta.color || "from-gray-600 to-gray-500",
  };
};

const mapRoleRecord = (role) => {
  const normalizedRole = normalizeSelectedRoleKey(role?.role || role?.name || role?.value);
  return getRoleMeta(normalizedRole, {
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
  });
};

const normalizeSelectedRoleKey = (roleName) => {
  const normalized = String(roleName || "").trim().toUpperCase();
  return normalized === "CLERCK" ? "CLERK" : normalized;
};

const isProtectedAdminUser = (user) => {
  const name = String(user?.name || "").trim().toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();
  const role = String(user?.role || "").trim().toLowerCase();
  return (
    name === "admin" ||
    email === "admin" ||
    role === "admin" ||
    role === "administrator"
  );
};

const getUserTimestamp = (user) => {
  const candidates = [user?.createdAt, user?.updatedAt, user?.registrationDate, user?.lastActive, user?.id];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    const time = parsed.getTime();
    if (!Number.isNaN(time)) return time;
  }

  return 0;
};

const sortUsersNewestFirst = (items) =>
  [...items].sort((left, right) => getUserTimestamp(right) - getUserTimestamp(left));

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin, role: signedInRole, user: signedInUser, permissions } = useAuth();
  const pageSize = 10;
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(
    Object.keys(ROLE_VISUALS).map((roleKey) => getRoleMeta(roleKey))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showCreateSuccessModal, setShowCreateSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [editUserData, setEditUserData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    department: "",
    status: "active",
  });
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPasswordMismatch, setEditPasswordMismatch] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    department: "",
    status: "active",
  });
  const [newRoleData, setNewRoleData] = useState({
    name: "",
  });
  const abilities = useMemo(() => {
    const resolvedRole = normalizeSelectedRoleKey(signedInRole || signedInUser?.role);
    const hasAdminRole = isAdmin || resolvedRole === "ADMIN" || resolvedRole === "ADMINISTRATOR";

    return {
      canCreateUser: hasAdminRole || hasPermission(permissions, "USERS_CREATE"),
      canEditUser: hasAdminRole || hasPermission(permissions, "USERS_EDIT"),
      canDeleteUser: hasPermission(permissions, "USERS_DELETE"),
      canCreateRole: hasPermission(permissions, "ROLES_CREATE"),
    };
  }, [isAdmin, permissions, signedInRole, signedInUser?.role]);

  const roles = useMemo(
    () => ["All Roles", ...availableRoles.map((role) => role.name)],
    [availableRoles]
  );
  const roleLookup = useMemo(
    () =>
      Object.fromEntries(
        availableRoles.map((role) => [normalizeSelectedRoleKey(role.name), role])
      ),
    [availableRoles]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        const [response, rolesResponse] = await Promise.all([
          apiRequest("/user-management", {
            method: "GET",
            includeAuth: true,
          }),
          apiRequest("/roles", {
            method: "GET",
            includeAuth: true,
          }),
        ]);

        const apiUsers = Array.isArray(response?.users) ? response.users : [];
        const apiRoles = Array.isArray(rolesResponse)
          ? rolesResponse
          : Array.isArray(rolesResponse?.roles)
            ? rolesResponse.roles
            : [];

        const nextAvailableRoles = apiRoles
          .filter((role) => String(role?.status || "").toUpperCase() === "ACTIVE")
          .map((role) => mapRoleRecord(role));

        const nextRoleLookup = Object.fromEntries(
          nextAvailableRoles.map((role) => [normalizeSelectedRoleKey(role.name), role])
        );

        if (isMounted) {
          setAvailableRoles(
            nextAvailableRoles.length
              ? nextAvailableRoles
              : Object.keys(ROLE_VISUALS).map((roleKey) => getRoleMeta(roleKey))
          );
        }

        if (!isMounted || apiUsers.length === 0) return;

        const mappedUsers = apiUsers
          .filter((user) => {
            const name = String(user?.name || "").toLowerCase();
            const email = String(user?.email || "").toLowerCase();
            return name !== "temp admin" && email !== "admin@example.com";
          })
          .map((user, index) => {
          const normalizedStatus = String(user?.status || "active").toLowerCase();
          const safeStatus = ["active", "pending", "inactive"].includes(normalizedStatus)
            ? normalizedStatus
            : "active";

          return {
            id: user?._id || user?.id || index + 1,
            createdAt: user?.createdAt || null,
            updatedAt: user?.updatedAt || null,
            name: user?.name || "Unknown User",
            email: user?.email || "N/A",
            phone: user?.phone || "N/A",
            role: user?.role || "",
            status: safeStatus,
            lastActive: user?.lastLogin
              ? new Date(user.lastLogin).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            avatarColor: `bg-gradient-to-r ${
              getRoleMeta(String(user?.role || "").toUpperCase()).color
            }`,
            permissions: sanitizePermissions(
              Array.isArray(user?.permissions)
                ? user.permissions
                : nextRoleLookup[normalizeSelectedRoleKey(user?.role)]?.permissions || []
            ),
            registrationDate: user?.createdAt
              ? new Date(user.createdAt).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
          };
        });

        setUsers(sortUsersNewestFirst(mappedUsers));
      } catch (error) {
        console.error("Failed to fetch users from /user-management:", error?.message || error);
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter users
  const filteredUsers = useMemo(
    () =>
      sortUsersNewestFirst(
        users.filter((user) => {
          const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm);

          const matchesRole = selectedRole === "All Roles" || user.role === selectedRole;
          const matchesStatus = selectedStatus === "All Status" || user.status === selectedStatus;

          return matchesSearch && matchesRole && matchesStatus;
        })
      ),
    [users, searchTerm, selectedRole, selectedStatus]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / pageSize)),
    [filteredUsers.length]
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, pageSize, safeCurrentPage]);

  // Update user role
  const updateUserRole = (userId, newRole) => {
    if (!abilities.canEditUser) {
      alert("You do not have permission to update user roles.");
      return;
    }

    const targetUser = users.find((user) => user.id === userId) || null;
    if (isProtectedAdminUser(targetUser)) {
      alert("Admin role cannot be changed.");
      return;
    }

    const roleData =
      roleLookup[normalizeSelectedRoleKey(newRole)] ||
      getRoleMeta(String(newRole || "").toUpperCase());
    setUsers(users.map(user => 
      user.id === userId 
        ? { 
            ...user, 
            role: newRole,
            avatarColor: `bg-gradient-to-r ${roleData?.color || 'from-gray-600 to-gray-500'}`,
            permissions: roleData?.permissions || []
          } 
        : user
    ));
  };

  // Handle registration
  const handleRegisterUser = (createdUser) => {
    if (!abilities.canCreateUser) {
      alert("You do not have permission to register users.");
      return;
    }

    if (!createdUser) return;

    const roleData =
      roleLookup[normalizeSelectedRoleKey(createdUser.role)] ||
      getRoleMeta(String(createdUser.role || "").toUpperCase());

    const newUser = {
      id: createdUser.id || users.length + 1,
      name: createdUser.name || "Unknown User",
      email: createdUser.email || "N/A",
      phone: createdUser.phone || "To be added",
      role: createdUser.role || "",
      department: createdUser.department || "N/A",
      status: String(createdUser.status || "active").toLowerCase(),
      lastActive: new Date().toISOString().split("T")[0],
      avatarColor: `bg-gradient-to-r ${roleData.color}`,
      permissions: sanitizePermissions(createdUser.permissions || roleData.permissions || []),
      registrationDate: createdUser.createdAt
        ? new Date(createdUser.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    };

    setUsers((prevUsers) => sortUsersNewestFirst([newUser, ...prevUsers]));
    setShowCreateSuccessModal(true);
  };

  // Handle create new role
  const handleCreateRole = async (e) => {
    if (!abilities.canCreateRole) {
      alert("You do not have permission to create roles.");
      return;
    }

    e.preventDefault();
    
    const { name } = newRoleData;
    
    if (!name) {
      alert("Please select a role.");
      return;
    }

    const normalizedRole = normalizeSelectedRoleKey(name);
    setShowNewRoleModal(false);
    setNewRoleData({ name: "" });
    router.push(`/AdminDashboard/roles/add?role=${encodeURIComponent(normalizedRole)}`);
  };

  const handleDeleteUser = (userId) => {
    if (!abilities.canDeleteUser) {
      alert("You do not have permission to delete users.");
      return;
    }

    const user = users.find((u) => u.id === userId) || null;
    if (isProtectedAdminUser(user)) {
      alert("Admin user cannot be deleted.");
      return;
    }
    setDeleteCandidate(user);
    setShowDeleteConfirmModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      inactive: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    };
    
    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      pending: <Calendar className="w-3 h-3" />,
      inactive: <XCircle className="w-3 h-3" />
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleData =
      roleLookup[normalizeSelectedRoleKey(role)] ||
      getRoleMeta(normalizeSelectedRoleKey(role));
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${roleData?.color || 'from-gray-600 to-gray-500'} text-white`}>
        {role}
      </span>
    );
  };


  const openUserDetails = (user) => {
    setActiveUser(user);
    setShowUserDetailsModal(true);
    setSelectedUser(null);
  };

  const openEditUser = (user) => {
    setActiveUser(user);
    setEditUserData({
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      phone: user?.phone || "",
      role: user?.role || "",
      department: user?.department || "",
      status: user?.status || "active",
    });
    setEditConfirmPassword("");
    setEditPasswordMismatch(false);
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
    setShowEditUserModal(true);
    setSelectedUser(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!abilities.canEditUser || !activeUser?.id) {
      alert("You do not have permission to edit users.");
      return;
    }
    if (!String(editUserData.role || "").trim()) {
      alert("Please select a role.");
      return;
    }
    if (editUserData.password !== editConfirmPassword) {
      setEditPasswordMismatch(true);
      return;
    }

    const normalizedStatus =
      String(editUserData.status || "").toLowerCase() === "inactive"
        ? "Inactive"
        : String(editUserData.status || "").toLowerCase() === "pending"
          ? "Pending"
          : "Active";

    try {
      const response = await apiRequest(`/user-management/updateUser/${activeUser.id}`, {
        method: "PUT",
        includeAuth: true,
        data: {
          name: editUserData.name,
          email: editUserData.email,
          password: editUserData.password,
          phone: editUserData.phone,
          role: editUserData.role,
          department: editUserData.department,
          status: normalizedStatus,
        },
      });

      const updatedUser = response?.user || response?.data || {};
      const resolvedRole = normalizeSelectedRoleKey(updatedUser.role || editUserData.role);
      const resolvedRoleMeta = roleLookup[resolvedRole] || getRoleMeta(resolvedRole);
      setUsers((prev) =>
        sortUsersNewestFirst(
          prev.map((user) =>
            user.id === activeUser.id
              ? {
                  ...user,
                  createdAt: updatedUser.createdAt || user.createdAt,
                  updatedAt: updatedUser.updatedAt || user.updatedAt,
                  name: updatedUser.name || editUserData.name,
                  email: updatedUser.email || editUserData.email,
                  phone: updatedUser.phone || editUserData.phone,
                  role: updatedUser.role || editUserData.role,
                  department: updatedUser.department || editUserData.department,
                  status: String(updatedUser.status || normalizedStatus).toLowerCase(),
                  avatarColor: `bg-gradient-to-r ${resolvedRoleMeta.color}`,
                  permissions: sanitizePermissions(
                    Array.isArray(updatedUser.permissions)
                      ? updatedUser.permissions
                      : resolvedRoleMeta.permissions
                  ),
                }
              : user
          )
        )
      );

      setShowEditUserModal(false);
      setActiveUser(null);
      setShowEditSuccessModal(true);
    } catch (error) {
      console.error("Update User Error:", error);
      alert(error.message || "Failed to update user");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_top,_#eef2ff,_#ffffff_45%,_#ecfeff_100%)] dark:bg-[radial-gradient(1200px_circle_at_top,_#0b1324,_#0f172a_45%,_#0b1220_100%)] p-2 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Mobile Spacer - Fixed header issue */}
        <div className="h-16 md:h-0" />

      {/* Header */}
      <div className="mb-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-slate-900 to-indigo-700 rounded-2xl shadow-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                User Management
              </h1>              
            </div>
          </div>
          
          {/* Action Buttons - Stacked vertically on mobile */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowNewRoleModal(true)}
              disabled={!abilities.canCreateRole}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>New Role</span>
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              disabled={!abilities.canCreateUser}
              className="bg-gradient-to-r from-slate-900 to-indigo-700 hover:from-slate-900 hover:to-indigo-800 text-white font-medium px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              <UserPlus className="w-5 h-5" />
              <span>Register User</span>
            </button>
          </div>
        </div>

      </div>

      {/* Stats Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_16px_45px_-32px_rgba(15,23,42,0.4)] backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/60 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Users", value: users.length, gradient: "from-cyan-500 via-blue-500 to-indigo-500" },
          { label: "Active Users", value: users.filter(u => u.status === 'active').length, gradient: "from-emerald-500 via-green-500 to-blue-500" },
          {
            label: "Admin Roles",
            value: users.filter((u) => String(u.role || "").toLowerCase() === "administrator" || String(u.role || "").toLowerCase() === "admin").length,
            gradient: "from-amber-500 via-orange-500 to-rose-500"
          },
          {
            label: "Last Login Customer",
            value: users.filter(
              (u) => u.lastActive === new Date().toISOString().split("T")[0]
            ).length,
            gradient: "from-fuchsia-500 via-purple-500 to-indigo-500",
          },
        ].map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-5 border border-white/30 shadow-lg shadow-black/15 hover:shadow-xl hover:shadow-black/25 transition-all duration-300`}>
            <p className="text-sm text-white/90">{stat.label}</p>
            <p className="text-2xl font-semibold mt-1 text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="mb-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_16px_45px_-32px_rgba(15,23,42,0.4)] backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, email, phone, or secret code..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border border-slate-200 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center bg-white/90 dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => {
                setViewMode("grid");
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-slate-900 to-indigo-700 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => {
                setViewMode("list");
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                viewMode === "list"
                  ? "bg-gradient-to-r from-slate-900 to-indigo-700 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-white/90 dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Filter by Role
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setCurrentPage(1);
                    }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedRole === role
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Filter by Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setCurrentPage(1);
                    }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedStatus === status
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                        : 'bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Roles Summary */}

      {/* Users Grid/List */}
      <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-[0_16px_45px_-32px_rgba(15,23,42,0.4)] backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
      {filteredUsers.length > 0 ? (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white/90 dark:bg-gray-800 rounded-2xl border border-slate-200/70 dark:border-gray-700 overflow-hidden hover:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.5)] transition-shadow duration-300"
                >
                  <div className="p-6 border-b border-slate-200/70 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className={`w-14 h-14 ${user.avatarColor} rounded-2xl flex items-center justify-center text-white text-xl font-bold`}>
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {getStatusBadge(user.status)}
                            {getRoleBadge(user.role)}
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>

                        {selectedUser?.id === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-xl z-10">
                            <button
                              onClick={() => openUserDetails(user)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => openEditUser(user)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit User
                            </button>
                            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-slate-200 dark:border-gray-700">
                              <div className="font-semibold text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                Last Login
                              </div>
                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                {user.lastActive}
                              </div>
                            </div>
                            {!isProtectedAdminUser(user) && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={!abilities.canDeleteUser}
                                className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="truncate text-sm">{user.email}</span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span className="truncate text-sm">{user.phone}</span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          disabled={!abilities.canEditUser || isProtectedAdminUser(user)}
                          className="flex-1 text-sm bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition text-gray-900 dark:text-white"
                        >
                          {availableRoles.map((role) => (
                            <option key={role.name} value={role.name}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-emerald-500 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.map((perm, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-full text-xs"
                            >
                              {getPermissionLabel(perm)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200/70 dark:border-gray-700 grid grid-cols-2 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="block">Registered:</span>
                          <span className="font-medium">{user.registrationDate}</span>
                        </div>
                        <div>
                          <span className="block">Last Active:</span>
                          <span className="font-medium">{user.lastActive}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white/90 dark:bg-gray-800 rounded-2xl border border-slate-200/70 dark:border-gray-700 p-5 hover:shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] transition-shadow"
                >
                  <div>
                    <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(140px,0.9fr)_minmax(150px,1fr)] items-center gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`w-11 h-11 ${user.avatarColor} rounded-2xl flex items-center justify-center text-white font-bold`}>
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.phone}</p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-center gap-1.5">
                      {getStatusBadge(user.status)}
                      {getRoleBadge(user.role)}
                    </div>

                    <div className="min-w-0">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        disabled={!abilities.canEditUser || isProtectedAdminUser(user)}
                        className="w-full text-sm bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition text-gray-900 dark:text-white"
                      >
                        {availableRoles.map((role) => (
                          <option key={role.name} value={role.name}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                      <div className="flex min-w-0 items-center justify-end gap-2">
                      <div className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <div className="font-semibold text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          Last Login
                        </div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {user.lastActive}
                        </div>
                      </div>
                        <button
                          onClick={() => openEditUser(user)}
                          disabled={!abilities.canEditUser}
                          className={`px-2.5 py-2 text-sm rounded-xl border ${
                            abilities.canEditUser
                              ? "text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 border-slate-200 dark:border-gray-600"
                              : "text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed"
                        }`}
                      >
                        Edit
                      </button>
                      {!isProtectedAdminUser(user) && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={!abilities.canDeleteUser}
                          className="px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-red-900/20 rounded-xl border border-rose-200 dark:border-red-900/40"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {viewMode === "list" && (
            <div className="mt-6 flex flex-col gap-2 border-t border-slate-200/70 px-1 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Showing {(safeCurrentPage - 1) * pageSize + 1} to{" "}
                {Math.min(safeCurrentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Prev
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-gray-400">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white/90 dark:bg-gray-800 rounded-2xl border border-slate-200/70 dark:border-gray-700">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No users found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchTerm || selectedRole !== "All Roles" || selectedStatus !== "All Status"
              ? "Try adjusting your search or filters to find users"
              : "Register new users using 4-digit secret codes"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowNewRoleModal(true)}
              disabled={!abilities.canCreateRole}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition"
            >
              <Plus className="w-5 h-5" />
              Create New Role
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              disabled={!abilities.canCreateUser}
              className="bg-gradient-to-r from-slate-900 to-indigo-700 hover:from-slate-900 hover:to-indigo-800 text-white font-medium px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition"
            >
              <UserPlus className="w-5 h-5" />
              Register User
            </button>
          </div>
        </div>
      )}
      </div>

        <RegisterUserModal
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          onSubmit={handleRegisterUser}
          registerData={registerData}
          setRegisterData={setRegisterData}
          rolesData={availableRoles}
          canCreateUser={abilities.canCreateUser}
        />

        <NewRoleModal
          isOpen={showNewRoleModal}
          onClose={() => setShowNewRoleModal(false)}
          onSubmit={handleCreateRole}
          newRoleData={newRoleData}
          setNewRoleData={setNewRoleData}
        />

        {showUserDetailsModal && activeUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:bg-gray-800 border border-slate-200/70 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Details</h2>
                <button
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    setActiveUser(null);
                  }}
                  className="rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.name}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.email}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.phone}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.role}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.status}</p>
                </div>
                <div className="rounded-xl border border-slate-200/70 dark:border-gray-700 p-3 sm:col-span-2">
                  <p className="text-xs text-gray-500">Last Active</p>
                  <p className="font-medium text-gray-900 dark:text-white">{activeUser.lastActive}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    setActiveUser(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditUserModal && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:bg-gray-900/70 border border-white/70 dark:border-gray-700/60 backdrop-blur">
              <div className="flex items-center justify-between mb-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-700 p-4 text-white">
                <div>
                  <h2 className="text-xl font-semibold">Edit User</h2>
                  <p className="text-sm text-white/90">Update user profile and access details.</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditUserModal(false);
                    setActiveUser(null);
                  }}
                  className="text-white/90 hover:text-white rounded-full p-2 hover:bg-white/10"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editUserData.name}
                    onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                    placeholder="User Name"
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                    placeholder="example@example.com"
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editUserData.password}
                    onChange={(e) => {
                      setEditUserData({ ...editUserData, password: e.target.value });
                      setEditPasswordMismatch(false);
                    }}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={`${showEditPassword ? "Hide" : "Show"} password`}
                  >
                    {showEditPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                  <input
                    type={showEditConfirmPassword ? "text" : "password"}
                    value={editConfirmPassword}
                    onChange={(e) => {
                      setEditConfirmPassword(e.target.value);
                      setEditPasswordMismatch(false);
                    }}
                    placeholder="Confirm password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditConfirmPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={`${showEditConfirmPassword ? "Hide" : "Show"} confirm password`}
                  >
                    {showEditConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  </div>
                  {editPasswordMismatch && (
                    <p className="mt-2 text-sm text-red-600">Passwords are mismatched.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editUserData.phone}
                    onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                    placeholder="0311-1234567"
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select
                    value={editUserData.role}
                    onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  >
                    <option value="">Select Role</option>
                    {availableRoles.map((role) => (
                      <option key={role.name} value={role.name}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
                  <select
                    value={editUserData.department}
                    onChange={(e) => setEditUserData({ ...editUserData, department: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Administration">Administration</option>
                    <option value="Management">Management</option>
                    <option value="Teaching">Teaching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                  <select
                    value={editUserData.status}
                    onChange={(e) => setEditUserData({ ...editUserData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300/80 dark:border-gray-600 rounded-2xl bg-white/90 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setActiveUser(null);
                    }}
                    className="px-5 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!abilities.canEditUser}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-500 text-white font-semibold hover:from-emerald-600 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:bg-gray-800 border border-slate-200/70 dark:border-gray-700 text-center">
              <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                User updated successfully
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowEditSuccessModal(false)}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-500 px-6 py-2 font-medium text-white hover:from-emerald-600 hover:to-blue-600"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:bg-gray-800 border border-slate-200/70 dark:border-gray-700 text-center">
              <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                User added successfully
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowCreateSuccessModal(false)}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-500 px-6 py-2 font-medium text-white hover:from-emerald-600 hover:to-blue-600"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] dark:bg-gray-800 border border-slate-200/70 dark:border-gray-700">
              <p className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                Are you sure want to delete {deleteCandidate?.name || "this user"}?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (deleteCandidate?.id != null) {
                      setUsers((prev) => prev.filter((user) => user.id !== deleteCandidate.id));
                    }
                    setShowDeleteConfirmModal(false);
                    setDeleteCandidate(null);
                  }}
                  className="rounded-xl bg-rose-600 px-6 py-2 font-medium text-white hover:bg-rose-700"
                >
                  Yes
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setDeleteCandidate(null);
                  }}
                  className="rounded-xl border border-slate-200 dark:border-gray-700 px-6 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700"
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
