import type { AdminRole } from "./auth.ts";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoStorageKey: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageStorageKey: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * The `inventory` relation embedded in a product payload.
 *
 * This is the raw `inventory` row, so it deliberately has **no** `availableQuantity`:
 * that column is a computed SQL expression (`quantity - reserved_quantity`) which only
 * the `/api/inventory` list/detail endpoints project. Derive it with
 * `availableQuantity()` in `features/products/product-types.ts`.
 */
export interface ProductInventorySummary {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface ProductImageItem {
  id: string;
  productId: string;
  storageKey: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  url?: string | null;
}

export interface ProductDetail extends ProductListItem {
  brand: Brand;
  categories: Category[];
  images: ProductImageItem[];
  watchDetails: ProductWatchDetails | null;
}

export interface ProductWatchDetails {
  id: string;
  productId: string;
  watchType: string | null;
  movement: string | null;
  caseMaterial: string | null;
  caseShape: string | null;
  caseDiameter: string | number | null;
  caseThickness: string | number | null;
  strapMaterial: string | null;
  strapColor: string | null;
  dialColor: string | null;
  glassMaterial: string | null;
  waterResistance: string | null;
  powerReserve: string | null;
  warrantyPeriod: string | null;
  gender: string | null;
  additionalSpecifications: Record<string, unknown> | null;
}

export interface ProductListItem {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  thumbnailStorageKey: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  brand?: {
    id: string;
    name: string;
    slug: string;
  };
  inventory?: ProductInventorySummary | null;
}

export interface InventoryItem {
  productId: string;
  productSku: string;
  productName: string;
  productSlug: string;
  productIsActive: boolean;
  brandId: string;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  availableQuantity: number;
  updatedAt: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  activeSessionCount: number;
}
