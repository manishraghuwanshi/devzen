import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiPlus, FiRotateCcw, FiSearch } from "react-icons/fi";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { ProductTable } from "../features/products/product-table.tsx";
import { brandOptionKeys } from "../features/brands/api.ts";
import { categoryOptionKeys } from "../features/categories/api.ts";
import {
  deleteProduct,
  listBrands,
  listCategories,
  listProducts,
  productKeys,
} from "../features/products/api.ts";
import type { ProductListParams } from "../features/products/product-types.ts";
import { useAuth } from "../features/auth/use-auth.ts";
import { ApiError } from "../lib/api-error.ts";
import type { ProductListItem } from "../types/models.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SORTS: { value: NonNullable<ProductListParams["sort"]>; label: string }[] = [
  { value: "createdAt", label: "Newest" },
  { value: "updatedAt", label: "Recently updated" },
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
];

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Product list.
 *
 * Every filter lives in the URL, so a filtered view is shareable and survives a
 * reload. The list request is fully server-side (search, brand/category, price
 * bounds, status, featured, sort, pagination) matching `productListQuerySchema`.
 */
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const { hasPermission } = useAuth();

  const page = positiveInt(searchParams.get("page"), 1);
  const limit = positiveInt(searchParams.get("limit"), 20);
  const search = searchParams.get("search") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const activeFilter = searchParams.get("isActive") ?? "";
  const featuredFilter = searchParams.get("isFeatured") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const sort = (searchParams.get("sort") ?? "createdAt") as ProductListParams["sort"];
  const order = (searchParams.get("order") ?? "desc") as ProductListParams["order"];

  const params: ProductListParams = {
    page,
    limit,
    ...(search ? { search } : {}),
    ...(brandId ? { brandId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(activeFilter ? { isActive: activeFilter === "true" } : {}),
    ...(featuredFilter ? { isFeatured: featuredFilter === "true" } : {}),
    ...(isWholeNumber(minPrice) ? { minPrice: Number(minPrice) } : {}),
    ...(isWholeNumber(maxPrice) ? { maxPrice: Number(maxPrice) } : {}),
    sort,
    order,
  };

  const canReadBrands = hasPermission("brands.manage");
  const canReadCategories = hasPermission("categories.manage");

  const productsQuery = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => listProducts(params),
  });
  const brandsQuery = useQuery({
    queryKey: brandOptionKeys.all,
    queryFn: listBrands,
    enabled: canReadBrands,
  });
  const categoriesQuery = useQuery({
    queryKey: categoryOptionKeys.all,
    queryFn: () => listCategories(),
    enabled: canReadCategories,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => client.invalidateQueries({ queryKey: productKeys.all }),
  });

  const updateParams = (changes: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    if (resetPage) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const searchValue = (form.elements.namedItem("search") as HTMLInputElement).value;
    const minValue = (form.elements.namedItem("minPrice") as HTMLInputElement).value;
    const maxValue = (form.elements.namedItem("maxPrice") as HTMLInputElement).value;

    updateParams({
      search: searchValue.trim() || null,
      minPrice: isWholeNumber(minValue) ? minValue : null,
      maxPrice: isWholeNumber(maxValue) ? maxValue : null,
    });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const handleDelete = (product: ProductListItem) => {
    // `isPending` also disables the row button, but the native confirm dialog blocks
    // the main thread, so re-check before firing a second request.
    if (removeMutation.isPending) return;

    if (
      window.confirm(
        `Delete "${product.name}"? Its images and inventory record are removed too. This cannot be undone.`,
      )
    ) {
      removeMutation.mutate(product.id);
    }
  };

  const rows = productsQuery.data?.data ?? [];
  const pagination = productsQuery.data?.pagination;
  const hasFilters = Boolean(
    search || brandId || categoryId || activeFilter || featuredFilter || minPrice || maxPrice
  );
return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Watch catalog, pricing, and stock status</p>
        </div>
        {hasPermission("products.write") && (
          <Link to="/products/new">
            <Button leftIcon={<FiPlus className="h-4 w-4" />}>New Product</Button>
          </Link>
        )}
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <Input
            name="search"
            label="Search"
            key={`search-${search}`}
            defaultValue={search}
            placeholder="Name, slug, or SKU"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

          {canReadBrands && (
            <label className="block text-sm font-medium text-slate-700">
              Brand
              <select
                className={selectClass}
                value={brandId}
                onChange={(event) => updateParams({ brandId: event.target.value })}
              >
                <option value="">All brands</option>
                {(brandsQuery.data ?? []).map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {canReadCategories && (
            <label className="block text-sm font-medium text-slate-700">
              Category
              <select
                className={selectClass}
                value={categoryId}
                onChange={(event) => updateParams({ categoryId: event.target.value })}
              >
                <option value="">All categories</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className={selectClass}
              value={activeFilter}
              onChange={(event) => updateParams({ isActive: event.target.value })}
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Featured
            <select
              className={selectClass}
              value={featuredFilter}
              onChange={(event) => updateParams({ isFeatured: event.target.value })}
            >
              <option value="">All products</option>
              <option value="true">Featured only</option>
              <option value="false">Not featured</option>
            </select>
          </label>

          <Input
            name="minPrice"
            label="Min price"
            key={`min-${minPrice}`}
            type="number"
            min="0"
            step="1"
            helperText="Whole units (e.g. 12999 = ₹12,999)"
            defaultValue={minPrice}
          />
          <Input
            name="maxPrice"
            label="Max price"
            key={`max-${maxPrice}`}
            type="number"
            min="0"
            step="1"
            helperText="Whole units (e.g. 12999 = ₹12,999)"
            defaultValue={maxPrice}
          />

          <label className="block text-sm font-medium text-slate-700">
            Sort
            <select
              className={selectClass}
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Order
            <select
              className={selectClass}
              value={order}
              onChange={(event) => updateParams({ order: event.target.value })}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div className="flex items-end gap-2 lg:col-span-2">
            <Button type="submit" leftIcon={<FiSearch className="h-4 w-4" />}>
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              leftIcon={<FiRotateCcw className="h-4 w-4" />}
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {removeMutation.isError && (
        <ErrorState title="Could not delete product" message={errorText(removeMutation.error)} />
      )}

      <Card className="p-0">
        {productsQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : productsQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load products"
              message={errorText(productsQuery.error)}
              onRetry={() => productsQuery.refetch()}
            />
          </div>
        ) : (
          <ProductTable
            products={rows}
            canWrite={hasPermission("products.write")}
            canDelete={hasPermission("products.delete")}
            deletingId={removeMutation.isPending ? (removeMutation.variables ?? null) : null}
            onDelete={handleDelete}
          />
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FiChevronLeft className="h-4 w-4" />}
              disabled={pagination.page <= 1}
              onClick={() => updateParams({ page: String(pagination.page - 1) }, false)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              rightIcon={<FiChevronRight className="h-4 w-4" />}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateParams({ page: String(pagination.page + 1) }, false)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function positiveInt(raw: string | null, fallback: number): number {
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isWholeNumber(raw: string): boolean {
  if (raw.trim() === "") return false;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0;
}