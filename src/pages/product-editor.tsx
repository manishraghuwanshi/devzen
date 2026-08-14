import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card } from "../components/ui/card.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { createProduct, getProduct, listBrands, listCategories, productKeys, updateProduct } from "../features/products/api.ts";
import { brandOptionKeys } from "../features/brands/api.ts";
import { categoryOptionKeys } from "../features/categories/api.ts";
import { useAuth } from "../features/auth/use-auth.ts";
import { ApiError } from "../lib/api-error.ts";
import { ProductForm } from "../features/products/product-form.tsx";
import { productToFormValues, type ProductFormValues } from "../features/products/product-types.ts";

export default function ProductEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { hasPermission } = useAuth();
  const editing = Boolean(id);

  // The brand/category selectors read data guarded by their own permissions, so the
  // requests (and the shared cache they prime) only run when the admin may read them.
  const canReadBrands = hasPermission("brands.manage");
  const canReadCategories = hasPermission("categories.manage");

  const product = useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => getProduct(id!),
    enabled: editing,
  });

  const brands = useQuery({
    queryKey: brandOptionKeys.all,
    queryFn: () => listBrands(),
    enabled: canReadBrands,
  });

  const categories = useQuery({
    queryKey: categoryOptionKeys.active,
    queryFn: () => listCategories(true),
    enabled: canReadCategories,
  });

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      editing ? updateProduct(id!, values) : createProduct(values),
    onSuccess: (saved) => {
      client.invalidateQueries({ queryKey: productKeys.all });
      navigate(`/products/${saved.id}`);
    },
  });

  const isLoading =
    product.isLoading ||
    (canReadBrands && brands.isLoading) ||
    (canReadCategories && categories.isLoading);
  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;

  const isError =
    product.isError ||
    (canReadBrands && brands.isError) ||
    (canReadCategories && categories.isError);
  if (isError) {
    return (
      <ErrorState
        title="Could not load the product form"
        onRetry={() => {
          product.refetch();
          brands.refetch();
          categories.refetch();
        }}
      />
    );
  }

  const brandList = brands.data ?? [];
  const categoryList = categories.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={editing ? `/products/${id}` : "/products"}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {editing ? "Edit product" : "Add product"}
        </h1>
      </div>

      {mutation.isError && (
        <ErrorState title="Could not save product" message={saveErrorMessage(mutation.error)} />
      )}

      {canReadBrands && brandList.length === 0 ? (
        <ErrorState
          title="No brands available"
          message="Create a brand before adding products, then return to this form."
        />
      ) : (
        <Card>
          <ProductForm
            initialValues={editing && product.data ? productToFormValues(product.data) : undefined}
            brands={brandList}
            categories={categoryList}
            onSubmit={(values) => mutation.mutate(values)}
            submitting={mutation.isPending}
            submitLabel={editing ? "Save changes" : "Create product"}
          />
        </Card>
      )}
    </div>
  );
}

function saveErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Review the details and try again.";
}
