
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  CheckCircle2
} from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
};

type FilterType = "ALL" | "USER" | "ADMIN";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<FilterType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [openFilterMenu, setOpenFilterMenu] = useState<"role" | "status" | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<{
  user: AdminUser;
  changes: { role?: "USER" | "ADMIN"; isActive?: boolean };
  actionText: string;
} | null>(null);

const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    function handleOutsideInteraction(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const insideRole = roleMenuRef.current?.contains(target);
      const insideStatus = statusMenuRef.current?.contains(target);

      if (!insideRole && !insideStatus) {
        setOpenFilterMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenFilterMenu(null);
    }

    document.addEventListener("pointerdown", handleOutsideInteraction);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [meResponse, usersResponse] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);

      const meData = await meResponse.json();
      const usersData = await usersResponse.json();

      if (!meResponse.ok || meData?.data?.role !== "ADMIN") {
        window.location.href = "/account";
        return;
      }

      if (!usersResponse.ok || !usersData.success) {
        throw new Error(usersData.message || "Failed to load users.");
      }

      setCurrentAdminId(meData.data.id);
      setUsers(usersData.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchMatch =
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());

      const roleMatch =
        roleFilter === "ALL" || user.role === roleFilter;

      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

      return searchMatch && roleMatch && statusMatch;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    inactive: users.filter((user) => !user.isActive).length,
    admins: users.filter((user) => user.role === "ADMIN").length,
  }), [users]);

  const updateUser = (
  user: AdminUser,
  changes: { role?: "USER" | "ADMIN"; isActive?: boolean }
) => {
  const actionText = changes.role
    ? changes.role === "ADMIN"
      ? "promote this user to Admin"
      : "demote this user to User"
    : changes.isActive
      ? "activate this account"
      : "deactivate this account";

  setPendingUpdate({ user, changes, actionText });
  setShowConfirmModal(true);
};

const confirmUpdate = async () => {
  if (!pendingUpdate) return;

  const { user, changes } = pendingUpdate;

  try {
    setUpdatingId(user.id);
    setError("");
    setShowConfirmModal(false);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        ...changes,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to update user.");
    }

    setPendingUpdate(null);
    toast.success(data.message || "User updated successfully.");

    await fetchUsers();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    setError(message);
    toast.error(message);
  } finally {
    setUpdatingId(null);
  }
};

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-100 bg-white shadow-sm">
          <Loader2 className="animate-spin text-indigo-600" size={26} />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading user accounts…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-slate-50 to-slate-100 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">

        {showConfirmModal && pendingUpdate && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
    onClick={() => {
      setShowConfirmModal(false);
      setPendingUpdate(null);
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-user-action-title"
      onClick={(event) => event.stopPropagation()}
      className="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white p-6 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] sm:p-7"
    >

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <ShieldCheck size={28} />
      </div>

      <h2 id="confirm-user-action-title" className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
        Confirm Action
      </h2>

      <p className="mt-3 text-center text-sm leading-6 text-slate-500">
        Are you sure you want to{" "}
        <span className="font-semibold text-slate-800">
          {pendingUpdate.actionText}
        </span>
        ?
      </p>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="font-semibold text-slate-800">
          {pendingUpdate.user.name}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {pendingUpdate.user.email}
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => {
            setShowConfirmModal(false);
            setPendingUpdate(null);
          }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void confirmUpdate()}
          className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updatingId ? "Saving…" : "Confirm"}
        </button>
      </div>

    </div>
  </div>
)}


      <div className="mx-auto max-w-7xl space-y-7">
        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to Account
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Users size={25} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  User Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage customer accounts, roles and account status.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void fetchUsers()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200/80 bg-white p-4 text-sm text-red-700 shadow-sm">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <section className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: stats.total, icon: Users },
            { label: "Active Users", value: stats.active, icon: UserCheck },
            { label: "Inactive Users", value: stats.inactive, icon: UserX },
            { label: "Administrators", value: stats.admins, icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.22)] transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_16px_35px_-20px_rgba(79,70,229,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {item.label}
                  </p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white"><Icon size={19} /></span>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
                  {item.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              All Users
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
              <div className="relative col-span-2 min-w-0 sm:col-span-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100/70"
                />
              </div>

              <div ref={roleMenuRef} className="relative" data-dropdown-root>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openFilterMenu === "role"}
                  onClick={() =>
                    setOpenFilterMenu((current) => current === "role" ? null : "role")
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm transition-all duration-200 ${
                    openFilterMenu === "role"
                      ? "border-indigo-400 ring-4 ring-indigo-100/70"
                      : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Shield size={15} />
                    </span>
                    <span className="truncate text-slate-700">
                      {roleFilter === "ALL" ? "All Roles" : roleFilter === "USER" ? "Customers" : "Administrators"}
                    </span>
                  </span>
                  <ChevronDown
                    size={17}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      openFilterMenu === "role" ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>

                {openFilterMenu === "role" && (
                  <div
                    role="listbox"
                    aria-label="Filter users by role"
                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.03] animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Filter by role
                    </p>
                    {[
                      { label: "All Roles", value: "ALL" as FilterType, hint: "Show every account" },
                      { label: "Customers", value: "USER" as FilterType, hint: "Standard user accounts" },
                      { label: "Administrators", value: "ADMIN" as FilterType, hint: "Admin access accounts" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={roleFilter === option.value}
                        onClick={() => {
                          setRoleFilter(option.value);
                          setOpenFilterMenu(null);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          roleFilter === option.value
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold">{option.label}</span>
                          <span className={`mt-0.5 block text-[10px] ${
                            roleFilter === option.value ? "text-indigo-500" : "text-slate-400"
                          }`}>{option.hint}</span>
                        </span>
                        {roleFilter === option.value && (
                          <CheckCircle2 size={16} className="shrink-0 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={statusMenuRef} className="relative" data-dropdown-root>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openFilterMenu === "status"}
                  onClick={() =>
                    setOpenFilterMenu((current) => current === "status" ? null : "status")
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold shadow-sm transition-all duration-200 ${
                    openFilterMenu === "status"
                      ? "border-indigo-400 ring-4 ring-indigo-100/70"
                      : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <UserCheck size={15} />
                    </span>
                    <span className="truncate text-slate-700">
                      {statusFilter === "ALL" ? "All Status" : statusFilter === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </span>
                  <ChevronDown
                    size={17}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                      openFilterMenu === "status" ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>

                {openFilterMenu === "status" && (
                  <div
                    role="listbox"
                    aria-label="Filter users by account status"
                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.03] animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Filter by status
                    </p>
                    {[
                      { label: "All Status", value: "ALL" as StatusFilter, dot: "bg-indigo-500" },
                      { label: "Active", value: "ACTIVE" as StatusFilter, dot: "bg-emerald-500" },
                      { label: "Inactive", value: "INACTIVE" as StatusFilter, dot: "bg-rose-500" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={statusFilter === option.value}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setOpenFilterMenu(null);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          statusFilter === option.value
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                          <span className="text-xs font-semibold">{option.label}</span>
                        </span>
                        {statusFilter === option.value && (
                          <CheckCircle2 size={16} className="shrink-0 text-indigo-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Users size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No users found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Joined</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentAdminId;
                    const isUpdating = updatingId === user.id;

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-indigo-50/35">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {user.name}
                            {isSelf && (
                              <span className="ml-2 text-xs font-medium text-indigo-600">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.email}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === "ADMIN"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            <Shield size={13} />
                            {user.role}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {!isSelf && (
                              <>
                                <button
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void updateUser(user, {
                                      role: user.role === "ADMIN" ? "USER" : "ADMIN",
                                    })
                                  }
                                  className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isUpdating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : user.role === "ADMIN" ? (
                                    "Make User"
                                  ) : (
                                    "Make Admin"
                                  )}
                                </button>

                                <button
                                  disabled={isUpdating}
                                  onClick={() =>
                                    void updateUser(user, {
                                      isActive: !user.isActive,
                                    })
                                  }
                                  className={`rounded-lg border bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    user.isActive
                                      ? "border-red-200 text-red-600 hover:bg-red-50"
                                      : "border-green-200 text-green-700 hover:bg-green-50"
                                  }`}
                                >
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </button>
                              </>
                            )}

                            {isSelf && (
                              <span className="text-xs text-slate-400">
                                Protected account
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs text-slate-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </section>
      </div>
    </main>
  );
}
