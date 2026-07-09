import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader } from "../../components/ui/card.tsx";
import { Skeleton } from "../../components/ui/skeleton.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import type { DashboardMetrics } from "./api.ts";

interface ProductStatusChartProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
}

const COLORS = ["#10b981", "#94a3b8"];

export function ProductStatusChart({ metrics, isLoading }: ProductStatusChartProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col justify-between">
        <CardHeader title="Catalog Status" subtitle="Active vs Inactive watch models" />
        <div className="flex h-56 items-center justify-center">
          <Skeleton className="h-44 w-44 rounded-full" />
        </div>
      </Card>
    );
  }

  const active = metrics?.activeProducts ?? 0;
  const inactive = metrics?.inactiveProducts ?? 0;
  const total = active + inactive;
  const subtitle = `${total.toLocaleString()} ${total === 1 ? "watch" : "watches"} recorded`;

  if (total === 0) {
    return (
      <Card>
        <CardHeader title="Catalog Status" subtitle="Active vs Inactive watch models" />
        <div className="h-56">
          <EmptyState
            title="No Products Found"
            description="Catalog contains no active or inactive watch products yet."
          />
        </div>
      </Card>
    );
  }

  const data = [
    { name: "Active", value: active },
    { name: "Inactive", value: inactive },
  ];

  return (
    <Card>
      <CardHeader
        title="Catalog Status"
        subtitle={subtitle}
      />
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} watches`, "Count"]}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
