import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiEdit2, FiFolder, FiPlus, FiRotateCcw, FiSearch, FiTrash2 } from "react-icons/fi";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import {
  categoryKeys,
  categoryOptionKeys,
  createCategory,
  deleteCategory,
  listCategories,
  listCategoryOptions,
  updateCategory,
  type CategoryListParams,
  type CategoryPayload,
} from "../features/categories/api.ts";
import { CategoryForm } from "../features/categories/category-form.tsx";
import { productKeys } from "../features/products/api.ts";
import { ApiError } from "../lib/api-error.ts";
import type { Category } from "../types/models.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

const SORTS: { value: NonNullable<CategoryListParams["sort"]>; label: string }[] = [
  { value: "sortOrder", label: "Sort order" },
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
 * Categories list.
 *
 * The taxonomy is hierarchical but the backend returns a flat, paginated page, so
 * each row simply shows its parent's name (resolved against a full options fetch).
 * That keeps the list honest without building a tree UI the API does not need.
 */
export default function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const client = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const page = positiveInt(searchParams.get("page"), 1);
  const search = searchParams.get("search") ?? "";
  const activeFilter = searchParams.get("isActive") ?? "";
  const parentFilter = searchParams.get("parentId") ?? "";
  const sort = (searchParams.get("sort") ?? "sortOrder") as CategoryListParams["sort"];
  const order = (searchParams.get("order") ?? "asc") as CategoryListParams["order"];

  const params: CategoryListParams = {
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(activeFilter ? { isActive: activeFilter === "true" } : {}),
    ...(parentFilter ? { parentId: parentFilter } : {}),
    sort,
    order,
  };

  const categoriesQuery = useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => listCategories(params),
  });

  // Full taxonomy (one page) for resolving parent names and filling the parent picker.
  const optionsQuery = useQuery({
    queryKey: categoryOptionKeys.all,
    queryFn: () => listCategoryOptions(false),
  });

  const invalidateCategories = () => {
    client.invalidateQueries({ queryKey: categoryKeys.all });
    client.invalidateQueries({ queryKey: categoryOptionKeys.all });
    client.invalidateQueries({ queryKey: productKeys.all });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryPayload) =>
      editing ? updateCategory(editing.id, payload) : createCategory(payload),
    onSuccess: () => {
      invalidateCategories();
      closeForm();
    },
    onError: (error) => setFormError(errorText(error, "The category could not be saved.")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidateCategories,
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

  const openEdit = (category: Category) => {
    setEditing(category);
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

  const handleDelete = (category: Category) => {
    if (window.confirm(`Delete "${category.name}"? This cannot be undone. Categories with child categories or products will block the deletion.`)) {
      removeMutation.mutate(category.id);
    }
  };

  const rows = categoriesQuery.data?.data ?? [];
  const pagination = categoriesQuery.data?.pagination;
  const allCategories = optionsQuery.data ?? [];
  const nameById = new Map(allCategories.map((category) => [category.id, category.name]));
  const parentOptions = allCategories.filter((category) => category.parentId === null);
  const hasFilters = Boolean(search || activeFilter || parentFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Taxonomy and hierarchical watch groupings</p>
        </div>
        <Button leftIcon={<FiPlus className="h-4 w-4" />} onClick={openCreate}>
          New Category
        </Button>
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <Input
            name="search"
            label="Search"
            key={`search-${search}`}
            defaultValue={search}
            placeholder="Category name"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

          <label className="block text-sm font-medium text-slate-700">
            Parent
            <select
              className={selectClass}
              value={parentFilter}
              onChange={(event) => updateParams({ parentId: event.target.value })}
            >
              <option value="">All categories</option>
              <option value="null">Top level only</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

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
        <ErrorState title="Could not delete category" message={errorText(removeMutation.error)} />
      )}
<Card className="p-0">
        {categoriesQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : categoriesQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load categories"
              message={errorText(categoriesQuery.error)}
              onRetry={() => categoriesQuery.refetch()}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((category) => (
                  <tr key={category.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{category.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">/{category.slug}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {category.parentId ? (nameById.get(category.parentId) ?? "—") : "Top level"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{category.sortOrder}</td>
                    <td className="px-4 py-4">
                      <Badge variant={category.isActive ? "success" : "default"}>
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${category.name}`}
                          onClick={() => openEdit(category)}
                        >
                          <FiEdit2 />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          aria-label={`Delete ${category.name}`}
                          onClick={() => handleDelete(category)}
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
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} categories
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
        title={editing ? "Edit category" : "New category"}
        subtitle={editing ? editing.name : "Group watches into a browsable taxonomy"}
      >
        {formError && (
          <div className="mb-4">
            <ErrorState title="Could not save category" message={formError} />
          </div>
        )}
        <CategoryForm
          categories={allCategories}
          category={editing ?? undefined}
          onSubmit={(payload) => saveMutation.mutate(payload)}
          submitting={saveMutation.isPending}
          submitLabel={editing ? "Save changes" : "Create category"}
          onCancel={closeForm}
        />
      </Modal>
    </div>
  );
}