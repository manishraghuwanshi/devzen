import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { CURRENCIES, formatMoney, normalizeCurrency } from "../../lib/money.ts";
import type { Brand, Category } from "../../types/models.ts";
import type { ProductFormValues } from "./product-types.ts";

const schema = z.object({
  brandId: z.string().uuid("Choose a brand"), name: z.string().trim().min(1, "Name is required").max(200),
  slug: z.string().trim().min(1, "Slug is required").max(120), sku: z.string().trim().min(1, "SKU is required").max(100),
  shortDescription: z.string().max(2000).nullable().optional(), description: z.string().max(20000).nullable().optional(),
  price: z.coerce.number().int("Whole numbers only").min(0, "Must be 0 or more"), compareAtPrice: z.coerce.number().int("Whole numbers only").min(0, "Must be 0 or more").nullable().optional(), currency: z.string().length(3),
  isFeatured: z.boolean(), isActive: z.boolean(), categoryIds: z.array(z.string().uuid()),
  inventory: z.object({ quantity: z.coerce.number().int().min(0), reservedQuantity: z.coerce.number().int().min(0), lowStockThreshold: z.coerce.number().int().min(0) }),
}).refine((value) => value.compareAtPrice == null || value.compareAtPrice >= value.price, { path: ["compareAtPrice"], message: "Must be at least the price" })
  .refine((value) => value.inventory.reservedQuantity <= value.inventory.quantity, { path: ["inventory", "reservedQuantity"], message: "Cannot exceed stock quantity" });

const emptyProduct: ProductFormValues = { brandId: "", name: "", slug: "", sku: "", shortDescription: null, description: null, price: 0, compareAtPrice: null, currency: "INR", isFeatured: false, isActive: true, categoryIds: [], inventory: { quantity: 0, reservedQuantity: 0, lowStockThreshold: 5 } };

/** Currencies offered in the picker; any other stored code is appended at runtime. */

export function ProductForm({ initialValues = emptyProduct, brands, categories, onSubmit, submitting, submitLabel }: { initialValues?: ProductFormValues; brands: Brand[]; categories: Category[]; onSubmit: (values: ProductFormValues) => void; submitting: boolean; submitLabel: string }) {
  // React Compiler memoises `register()`'s change/blur handlers together with the
  // values they close over, so react-hook-form ends up reading stale values and Zod
  // reports required fields as empty. Opt this form out of compilation.
  "use no memo";
  const { register, handleSubmit, reset, getValues, setValue, formState: { errors } } = useForm<ProductFormValues>({ resolver: zodResolver(schema) as unknown as Resolver<ProductFormValues>, defaultValues: initialValues });
  useEffect(() => reset(initialValues), [initialValues, reset]);
  const makeSlug = () => {
    const name = getValues("name");
    const slug = getValues("slug");
    if (!slug || slug === initialValues.slug) setValue("slug", name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };
  const error = (path: keyof typeof errors) => errors[path]?.message as string | undefined;
  // The backend stores prices as whole currency units (its `docs/database.md`: ₹12,999
  // is stored as `12999`), so the field is a plain amount — no scaling anywhere. The
  // helper text spells that out so a mistyped magnitude is obvious before saving.
  // Any currency already stored on the product stays selectable, so opening an edit
  // never silently rewrites a currency that is not in the shortlist.
  const storedCurrency = initialValues.currency ?? "INR";
  const currencyChoices = CURRENCIES.includes(storedCurrency)
    ? CURRENCIES
    : [storedCurrency, ...CURRENCIES];
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
    <section className="grid gap-4 md:grid-cols-2">
      <Input label="Product name" {...register("name", { onBlur: makeSlug })} error={error("name")} />
      <Input label="SKU" {...register("sku")} error={error("sku")} />
      <Input label="Slug" helperText="URL-friendly identifier" {...register("slug")} error={error("slug")} />
      <label className="block text-sm font-medium text-slate-700">Brand<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...register("brandId")}><option value="">Select a brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>{errors.brandId && <span className="mt-1 text-xs text-red-600">{errors.brandId.message}</span>}</label>
      <Input label="Price" type="number" step="1" min="0" helperText={`Whole ${normalizeCurrency(storedCurrency)} units — 12999 reads as ${formatMoney(12999, storedCurrency)}`} {...register("price")} error={error("price")} />
      <Input label="Compare-at price" type="number" step="1" min="0" {...register("compareAtPrice", { setValueAs: (value) => value === "" ? null : Number(value) })} error={error("compareAtPrice")} />
      <label className="block text-sm font-medium text-slate-700">Currency<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...register("currency")}>{currencyChoices.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
      <label className="block text-sm font-medium text-slate-700">Categories<select multiple className="mt-1.5 block min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" {...register("categoryIds")}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Use Ctrl/Cmd to choose more than one.</span></label>
    </section>
    <div className="grid gap-4 md:grid-cols-3"><Input label="Stock quantity" type="number" min="0" {...register("inventory.quantity")} error={errors.inventory?.quantity?.message} /><Input label="Reserved stock" type="number" min="0" {...register("inventory.reservedQuantity")} error={errors.inventory?.reservedQuantity?.message} /><Input label="Low-stock threshold" type="number" min="0" {...register("inventory.lowStockThreshold")} error={errors.inventory?.lowStockThreshold?.message} /></div>
    <div><label htmlFor="shortDescription" className="block text-sm font-medium text-slate-700">Short description</label><textarea id="shortDescription" rows={2} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("shortDescription", { setValueAs: (value) => value || null })} /></div>
    <div><label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label><textarea id="description" rows={5} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" {...register("description", { setValueAs: (value) => value || null })} /></div>
    <div className="flex flex-wrap gap-5 text-sm text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" {...register("isActive")} /> Active</label><label className="flex items-center gap-2"><input type="checkbox" {...register("isFeatured")} /> Featured</label></div>
    <Button type="submit" isLoading={submitting}>{submitLabel}</Button>
  </form>;
}
