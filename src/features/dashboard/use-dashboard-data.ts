import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardMetrics,
  fetchRecentAuditLogs,
  fetchInventoryOverview,
  type DashboardMetrics,
} from "./api.ts";
import { useAuth } from "../auth/use-auth.ts";

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRecentActivity() {
  const { hasAnyPermission } = useAuth();
  const canReadAudit = hasAnyPermission(["auditLogs.read", "auditLogs.readLimited"]);

  return useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: () => fetchRecentAuditLogs(6),
    enabled: canReadAudit,
    staleTime: 30 * 1000,
  });
}

export function useInventoryOverview() {
  const { hasPermission } = useAuth();
  const canReadInventory = hasPermission("inventory.read");

  return useQuery({
    queryKey: ["dashboard", "inventory-overview"],
    queryFn: fetchInventoryOverview,
    enabled: canReadInventory,
    staleTime: 60 * 1000,
  });
}
