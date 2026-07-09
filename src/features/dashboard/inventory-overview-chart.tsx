import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardHeader } from "../../components/ui/card.tsx";
import { Skeleton } from "../../components/ui/skeleton.tsx";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import { useInventoryOverview } from "./use-dashboard-data.ts";

export function InventoryOverviewChart() {
  const { data: inventory, isLoading } = useInventoryOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Stock Health" subtitle="Inventory status breakdown" />
        <div className="flex h-56 items-center justify-center">
          <Skeleton className="h-44 w-full" />
        </div>
      </Card>
    );
  }

  const inStock = inventory?.inStock ?? 0;
  const lowStock = inventory?.lowStock ?? 0;
  const outOfStock = inventory?.outOfStock ?? 0;
  const total = inStock + lowStock + outOfStock;

  if (total === 0) {
    return (
      <Card>
        <CardHeader title="Stock Health" subtitle="Inventory status breakdown" />
        <div className="h-56">
          <EmptyState
            title="No Inventory Tracked"
            description="No inventory items available to analyze."
          />
        </div>
      </Card>
    );
  }

  const data = [
    { name: "In Stock", count: inStock, fill: "#2563eb" },
    { name: "Low Stock", count: lowStock, fill: "#f59e0b" },
    { name: "Out of Stock", count: outOfStock, fill: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader
        title="Stock Health"
        subtitle="Distribution across product stock levels"
      />
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              formatter={(val) => [`${val} items`, "Quantity"]}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
