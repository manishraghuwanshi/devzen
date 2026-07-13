import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiEdit2, FiPlus, FiRotateCcw, FiSearch, FiTag, FiTrash2 } from "react-icons/fi";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import {
  brandKeys,
  brandOptionKeys,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
  type BrandListParams,
  type BrandPayload,
} from "../features/brands/api.ts";
import { BrandForm } from "../features/brands/brand-form.tsx";
import { productKeys } from "../features/products/api.ts";
import { ApiError } from "../lib/api-error.ts";
import type { Brand } from "../types/models.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SORTS: { value: NonNullable<BrandListParams["sort"]>; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Newest" },
  { value: "updatedAt", label: "Recently updated" },
];

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

function positiveInt(raw: string | null, fallback: number): number {
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Brands list.
 *
 * Filters live in the URL (shareable, reload-safe) and the list is fully
 * server-side. Create/edit happens in a modal — a brand is small enough that a
 * dedicated page would be overkill.
 */
export default function BrandsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const page = positiveInt(searchParams.get("page"), 1);
  const search = searchParams.get("search") ?? "";
  const activeFilter = searchParams.get("isActive") ?? "";
  const sort = (searchParams.get("sort") ?? "name") as BrandListParams["sort"];
  const order = (searchParams.get("order") ?? "asc") as BrandListParams["order"];

  const params: BrandListParams = {
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(activeFilter ? { isActive: activeFilter === "true" } : {}),
    sort,
    order,
  };

  const brandsQuery = useQuery({
    queryKey: brandKeys.list(params),
    queryFn: () => listBrands(params),
  });

  const invalidateBrands = () => {
    client.invalidateQueries({ queryKey: brandKeys.all });
    client.invalidateQueries({ queryKey: brandOptionKeys.all });
    client.invalidateQueries({ queryKey: productKeys.all });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: BrandPayload) =>
      editing ? updateBrand(editing.id, payload) : createBrand(payload),
    onSuccess: () => {
      invalidateBrands();
      closeForm();
    },
    onError: (error) => setFormError(errorText(error, "The brand could not be saved.")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: invalidateBrands,
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setFormError(null);
    setFormOpen(true);
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

  const handleDelete = (brand: Brand) => {
    if (window.confirm(`Delete "${brand.name}"? This cannot be undone. Products still using this brand will block the deletion.`)) {
      removeMutation.mutate(brand.id);
    }
  };

  const rows = brandsQuery.data?.data ?? [];
  const pagination = brandsQuery.data?.pagination;
  const hasFilters = Boolean(search || activeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Brands</h1>
          <p className="text-sm text-slate-500">Watch manufacturers and brand partners</p>
        </div>
        <Button leftIcon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
          New Brand
        </Button>
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <Input
            name="search"
            label="Search"
            key={`search-${search}`}
            defaultValue={search}
            placeholder="Brand name"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

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
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
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

      {removeMutation.isError && (
        <ErrorState title="Could not delete brand" message={errorText(removeMutation.error)} />
      )}
<Card className="p-0">
        {brandsQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : brandsQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load brands"
              message={errorText(brandsQuery.error)}
              onRetry={() => brandsQuery.refetch()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((brand) => (
                  <tr key={brand.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{brand.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">/{brand.slug}</div>
                      {brand.description && (
                        <div className="mt-1 max-w-md text-xs text-slate-400">
                          {brand.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {brand.websiteUrl ? (
                        <a
                          href={brand.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit site
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={brand.isActive ? "success" : "default"}>
                        {brand.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(brand.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${brand.name}`}
                          onClick={() => openEdit(brand)}
                        >
                          <FiEdit2 />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          aria-label={`Delete ${brand.name}`}
                          onClick={() => handleDelete(brand)}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} brands
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
        isOpen={formOpen}
        onClose={closeForm}
        title={editing ? "Edit brand" : "New brand"}
        subtitle={editing ? editing.name : "Brands group products under a manufacturer"}
      >
        {formError && (
          <div className="mb-4">
            <ErrorState title="Could not save brand" message={formError} />
          </div>
        )}
        <BrandForm
          brand={editing ?? undefined}
          onSubmit={(payload) => saveMutation.mutate(payload)}
          submitting={saveMutation.isPending}
          submitLabel={editing ? "Save changes" : "Create brand"}
          onCancel={closeForm}
        />
      </Modal>
    </div>
  );
}