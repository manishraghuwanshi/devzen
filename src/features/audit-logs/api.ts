import { api } from "../../lib/api-client.ts";

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
  sort?: "createdAt" | "action";
  order?: "asc" | "desc";
}

export const auditLogKeys = {
  all: ["auditLogs"] as const,
  list: (params: AuditLogListParams) => ["auditLogs", "list", params] as const,
  actions: ["auditLogs", "actions"] as const,
};

export async function listAuditLogs(params: AuditLogListParams) {
  return api.get<AuditLog[]>("/api/audit-logs", {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}

export async function listAuditActions() {
  return api.get<string[]>("/api/audit-logs/actions");
}