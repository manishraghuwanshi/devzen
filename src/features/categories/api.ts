import { api } from "../../lib/api-client.ts";
import type { Category } from "../../types/models.ts";

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  parentId?: string;
  sort?: "sortOrder" | "name" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export const categoryKeys = {
  all: ["categories"] as const,
  list: (params: CategoryListParams) => ["categories", "list", params] as const,
};

/** Active categories only, for product/other `<select>` pickers. */
export const categoryOptionKeys = {
  all: ["categories", "options"] as const,
  /** Same list filtered to `isActive=true`, used by the product form. */
  active: ["categories", "options", "active"] as const,
};

export async function listCategories(params: CategoryListParams) {
  return api.get<Category[]>("/api/categories", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * A single, alphabetically sorted page (backend max is 100) of categories.
 *
 * Used both to fill the parent-category selector and to resolve parent names on the
 * list. `activeOnly` is for the product form, which should only offer live
 * categories; the parent picker wants the whole taxonomy.
 */
export async function listCategoryOptions(activeOnly = false) {
  return (
    await api.get<Category[]>("/api/categories", {
      params: {
        limit: 100,
        page: 1,
        sort: "sortOrder",
        order: "asc",
        ...(activeOnly ? { isActive: true } : {}),
      },
    })
  ).data;
}

export async function createCategory(payload: CategoryPayload) {
  return (await api.post<Category>("/api/categories", payload)).data;
}

export async function updateCategory(id: string, payload: Partial<CategoryPayload>) {
  return (await api.patch<Category>(`/api/categories/${id}`, payload)).data;
}

export async function deleteCategory(id: string) {
  return (await api.delete<{ deleted: boolean }>(`/api/categories/${id}`)).data;
}