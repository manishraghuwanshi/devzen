import { api } from "../../lib/api-client.ts";
import type { AdminUser } from "../../types/auth.ts";

/**
 * The list endpoint mirrors `adminUsersService.publicColumns` plus a correlated
 * `activeSessionCount`. Neither `permissions` nor `passwordHash` is ever selected
 * server-side, so the endpoint deliberately does not reuse the wider `AdminUser`
 * shape returned by `/api/auth/me`.
 */
export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: AdminUser["role"];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  activeSessionCount: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: "owner" | "manager" | "editor";
  isActive?: boolean;
  sort?: "createdAt" | "name" | "email" | "lastLoginAt";
  order?: "asc" | "desc";
}

export interface AdminUserPayload {
  email: string;
  name: string;
  role: "owner" | "manager" | "editor";
  password: string;
  isActive?: boolean;
}

export interface AdminUserUpdatePayload {
  email?: string;
  name?: string;
  role?: "owner" | "manager" | "editor";
  isActive?: boolean;
}

export interface AdminUserPasswordPayload {
  password: string;
}

export const adminUserKeys = {
  all: ["adminUsers"] as const,
  list: (params: AdminUserListParams) => ["adminUsers", "list", params] as const,
};

export async function listAdminUsers(params: AdminUserListParams) {
  return api.get<AdminUserListItem[]>("/api/admin-users", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function createAdminUser(payload: AdminUserPayload) {
  return (await api.post<AdminUserListItem>("/api/admin-users", payload)).data;
}

export async function updateAdminUser(id: string, payload: AdminUserUpdatePayload) {
  return (await api.patch<AdminUserListItem>(`/api/admin-users/${id}`, payload)).data;
}

export async function updateAdminUserPassword(id: string, payload: AdminUserPasswordPayload) {
  return (await api.put<{ updated: boolean }>(`/api/admin-users/${id}/password`, payload)).data;
}

export async function deleteAdminUser(id: string) {
  return (await api.delete<{ deleted: boolean }>(`/api/admin-users/${id}`)).data;
}