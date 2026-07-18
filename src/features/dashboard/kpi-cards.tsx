import { FiWatch, FiCheckCircle, FiTag, FiFolder, FiAlertTriangle } from "react-icons/fi";
import { Card } from "../../components/ui/card.tsx";
import { Skeleton } from "../../components/ui/skeleton.tsx";
import type { DashboardMetrics } from "./api.ts";
import { useAuth } from "../auth/use-auth.ts";

interface KpiCardsProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
}

export function KpiCards({ metrics, isLoading }: KpiCardsProps) {
  const { hasPermission } = useAuth();

  const cards = [
    {
      title: "Total Products",
      value: metrics?.totalProducts ?? 0,
      icon: FiWatch,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      visible: hasPermission("products.read"),
    },
    {
      title: "Active Products",
      value: metrics?.activeProducts ?? 0,
      icon: FiCheckCircle,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      visible: hasPermission("products.read"),
    },
    {
      title: "Brands",
      value: metrics?.totalBrands ?? 0,
      icon: FiTag,
      color: "text-purple-600 bg-purple-50 border-purple-100",
      visible: hasPermission("brands.manage"),
    },
    {
      title: "Categories",
      value: metrics?.totalCategories ?? 0,
      icon: FiFolder,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      visible: hasPermission("categories.manage"),
    },
    {
      title: "Low Stock Items",
      value: metrics?.lowStockCount ?? 0,
      icon: FiAlertTriangle,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      visible: hasPermission("inventory.read"),
    },
  ].filter((c) => c.visible);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-7 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {card.value.toLocaleString()}
                  </p>
                )}
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
