import { FiEdit2, FiKey, FiTrash2 } from "react-icons/fi";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import type { AdminUserListItem } from "./api.ts";

export interface AdminUserTableProps {
  users: AdminUserListItem[];
  onEdit: (user: AdminUserListItem) => void;
  onPassword: (user: AdminUserListItem) => void;
  onDelete: (user: AdminUserListItem) => void;
  canManage: boolean;
  /** The signed-in admin's id, so the self-delete action can be disabled. */
  currentUserId: string;
}

export function AdminUserTable({
  users,
  onEdit,
  onPassword,
  onDelete,
  canManage,
  currentUserId,
}: AdminUserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-220 text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Role</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Active Sessions</th>
            <th className="px-3 py-3">Last Login</th>
            <th className="px-3 py-3">Created</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-4">
                <div className="font-medium text-slate-900">{user.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>
              </td>
              <td className="px-3 py-4">
                <span className={`text-xs font-medium ${user.role === "owner" ? "text-blue-600" : user.role === "manager" ? "text-purple-600" : "text-green-600"}`}>
                  {user.role.toUpperCase()}
                </span>
              </td>
              <td className="px-3 py-4">
                <Badge variant={user.isActive ? "success" : "default"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-3 py-4 text-slate-600">{user.activeSessionCount}</td>
              <td className="px-3 py-4 text-slate-500">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
              </td>
              <td className="px-3 py-4 text-slate-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-4">
                <div className="flex justify-end gap-1">
                  {canManage && (
                    <>
                      <Button
                        aria-label={`Edit ${user.name}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(user)}
                      >
                        <FiEdit2 />
                      </Button>
                      <Button
                        aria-label={`Change password for ${user.name}`}
                        size="sm"
                        variant="ghost"
                        onClick={() => onPassword(user)}
                      >
                        <FiKey />
                      </Button>
                      <Button
                        aria-label={`Delete ${user.name}`}
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        // Self-deletion is refused by the backend ("You cannot delete
                        // your own account"); surface it as a disabled control instead
                        // of a guaranteed 422.
                        disabled={user.id === currentUserId}
                        title={user.id === currentUserId ? "You cannot delete your own account" : undefined}
                        onClick={() => onDelete(user)}
                      >
                        <FiTrash2 />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}