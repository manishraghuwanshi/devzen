export type AdminRole = "owner" | "manager" | "editor";

export type Permission =
  | "products.read"
  | "products.write"
  | "products.delete"
  | "brands.manage"
  | "categories.manage"
  | "images.manage"
  | "inventory.read"
  | "inventory.write"
  | "adminUsers.manage"
  | "auditLogs.read"
  | "auditLogs.readLimited";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LogoutResult {
  loggedOut: boolean;
}
