import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Textarea } from "../../components/ui/textarea.tsx";
import type { Brand } from "../../types/models.ts";
import type { BrandPayload } from "./api.ts";

/**
 * Mirrors `brandBodySchema` in the backend so the same rules are applied before the
 * request leaves the browser. `websiteUrl` accepts an empty string (the backend
 * normalises it to `null`).
 */
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
  websiteUrl: z.union([z.url("Enter a valid URL"), z.literal("")]).optional(),
  description: z.string().max(5000).nullable().optional(),
  isActive: z.boolean(),
});

type BrandFormValues = z.infer<typeof schema>;

const emptyValues: BrandFormValues = {
  name: "",
  slug: "",
  websiteUrl: "",
  description: null,
  isActive: true,
};

function brandToFormValues(brand: Brand): BrandFormValues {
  return {
    name: brand.name,
    slug: brand.slug,
    websiteUrl: brand.websiteUrl ?? "",
    description: brand.description,
    isActive: brand.isActive,
  };
}

export function BrandForm({
  brand,
  onSubmit,
  submitting,
  submitLabel,
  onCancel,
}: {
  /** The brand being edited, or `undefined` to create a new one. */
  brand?: Brand;
  onSubmit: (payload: BrandPayload) => void;
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  // React Compiler memoises `register()`'s change/blur handlers together with the
  // values they close over, so react-hook-form ends up reading stale values and Zod
  // reports required fields as empty. Opt this form out of compilation.
  "use no memo";
  const initialValues = useMemo(() => (brand ? brandToFormValues(brand) : emptyValues), [brand]);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<BrandFormValues>,
    defaultValues: initialValues ?? emptyValues,
  });

  useEffect(() => reset(initialValues ?? emptyValues), [initialValues, reset]);

  const makeSlug = () => {
    const currentSlug = getValues("slug");
    if (currentSlug) return;
    const name = getValues("name");
    setValue(
      "slug",
      name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    );
  };

  const submit = (values: BrandFormValues) =>
    onSubmit({
      name: values.name,
      slug: values.slug,
      description: values.description?.trim() ? values.description : null,
      websiteUrl: values.websiteUrl?.trim() ? values.websiteUrl.trim() : "",
      isActive: values.isActive,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label="Name" placeholder="e.g. Seiko" {...register("name", { onBlur: makeSlug })} error={errors.name?.message} />
      <Input label="Slug" helperText="URL-friendly identifier" {...register("slug")} error={errors.slug?.message} />
      <Input label="Website" placeholder="https://example.com" {...register("websiteUrl")} error={errors.websiteUrl?.message} />
      <Textarea label="Description" rows={4} {...register("description", { setValueAs: (value) => value || null })} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register("isActive")} /> Active
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}