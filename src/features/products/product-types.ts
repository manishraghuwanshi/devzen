import type { ProductDetail } from "../../types/models.ts";

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "createdAt" | "name" | "price" | "updatedAt";
  order?: "asc" | "desc";
}

export interface ProductPayload {
  brandId: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  categoryIds?: string[];
  inventory?: { quantity?: number; reservedQuantity?: number; lowStockThreshold?: number };
}

export type ProductUpdatePayload = Partial<ProductPayload>;

export interface ImagePayload {
  data: string;
  altText?: string | null;
  isPrimary?: boolean;
}

export interface ProductFormValues extends Omit<ProductPayload, "price" | "compareAtPrice"> {
  price: number;
  compareAtPrice?: number | null;
}

/**
 * Saleable units, mirroring the backend's `quantity - reserved_quantity` SQL column.
 *
 * A product's embedded `inventory` relation does not carry `availableQuantity` (only
 * `/api/inventory` projects it), so callers derive it here rather than re-implementing
 * the subtraction at each call site.
 */
export function availableQuantity(
  inventory: { quantity: number; reservedQuantity: number } | null | undefined,
): number {
  return inventory ? Math.max(0, inventory.quantity - inventory.reservedQuantity) : 0;
}

export function productToFormValues(product: ProductDetail): ProductFormValues {
  return {
    brandId: product.brandId,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    categoryIds: product.categories.map((category) => category.id),
    inventory: product.inventory
      ? { quantity: product.inventory.quantity, reservedQuantity: product.inventory.reservedQuantity, lowStockThreshold: product.inventory.lowStockThreshold }
      : { quantity: 0, reservedQuantity: 0, lowStockThreshold: 5 },
  };
}
