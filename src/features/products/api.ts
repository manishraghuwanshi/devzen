import { api } from "../../lib/api-client.ts";
import type { ProductDetail, ProductImageItem, ProductListItem } from "../../types/models.ts";
import type { ImagePayload, ProductListParams, ProductPayload, ProductUpdatePayload } from "./product-types.ts";

// Brand/category helpers live with their own feature modules so selectors and the
// management pages share one query cache. Re-exported here for existing callers.
export { listBrandOptions as listBrands } from "../brands/api.ts";
export { listCategoryOptions as listCategories } from "../categories/api.ts";

export const productKeys = {
  all: ["products"] as const,
  list: (params: ProductListParams) => ["products", "list", params] as const,
  detail: (id: string) => ["products", "detail", id] as const,
  images: (id: string) => ["products", "images", id] as const,
};

export async function listProducts(params: ProductListParams) {
  return api.get<ProductListItem[]>("/api/products", {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}
export async function getProduct(id: string) { return (await api.get<ProductDetail>(`/api/products/${id}`)).data; }
export async function createProduct(payload: ProductPayload) { return (await api.post<ProductDetail>("/api/products", payload)).data; }
export async function updateProduct(id: string, payload: ProductUpdatePayload) { return (await api.patch<ProductDetail>(`/api/products/${id}`, payload)).data; }
export async function deleteProduct(id: string) { return (await api.delete<{ deleted: boolean }>(`/api/products/${id}`)).data; }
export async function listImages(id: string) { return (await api.get<ProductImageItem[]>(`/api/products/${id}/images`)).data; }
export async function uploadImage(id: string, payload: ImagePayload) { return (await api.post<ProductImageItem>(`/api/products/${id}/images`, payload)).data; }
export async function updateImage(id: string, imageId: string, altText: string | null) { return (await api.patch<ProductImageItem>(`/api/products/${id}/images/${imageId}`, { altText })).data; }
export async function setPrimaryImage(id: string, imageId: string) { return (await api.put<ProductImageItem>(`/api/products/${id}/images/${imageId}/primary`)).data; }
export async function removeImage(id: string, imageId: string) { return (await api.delete<{ deleted: boolean }>(`/api/products/${id}/images/${imageId}`)).data; }
export async function reorderImages(id: string, imageIds: string[]) { return (await api.post<ProductImageItem[]>(`/api/products/${id}/images/reorder`, { imageIds })).data; }
