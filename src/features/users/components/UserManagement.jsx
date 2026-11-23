"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useDashboardUsers } from "@/features/users/queries/user.queries";
import { useUpdateDashboardUserRole } from "@/features/users/mutations/user.mutations";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const roles = [
  { value: "user", label: "User" },
  { value: "author", label: "Author" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Administrator" },
];

const roleStyles = {
  user: "bg-slate-100 text-slate-700",
  author: "bg-blue-50 text-blue-700",
  editor: "bg-violet-50 text-violet-700",
  admin: "bg-[#f5f1e9] text-[#876638]",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function formatLastSignIn(value) {
  if (!value) return "Never signed in";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(name, email) {
  const value = name?.trim() || email?.trim() || "U";

  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function RoleLabel({ role }) {
  const label = roles.find((item) => item.value === role)?.label || role;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${roleStyles[role] || roleStyles.user}`}
    >
      {label}
    </span>
  );
}

function UserSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-[#e8e9ed]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="h-10 w-10 rounded-full bg-gray-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-36 rounded bg-gray-200" />
            <div className="h-3 w-52 max-w-full rounded bg-gray-100" />
          </div>
          <div className="hidden h-6 w-20 rounded-full bg-gray-100 sm:block" />
        </div>
      ))}
    </div>
  );
}

function UserEmptyState({ hasFilters }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f8fa] text-[#98743d]">
        <Users size={23} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-[#172033]">
        {hasFilters ? "No matching accounts" : "No registered users yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? "Try another search term or change the selected role."
          : "Newly registered accounts will appear here when users join TrendPilot."}
      </p>
    </div>
  );
}

function RoleChangeDialog({
  user,
  role,
  onRoleChange,
  onClose,
  onConfirm,
  isPending,
  error,
}) {
  if (!user) return null;

  const isUnchanged = role === user.role;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101d30]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-role-dialog-title"
        className="my-auto w-full max-w-md rounded-sm bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e8e9ed] px-6 py-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Account permissions
            </p>

            <h2
              id="user-role-dialog-title"
              className="mt-2 text-xl font-bold text-[#14243d]"
            >
              Change user role
            </h2>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Update this account&apos;s access level within TrendPilot.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close dialog"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#14243d] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="flex items-center gap-3 rounded-lg border border-[#e8e9ed] bg-[#fafbfc] p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0e9dc] text-sm font-bold text-[#876638]">
              {getInitials(user.displayName, user.email)}
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#172033]">
                {user.displayName || "Unnamed account"}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          <div>
            <label
              htmlFor="user-new-role"
              className="text-xs font-semibold text-[#344054]"
            >
              New account role
            </label>

            <select
              id="user-new-role"
              value={role}
              disabled={isPending}
              onChange={(event) => onRoleChange(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[#dfe2e8] bg-white px-3.5 py-3 text-sm text-[#172033] transition outline-none focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10 disabled:bg-gray-50"
            >
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 rounded-md border border-[#eee7d9] bg-[#fbf8f2] p-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#98743d]" />
            <p className="text-xs leading-5 text-[#6d5b3e]">
              Administrator access grants extensive control over the CMS.
              Changes are protected by server-side authorization. You cannot
              change your own role or demote the last administrator.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e8e9ed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-[#dfe2e8] px-5 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending || isUnchanged}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <LoaderCircle size={15} className="animate-spin" />}
              Confirm role change
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function UserManagement({ currentUserId }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [actionError, setActionError] = useState("");

  const filters = useMemo(
    () => ({
      limit: PAGE_SIZE,
      search: search || undefined,
      role: roleFilter || undefined,
    }),
    [search, roleFilter],
  );

  const usersQuery = useDashboardUsers(filters);
  const updateRole = useUpdateDashboardUserRole();

  const users =
    usersQuery.data?.pages.flatMap((page) => page.items ?? []) ?? [];

  const hasFilters = Boolean(search || roleFilter);

  function applySearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("");
  }

  function openRoleDialog(user) {
    if (user.id === currentUserId) return;

    setActionError("");
    setSelectedUser(user);
    setSelectedRole(user.role);
  }

  function closeRoleDialog() {
    if (updateRole.isPending) return;

    setSelectedUser(null);
    setSelectedRole("");
    setActionError("");
  }

  async function confirmRoleChange() {
    if (!selectedUser || selectedUser.id === currentUserId) return;
    if (!roles.some((item) => item.value === selectedRole)) return;
    if (selectedRole === selectedUser.role) return;

    setActionError("");

    try {
      await updateRole.mutateAsync({
        userId: selectedUser.id,
        role: selectedRole,
      });

      setSelectedUser(null);
      setSelectedRole("");
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  if (usersQuery.isPending) {
    return (
      <div className="container-main py-10">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-6 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white">
          <UserSkeleton />
        </div>
      </div>
    );
  }

  if (usersQuery.isError) {
    return (
      <div className="container-main py-10">
        <div className="rounded-xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertCircle size={17} />
            We could not load the user directory.
          </div>

          <p className="mt-2 text-sm text-red-700">
            {getErrorMessage(usersQuery.error)}
          </p>

          <button
            type="button"
            onClick={() => usersQuery.refetch()}
            className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
            Administration workspace
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
            User management
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            View registered accounts, check verification activity and manage
            access roles across TrendPilot.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users size={17} className="text-[#98743d]" />
          Account directory
        </div>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">
                Registered accounts
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Search accounts and manage their CMS permissions.
              </p>
            </div>

            <form
              onSubmit={applySearch}
              className="flex flex-col gap-3 lg:flex-row"
            >
              <label className="relative block flex-1">
                <span className="sr-only">Search users</span>
                <Search
                  size={17}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={100}
                  placeholder="Search by name or email..."
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white pr-3 pl-10 text-sm transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
                />
              </label>

              <label className="block lg:min-w-[210px]">
                <span className="sr-only">Filter users by role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white px-3 text-sm text-[#26354a] outline-none focus:border-[#b99658]"
                >
                  <option value="">All account roles</option>
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 text-sm font-semibold text-white transition hover:bg-[#203653]"
              >
                <Search size={15} />
                Search
              </button>
            </form>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                Showing {users.length} account{users.length === 1 ? "" : "s"}
                {hasFilters ? " matching your filters" : " on loaded pages"}.
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-left text-xs font-semibold text-[#98743d] transition hover:text-[#14243d] sm:text-right"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {usersQuery.isFetching && !usersQuery.isFetchingNextPage && (
          <div className="flex items-center gap-2 border-b border-[#e8e9ed] bg-[#fafbfc] px-5 py-2 text-xs text-gray-500">
            <LoaderCircle size={13} className="animate-spin" />
            Updating user directory...
          </div>
        )}

        {users.length === 0 ? (
          <UserEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#e8e9ed] bg-[#fafbfc]">
                    <th className="px-6 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Account
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Email verification
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Registered
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Last sign-in
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef0f2]">
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-[#fcfcfb]"
                      >
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0e9dc] text-xs font-bold text-[#876638]">
                              {getInitials(user.displayName, user.email)}
                            </span>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-[#172033]">
                                {user.displayName || "Unnamed account"}
                                {isCurrentUser && (
                                  <span className="ml-2 text-[10px] font-medium text-gray-400">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="mt-1 max-w-[220px] truncate text-xs text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <RoleLabel role={user.role} />
                        </td>

                        <td className="px-5 py-4">
                          {user.emailConfirmedAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 size={14} />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <AlertCircle size={14} />
                              Unverified
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-600">
                          {formatDate(user.registeredAt) || "—"}
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-600">
                          {formatLastSignIn(user.lastSignInAt)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openRoleDialog(user)}
                            disabled={isCurrentUser}
                            title={
                              isCurrentUser
                                ? "You cannot change your own role"
                                : "Change account role"
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e3e5e9] px-3 text-xs font-semibold text-[#344054] transition hover:border-[#b99658] hover:bg-[#fbf8f2] hover:text-[#14243d] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Manage role
                            <ChevronDown size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#e8e9ed] bg-[#fcfcfb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-500">
                Accounts are loaded in groups of {PAGE_SIZE}. Continue to load
                older registrations.
              </p>

              {usersQuery.hasNextPage ? (
                <button
                  type="button"
                  onClick={() => usersQuery.fetchNextPage()}
                  disabled={usersQuery.isFetchingNextPage}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#dfe2e8] bg-white px-4 py-2.5 text-xs font-semibold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {usersQuery.isFetchingNextPage ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  Load more accounts
                </button>
              ) : (
                <span className="text-xs font-medium text-gray-400">
                  <CheckCircle2 size={13} className="mr-1 inline" />
                  All matching accounts loaded
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {selectedUser && (
        <RoleChangeDialog
          user={selectedUser}
          role={selectedRole}
          onRoleChange={setSelectedRole}
          onClose={closeRoleDialog}
          onConfirm={confirmRoleChange}
          isPending={updateRole.isPending}
          error={actionError}
        />
      )}
    </div>
  );
}
