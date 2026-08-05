import { FiActivity, FiClock, FiUser } from "react-icons/fi";
import { Card, CardHeader } from "../../components/ui/card.tsx";
import { Skeleton } from "../../components/ui/skeleton.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import { useRecentActivity } from "./use-dashboard-data.ts";
import { useAuth } from "../auth/use-auth.ts";

export function RecentActivity() {
  const { hasAnyPermission } = useAuth();
  const canViewAudit = hasAnyPermission(["auditLogs.read", "auditLogs.readLimited"]);
  const { data: logs, isLoading } = useRecentActivity();

  if (!canViewAudit) {
    return null;
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create")) return "success";
    if (action.includes("delete")) return "danger";
    if (action.includes("update") || action.includes("adjust")) return "warning";
    if (action.includes("login")) return "info";
    return "default";
  };

  return (
    <Card>
      <CardHeader
        title="Recent Audit Events"
        subtitle="Latest administrative actions recorded"
      />

      {isLoading ? (
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          icon={<FiActivity className="h-6 w-6 text-slate-400" />}
          title="No Recent Activity"
          description="Administrative mutations and logins will appear here."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                    {log.action}
                  </Badge>
                  <span className="text-xs font-medium text-slate-700">
                    {log.entityType} {log.entityId ? `(${log.entityId.slice(0, 8)}...)` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <FiUser className="h-3 w-3" />
                    {log.actorName ?? "System"}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiClock className="h-3 w-3" />
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
