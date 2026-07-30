import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiKey,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { AdminUserForm, type AdminUserFormValues } from "../features/admin-users/admin-user-form.tsx";
import { AdminUserTable } from "../features/admin-users/admin-user-table.tsx";
import {
  adminUserKeys,
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
  updateAdminUserPassword,
  type AdminUserListItem,
  type AdminUserListParams,
  type AdminUserUpdatePayload,
} from "../features/admin-users/api.ts";
import { useAuth } from "../features/auth/use-auth.ts";
import { ApiError } from "../lib/api-error.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SORTS: { value: NonNullable<AdminUserListParams["sort"]>; label: string }[] = [
  { value: "createdAt", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "lastLoginAt", label: "Last login" },
];

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

type PasswordTarget = { id: string; name: string };

/**
 * Admin users list.
 *
 * Owner-only. Filters live in the URL, the list is fully server-side, and every
 * mutation maps to a real `admin-backend` endpoint (`POST`, `PATCH`,
 * `PUT /:id/password`, `DELETE`). Create and edit share one modal; password
 * rotation gets its own modal because `PATCH` has no password field.
 */
export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const { user, hasPermission } = useAuth();

  const canManage = hasPermission("adminUsers.manage");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<PasswordTarget | null>(null);

  const page = positiveInt(searchParams.get("page"), 1);
  const limit = positiveInt(searchParams.get("limit"), 20);
  const search = searchParams.get("search") ?? "";
  const roleFilter = searchParams.get("role") ?? "";
  const activeFilter = searchParams.get("isActive") ?? "";
  const sort = (searchParams.get("sort") ?? "createdAt") as AdminUserListParams["sort"];
  const order = (searchParams.get("order") ?? "desc") as AdminUserListParams["order"];

  const params: AdminUserListParams = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter as AdminUserListParams["role"] } : {}),
    ...(activeFilter ? { isActive: activeFilter === "true" } : {}),
    sort,
    order,
  };

  const usersQuery = useQuery({
    queryKey: adminUserKeys.list(params),
    queryFn: () => listAdminUsers(params),
    enabled: canManage,
  });

  const invalidateUsers = () => {
    client.invalidateQueries({ queryKey: adminUserKeys.all });
  };

  const saveMutation = useMutation({
    mutationFn: (values: AdminUserFormValues) => {
      if (editing) {
        const payload: AdminUserUpdatePayload = {
          email: values.email,
          name: values.name,
          role: values.role,
          isActive: values.isActive ?? true,
        };
        return updateAdminUser(editing.id, payload);
      }

      return createAdminUser({
        email: values.email,
        name: values.name,
        role: values.role,
        password: values.password ?? "",
        isActive: values.isActive ?? true,
      });
    },
    onSuccess: () => {
      invalidateUsers();
      closeForm();
    },
    onError: (error) => setFormError(errorText(error, "The admin user could not be saved.")),
  });

  const passwordMutation = useMutation({
    mutationFn: (input: { id: string; password: string }) =>
      updateAdminUserPassword(input.id, { password: input.password }),
    onSuccess: () => {
      setPasswordTarget(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: invalidateUsers,
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (target: AdminUserListItem) => {
    setEditing(target);
    setFormError(null);
    setFormOpen(true);
  };

  const handleDelete = (target: AdminUserListItem) => {
    if (window.confirm(`Delete the admin account for "${target.name}"? This cannot be undone.`)) {
      removeMutation.mutate(target.id);
    }
  };

  const updateParams = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const searchValue = (form.elements.namedItem("search") as HTMLInputElement).value;
    updateParams({ search: searchValue.trim() || null });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const rows = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const hasFilters = Boolean(search || roleFilter || activeFilter);
  const currentUserId = user?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Users</h1>
          <p className="text-sm text-slate-500">Manage administrator accounts and roles (Owner only)</p>
        </div>
        {canManage && (
          <Button leftIcon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
            New Admin
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <Input
            name="search"
            label="Search"
            key={`search-${search}`}
            defaultValue={search}
            placeholder="Name or email"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

          <label className="block text-sm font-medium text-slate-700">
            Role
            <select
              className={selectClass}
              value={roleFilter}
              onChange={(event) => updateParams({ role: event.target.value })}
            >
              <option value="">All roles</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="editor">Editor</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className={selectClass}
              value={activeFilter}
              onChange={(event) => updateParams({ isActive: event.target.value })}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Sort
            <select
              className={selectClass}
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2 lg:col-span-4">
            <Button type="submit" leftIcon={<FiSearch className="h-4 w-4" />}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<FiRotateCcw className="h-4 w-4" />}
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {removeMutation.isError && (
        <ErrorState title="Could not delete admin user" message={errorText(removeMutation.error)} />
      )}

      <Card className="p-0">
        {usersQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : usersQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load admin users"
              message={errorText(usersQuery.error)}
              onRetry={() => usersQuery.refetch()}
            />
          </div>
        ) : (
          <AdminUserTable
            users={rows}
            canManage={canManage}
            currentUserId={currentUserId}
            onEdit={openEdit}
            onPassword={(target) => {
              passwordMutation.reset();
              setPasswordTarget({ id: target.id, name: target.name });
            }}
            onDelete={handleDelete}
          />
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} admin users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiChevronLeft className="h-4 w-4" />}
              disabled={pagination.page <= 1}
              onClick={() => updateParams({ page: String(pagination.page - 1) }, false)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<FiChevronRight className="h-4 w-4" />}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(pagination.page + 1) }, false)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? "Edit admin user" : "New admin user"}
        subtitle={editing ? editing.email : "Create an administrator account"}
      >
        {formError && (
          <div className="mb-4">
            <ErrorState title="Could not save admin user" message={formError} />
          </div>
        )}
        <AdminUserForm
          key={editing?.id ?? "new"}
          initialValues={
            editing
              ? {
                  email: editing.email,
                  name: editing.name,
                  role: editing.role,
                  isActive: editing.isActive,
                }
              : undefined
          }
          requirePassword={!editing}
          onSubmit={(values) => saveMutation.mutate(values)}
          submitting={saveMutation.isPending}
          submitLabel={editing ? "Save changes" : "Create admin"}
          onCancel={closeForm}
        />
      </Modal>

      <Modal
        isOpen={passwordTarget !== null}
        onClose={() => setPasswordTarget(null)}
        title="Change password"
        subtitle={passwordTarget?.name}
      >
        {passwordTarget && (
          <PasswordForm
            submitting={passwordMutation.isPending}
            error={passwordMutation.isError ? errorText(passwordMutation.error) : null}
            onSubmit={(password) => passwordMutation.mutate({ id: passwordTarget.id, password })}
            onCancel={() => setPasswordTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function positiveInt(raw: string | null, fallback: number): number {
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Password rotation form. Kept separate from `AdminUserForm` because it is not part
 * of the create/edit payload: `PUT /api/admin-users/:id/password` takes `{ password }`
 * alone and revokes the target's sessions.
 */
function PasswordForm({
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (password.trim()) onSubmit(password);
      }}
      className="space-y-4"
    >
      {error && <ErrorState title="Could not update password" message={error} />}
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        helperText="Minimum strength is enforced by the backend; existing sessions are revoked."
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={submitting}
          disabled={!password.trim()}
          leftIcon={<FiKey className="h-4 w-4" />}
        >
          Update password
        </Button>
      </div>
    </form>
  );
}
