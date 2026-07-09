import { api } from "../../lib/api-client.ts";
import type {
  ProductListItem,
  Brand,
  Category,
  InventoryItem,
} from "../../types/models.ts";
import type { AuditLog } from "../audit-logs/api.ts";

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalBrands: number;
  totalCategories: number;
  lowStockCount: number;
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  // Fetch products total
  const productsPromise = api.get<ProductListItem[]>("/api/products", {
    params: { limit: 1, page: 1 },
  });

  // Fetch active products total
  const activeProductsPromise = api.get<ProductListItem[]>("/api/products", {
    params: { limit: 1, page: 1, isActive: true },
  });

  // Fetch brands total
  const brandsPromise = api.get<Brand[]>("/api/brands", {
    params: { limit: 1, page: 1 },
  });

  // Fetch categories total
  const categoriesPromise = api.get<Category[]>("/api/categories", {
    params: { limit: 1, page: 1 },
  });

  // Fetch low stock items count
  const lowStockPromise = api.get<InventoryItem[]>("/api/inventory", {
    params: { limit: 1, page: 1, stockState: "low" },
  });

  const [productsRes, activeProductsRes, brandsRes, categoriesRes, lowStockRes] =
    await Promise.allSettled([
      productsPromise,
      activeProductsPromise,
      brandsPromise,
      categoriesPromise,
      lowStockPromise,
    ]);

  const totalProducts = productsRes.status === "fulfilled" ? productsRes.value.pagination?.total ?? 0 : 0;
  const activeProducts = activeProductsRes.status === "fulfilled" ? activeProductsRes.value.pagination?.total ?? 0 : 0;
  const totalBrands = brandsRes.status === "fulfilled" ? brandsRes.value.pagination?.total ?? 0 : 0;
  const totalCategories = categoriesRes.status === "fulfilled" ? categoriesRes.value.pagination?.total ?? 0 : 0;
  const lowStockCount = lowStockRes.status === "fulfilled" ? lowStockRes.value.pagination?.total ?? 0 : 0;

  return {
    totalProducts,
    activeProducts,
    inactiveProducts: Math.max(0, totalProducts - activeProducts),
    totalBrands,
    totalCategories,
    lowStockCount,
  };
}

/**
 * Latest audit entries for the dashboard. Returns `[]` when the caller's role may not
 * read audit logs (the query itself is permission-gated, this is just belt and braces)
 * so the activity card degrades to its empty state rather than an error.
 */
export async function fetchRecentAuditLogs(limit = 6): Promise<AuditLog[]> {
  try {
    const result = await api.get<AuditLog[]>("/api/audit-logs", {
      params: { limit, page: 1 },
    });
    return result.data || [];
  } catch {
    return [];
  }
}

export async function fetchInventoryOverview(): Promise<{
  inStock: number;
  lowStock: number;
  outOfStock: number;
}> {
  const [inStockRes, lowStockRes, outStockRes] = await Promise.allSettled([
    api.get<InventoryItem[]>("/api/inventory", { params: { limit: 1, page: 1, stockState: "inStock" } }),
    api.get<InventoryItem[]>("/api/inventory", { params: { limit: 1, page: 1, stockState: "low" } }),
    api.get<InventoryItem[]>("/api/inventory", { params: { limit: 1, page: 1, stockState: "out" } }),
  ]);

  return {
    inStock: inStockRes.status === "fulfilled" ? inStockRes.value.pagination?.total ?? 0 : 0,
    lowStock: lowStockRes.status === "fulfilled" ? lowStockRes.value.pagination?.total ?? 0 : 0,
    outOfStock: outStockRes.status === "fulfilled" ? outStockRes.value.pagination?.total ?? 0 : 0,
  };
}
