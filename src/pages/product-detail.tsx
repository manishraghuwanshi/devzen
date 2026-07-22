import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { Badge } from "../components/ui/badge.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardHeader } from "../components/ui/card.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { deleteProduct, getProduct, productKeys } from "../features/products/api.ts";
import { ProductImages } from "../features/products/product-images.tsx";
import { availableQuantity } from "../features/products/product-types.ts";
import { useAuth } from "../features/auth/use-auth.ts";
import { formatMoney } from "../lib/money.ts";
import { ApiError } from "../lib/api-error.ts";

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { hasPermission } = useAuth();

  const product = useQuery({
    queryKey: productKeys.detail(id ?? ""),
    queryFn: () => getProduct(id!),
    enabled: Boolean(id),
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteProduct(id!),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: productKeys.all });
      navigate("/products");
    },
  });

  if (product.isLoading) {
    return (
      <Card className="flex justify-center p-12">
        <Spinner />
      </Card>
    );
  }

  if (product.isError || !product.data) {
    const notFound = product.error instanceof ApiError && product.error.isNotFound;

    return (
      <div className="space-y-6">
        <Link to="/products" className="text-sm text-blue-600 hover:underline">
          ← Back to products
        </Link>
        <ErrorState
          title={notFound ? "Product not found" : "Could not load the product"}
          message={notFound ? "It may have been deleted." : errorText(product.error)}
          onRetry={notFound ? undefined : () => product.refetch()}
          action={
            notFound ? (
              <Link to="/products">
                <Button variant="outline" size="sm">
                  Back to products
                </Button>
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  const data = product.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/products" className="text-sm text-blue-600 hover:underline">
            ← Back to products
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{data.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={data.isActive ? "success" : "default"}>
              {data.isActive ? "Active" : "Inactive"}
            </Badge>
            {data.isFeatured && <Badge variant="purple">Featured</Badge>}
            <span className="text-xs text-slate-500">SKU {data.sku}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {hasPermission("products.write") && (
            <Link to={`/products/${data.id}/edit`}>
              <Button variant="outline" leftIcon={<FiEdit2 className="h-4 w-4" />}>
                Edit
              </Button>
            </Link>
          )}
          {hasPermission("products.delete") && (
            <Button
              variant="danger"
              leftIcon={<FiTrash2 className="h-4 w-4" />}
              isLoading={removeMutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${data.name}"? Its images and inventory record are removed too. This cannot be undone.`)) removeMutation.mutate();
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {removeMutation.isError && (
        <ErrorState title="Could not delete product" message={errorText(removeMutation.error)} />
      )}

      <Card>
        <CardHeader title="Overview" subtitle="Catalog pricing and identity" />
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Price" value={formatMoney(data.price, data.currency)} />
          <Detail
            label="Compare-at price"
            value={data.compareAtPrice != null ? formatMoney(data.compareAtPrice, data.currency) : "—"}
          />
          <Detail label="Currency" value={data.currency} />
          <Detail label="Brand" value={data.brand?.name ?? "—"} />
          <Detail label="Slug" value={data.slug} />
          <Detail label="Created" value={new Date(data.createdAt).toLocaleString()} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail
              label="Categories"
              value={data.categories.length ? data.categories.map((category) => category.name).join(", ") : "—"}
            />
          </div>
        </div>
        {data.shortDescription && <p className="mt-4 text-sm text-slate-600">{data.shortDescription}</p>}
        {data.description && (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{data.description}</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Inventory" subtitle="Stock levels carried by the product" />
        {data.inventory ? (
          <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Quantity" value={String(data.inventory.quantity)} />
            <Detail label="Reserved" value={String(data.inventory.reservedQuantity)} />
            <Detail label="Available" value={String(availableQuantity(data.inventory))} />
            <Detail label="Low-stock threshold" value={String(data.inventory.lowStockThreshold)} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">No inventory record for this product.</p>
        )}
      </Card>

      <ProductImages productId={data.id} canManage={hasPermission("images.manage")} />

    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}