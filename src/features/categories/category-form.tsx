import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Textarea } from "../../components/ui/textarea.tsx";
import type { Category } from "../../types/models.ts";
import type { CategoryPayload } from "./api.ts";

/**
 * Mirrors `categoryBodySchema`. `parentId` is an empty string in the select (meaning
 * "no parent") and is normalised to `null` before it is sent.
 */
const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
  parentId: z.string(),
  sortOrder: z.coerce.number().int().min(0, "Must be 0 or more").max(1_000_000),
  description: z.string().max(5000).nullable().optional(),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof schema>;

/** A category plus every category nested below it. */
function collectDescendantIds(rootId: string, categories: Category[]): Set<string> {
  const result = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id);
        changed = true;
      }
    }
  }

  return result;
}

function categoryToFormValues(category: Category): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? "",
    sortOrder: category.sortOrder,
    description: category.description,
    isActive: category.isActive,
  };
}

const emptyValues: CategoryFormValues = {
  name: "",
  slug: "",
  parentId: "",
  sortOrder: 0,
  description: null,
  isActive: true,
};

export function CategoryForm({
  categories,
  category,
  onSubmit,
  submitting,
  submitLabel,
  onCancel,
}: {
  categories: Category[];
  /** The category being edited, or `undefined` to create a new one. */
  category?: Category;
  onSubmit: (payload: CategoryPayload) => void;
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  // React Compiler memoises `register()`'s change/blur handlers together with the
  // values they close over, so react-hook-form ends up reading stale values and Zod
  // reports required fields as empty. Opt this form out of compilation.
  "use no memo";
  const initialValues = useMemo<CategoryFormValues>(
    () => (category ? categoryToFormValues(category) : emptyValues),
    [category],
  );
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CategoryFormValues>,
    defaultValues: initialValues,
  });

  useEffect(() => reset(initialValues), [initialValues, reset]);

  const makeSlug = () => {
    if (getValues("slug")) return;
    const name = getValues("name");
    setValue(
      "slug",
      name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    );
  };

  // A category cannot be its own parent, nor a descendant of itself, so those
  // options are hidden. The backend rejects such a choice anyway; this just keeps
  // the invalid options out of the picker.
  const blocked = category ? collectDescendantIds(category.id, categories) : new Set<string>();
  const parentOptions = categories.filter((option) => !blocked.has(option.id));

  const submit = (values: CategoryFormValues) =>
    onSubmit({
      name: values.name,
      slug: values.slug,
      parentId: values.parentId || null,
      sortOrder: values.sortOrder,
      description: values.description?.trim() ? values.description : null,
      isActive: values.isActive,
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input label="Name" placeholder="e.g. Automatic" {...register("name", { onBlur: makeSlug })} error={errors.name?.message} />
      <Input label="Slug" helperText="URL-friendly identifier" {...register("slug")} error={errors.slug?.message} />
      <label className="block text-sm font-medium text-slate-700">
        Parent category
        <select
          className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register("parentId")}
        >
          <option value="">No parent (top level)</option>
          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Sort order"
        type="number"
        min="0"
        step="1"
        helperText="Lower numbers come first"
        {...register("sortOrder")}
        error={errors.sortOrder?.message}
      />
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