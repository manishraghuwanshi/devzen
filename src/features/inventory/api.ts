import { api } from "../../lib/api-client.ts";
import type { InventoryItem } from "../../types/models.ts";

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  /** `low` is relative to each product's own threshold. */
  stockState?: "any" | "inStock" | "low" | "out";
  sort?: "updatedAt" | "available" | "product";
  order?: "asc" | "desc";
}

/** Absolute set (`PUT /api/inventory/:productId`). */
export interface InventorySetPayload {
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

/** Relative delta (`POST /api/inventory/:productId/adjust`). */
export interface InventoryAdjustPayload {
  delta: number;
  reason?: string;
}

export const inventoryKeys = {
  all: ["inventory"] as const,
  list: (params: InventoryListParams) => ["inventory", "list", params] as const,
  detail: (productId: string) => ["inventory", "detail", productId] as const,
};

export async function listInventory(params: InventoryListParams) {
  return api.get<InventoryItem[]>("/api/inventory", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function setInventory(productId: string, payload: InventorySetPayload) {
  return (await api.put<InventoryItem>(`/api/inventory/${productId}`, payload)).data;
}

export async function adjustInventory(productId: string, payload: InventoryAdjustPayload) {
  return (await api.post<InventoryItem>(`/api/inventory/${productId}/adjust`, payload)).data;
}