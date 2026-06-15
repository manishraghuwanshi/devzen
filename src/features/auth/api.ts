import { api } from "../../lib/api-client.ts";
import type { AdminUser, LoginCredentials, LogoutResult } from "../../types/auth.ts";

export async function loginApi(credentials: LoginCredentials): Promise<AdminUser> {
  const result = await api.post<AdminUser>("/api/auth/login", credentials, {
    skipAuthRefresh: true,
  });
  return result.data;
}

export async function logoutApi(): Promise<LogoutResult> {
  const result = await api.post<LogoutResult>("/api/auth/logout", undefined, {
    skipAuthRefresh: true,
  });
  return result.data;
}

export async function getMeApi(): Promise<AdminUser> {
  const result = await api.get<AdminUser>("/api/auth/me");
  return result.data;
}
