import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { FiArchive, FiChevronLeft, FiChevronRight, FiRotateCcw, FiSearch, FiSliders } from "react-icons/fi";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { brandOptionKeys, listBrandOptions } from "../features/brands/api.ts";
import {
  adjustInventory,
  inventoryKeys,
  listInventory,
  setInventory,
  type InventoryAdjustPayload,
  type InventoryListParams,
  type InventorySetPayload,
} from "../features/inventory/api.ts";
import { AdjustStockForm, SetStockForm, type StockMode } from "../features/inventory/stock-form.tsx";
import { productKeys } from "../features/products/api.ts";
import { useAuth } from "../features/auth/use-auth.ts";
import { ApiError } from "../lib/api-error.ts";
import type { InventoryItem } from "../types/models.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SORTS: { value: NonNullable<InventoryListParams["sort"]>; label: string }[] = [
  { value: "updatedAt", label: "Recently updated" },
  { value: "available", label: "Available quantity" },
  { value: "product", label: "Product name" },
];

const STOCK_STATES: { value: NonNullable<InventoryListParams["stockState"]>; label: string }[] = [
  { value: "inStock", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

function positiveInt(raw: string | null, fallback: number): number {
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Derive a display status from the fields the backend already returns.
 *
 * `low` is relative to each product's own threshold, matching the backend's
 * `stockState=low` filter (available > 0 and below that product's reorder point).
 */
function stockStatus(item: InventoryItem): {
  label: string;
  variant: "success" | "warning" | "danger";
} {
  if (item.availableQuantity <= 0) {
    return { label: "Out of stock", variant: "danger" };
  }
  if (item.availableQuantity < item.lowStockThreshold) {
    return { label: "Low stock", variant: "warning" };
  }
  return { label: "In stock", variant: "success" };
}

/**
 * Inventory management.
 *
 * Inventory rows are created alongside products, so there is no "new" action here —
 * only viewing and, with `inventory.write`, adjusting stock. The delta adjustment is
 * offered first because it is the concurrency-safe operation.
 */
export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();
  const { hasPermission } = useAuth();

  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [mode, setMode] = useState<StockMode>("adjust");
  const [formError, setFormError] = useState<string | null>(null);

  const canWrite = hasPermission("inventory.write");

  const page = positiveInt(searchParams.get("page"), 1);
  const search = searchParams.get("search") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const stockStateFilter = searchParams.get("stockState") ?? "";
  const sort = (searchParams.get("sort") ?? "updatedAt") as InventoryListParams["sort"];
  const order = (searchParams.get("order") ?? "desc") as InventoryListParams["order"];

  const params: InventoryListParams = {
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(brandId ? { brandId } : {}),
    ...(stockStateFilter ? { stockState: stockStateFilter as InventoryListParams["stockState"] } : {}),
    sort,
    order,
  };

  const inventoryQuery = useQuery({
    queryKey: inventoryKeys.list(params),
    queryFn: () => listInventory(params),
  });

  const brandsQuery = useQuery({
    queryKey: brandOptionKeys.all,
    queryFn: () => listBrandOptions(),
  });

  const invalidateStock = (productId: string) => {
    client.invalidateQueries({ queryKey: inventoryKeys.all });
    client.invalidateQueries({ queryKey: inventoryKeys.detail(productId) });
    client.invalidateQueries({ queryKey: productKeys.all });
    client.invalidateQueries({ queryKey: productKeys.detail(productId) });
    client.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: { productId: string; mode: StockMode; payload: InventorySetPayload | InventoryAdjustPayload }) =>
      input.mode === "set"
        ? setInventory(input.productId, input.payload as InventorySetPayload)
        : adjustInventory(input.productId, input.payload as InventoryAdjustPayload),
    onSuccess: (updated) => {
      invalidateStock(updated.productId);
      closeForm();
    },
    onError: (error) => setFormError(errorText(error, "The stock change could not be saved.")),
  });

  const closeForm = () => {
    setSelected(null);
    setFormError(null);
  };

  const openStock = (item: InventoryItem) => {
    setSelected(item);
    setMode("adjust");
    setFormError(null);
  };

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
    updateParams({ search: searchValue.trim() || null });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const rows = inventoryQuery.data?.data ?? [];
  const pagination = inventoryQuery.data?.pagination;
  const brands = brandsQuery.data ?? [];
  const hasFilters = Boolean(search || brandId || stockStateFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500">Stock levels, reservations, and low-stock alerts</p>
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <Input
            name="search"
            label="Search"
            key={`search-${search}`}
            defaultValue={search}
            placeholder="Product name or SKU"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

          <label className="block text-sm font-medium text-slate-700">
            Brand
            <select
              className={selectClass}
              value={brandId}
              onChange={(event) => updateParams({ brandId: event.target.value })}
            >
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Stock state
            <select
              className={selectClass}
              value={stockStateFilter}
              onChange={(event) => updateParams({ stockState: event.target.value })}
            >
              <option value="">Any</option>
              {STOCK_STATES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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

          <div className="flex items-end gap-2 lg:col-span-4">
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
<Card className="p-0">
        {inventoryQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : inventoryQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load inventory"
              message={errorText(inventoryQuery.error)}
              onRetry={() => inventoryQuery.refetch()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Reserved</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  {canWrite && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <tr key={item.productId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-4">
                        <Link
                          to={`/products/${item.productId}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {item.productName}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-500">{item.productSku}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-4 text-slate-600">{item.reservedQuantity}</td>
                      <td className="px-4 py-4 font-medium text-slate-800">{item.availableQuantity}</td>
                      <td className="px-4 py-4 text-slate-600">{item.lowStockThreshold}</td>
                      <td className="px-4 py-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<FiSliders className="h-3.5 w-3.5" />}
                              aria-label={`Adjust stock for ${item.productName}`}
                              onClick={() => openStock(item)}
                            >
                              Adjust
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} items
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

      <Modal
        isOpen={Boolean(selected)}
        onClose={closeForm}
        title="Adjust stock"
        subtitle={selected ? `${selected.productName} · ${selected.productSku}` : undefined}
      >
        {selected && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={mode === "adjust" ? "primary" : "outline"}
                onClick={() => setMode("adjust")}
              >
                Adjust by delta
              </Button>
              <Button
                size="sm"
                variant={mode === "set" ? "primary" : "outline"}
                onClick={() => setMode("set")}
              >
                Set exact levels
              </Button>
            </div>
            {formError && (
              <div className="mb-4">
                <ErrorState title="Could not save stock" message={formError} />
              </div>
            )}
            {mode === "adjust" ? (
              <AdjustStockForm
                onSubmit={(payload) =>
                  saveMutation.mutate({ productId: selected.productId, mode, payload })
                }
                submitting={saveMutation.isPending}
                onCancel={closeForm}
              />
            ) : (
              <SetStockForm
                item={selected}
                onSubmit={(payload) =>
                  saveMutation.mutate({ productId: selected.productId, mode, payload })
                }
                submitting={saveMutation.isPending}
                onCancel={closeForm}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}