import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../features/auth/use-auth.ts";
import { useDashboardMetrics } from "../features/dashboard/use-dashboard-data.ts";
import { KpiCards } from "../features/dashboard/kpi-cards.tsx";
import { ProductStatusChart } from "../features/dashboard/product-status-chart.tsx";
import { InventoryOverviewChart } from "../features/dashboard/inventory-overview-chart.tsx";
import { RecentActivity } from "../features/dashboard/recent-activity.tsx";
import { QuickActions } from "../features/dashboard/quick-actions.tsx";
import { Button } from "../components/ui/button.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { data: metrics, isLoading, error, refetch, isFetching } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name || "Admin"}
          </h1>
          <p className="text-xs text-slate-500">
            Real-time overview of your watch store catalog and operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={isFetching}
            onClick={() => refetch()}
            leftIcon={<FiRefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error banner if metrics failed */}
      {error && (
        <ErrorState
          title="Could not load dashboard metrics"
          message="Failed to retrieve real-time catalog counts from backend."
          onRetry={() => refetch()}
        />
      )}

      {/* KPI Cards row */}
      <KpiCards metrics={metrics} isLoading={isLoading} />

      {/* Quick shortcuts */}
      <QuickActions />

      {/* Charts & Graphs row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {hasPermission("products.read") && (
          <ProductStatusChart metrics={metrics} isLoading={isLoading} />
        )}
        {hasPermission("inventory.read") && <InventoryOverviewChart />}
      </div>

      {/* Recent Activity stream */}
      <RecentActivity />
    </div>
  );
}
