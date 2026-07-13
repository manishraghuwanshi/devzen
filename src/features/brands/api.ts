import { api } from "../../lib/api-client.ts";
import type { Brand } from "../../types/models.ts";

export interface BrandListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sort?: "name" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface BrandPayload {
  name: string;
  slug: string;
  description?: string | null;
  websiteUrl?: string | null;
  isActive?: boolean;
}

export const brandKeys = {
  all: ["brands"] as const,
  list: (params: BrandListParams) => ["brands", "list", params] as const,
};

/**
 * Options for product/other selectors. The backend caps `limit` at 100 per request,
 * so this fetches one full, alphabetically sorted page of active brands.
 */
export const brandOptionKeys = {
  all: ["brands", "options"] as const,
};

export async function listBrands(params: BrandListParams) {
  return api.get<Brand[]>("/api/brands", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/** Active brands only, for use in `<select>` pickers. */
export async function listBrandOptions() {
  return (
    await api.get<Brand[]>("/api/brands", {
      params: { limit: 100, page: 1, sort: "name", order: "asc", isActive: true },
    })
  ).data;
}

export async function createBrand(payload: BrandPayload) {
  return (await api.post<Brand>("/api/brands", payload)).data;
}

export async function updateBrand(id: string, payload: Partial<BrandPayload>) {
  return (await api.patch<Brand>(`/api/brands/${id}`, payload)).data;
}

export async function deleteBrand(id: string) {
  return (await api.delete<{ deleted: boolean }>(`/api/brands/${id}`)).data;
}