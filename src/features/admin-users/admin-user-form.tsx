import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";

const baseSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["owner", "manager", "editor"]),
  password: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

/** Password becomes mandatory on create; on edit it is hidden entirely. */
const createSchema = baseSchema.extend({
  password: z.string().min(1, "Password is required").max(200),
});

export type AdminUserFormValues = z.infer<typeof baseSchema>;

/**
 * `password` is required only when creating: `PATCH /api/admin-users/:id` has no
 * password field, so on edit the input is hidden and rotation goes through the
 * dedicated `PUT /:id/password` endpoint (the "Change password" row action).
 */
export function AdminUserForm({
  initialValues,
  onSubmit,
  submitting,
  submitLabel,
  requirePassword = true,
  onCancel,
}: {
  initialValues?: AdminUserFormValues;
  onSubmit: (values: AdminUserFormValues) => void;
  submitting: boolean;
  submitLabel: string;
  requirePassword?: boolean;
  onCancel?: () => void;
}) {
  // React Compiler memoises `register()`'s change/blur handlers together with the
  // values they close over, so react-hook-form ends up reading stale values and Zod
  // reports required fields as empty. Opt this form out of compilation.
  "use no memo";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminUserFormValues>({
    resolver: zodResolver(requirePassword ? createSchema : baseSchema) as unknown as Resolver<AdminUserFormValues>,
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  // A role change revokes that administrator's live sessions server-side, so it is
  // worth flagging before the change is saved rather than surprising them later.
  // Tracked with local state rather than `watch()`, which the React Compiler cannot
  // memoise and which this file already opts out of.
  const [role, setRole] = useState<AdminUserFormValues["role"]>(initialValues?.role ?? "editor");
  const roleChanged = Boolean(initialValues && role !== initialValues.role);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Email Address" type="email" {...register("email")} error={errors.email?.message} />
        <Input label="Full Name" {...register("name")} error={errors.name?.message} />
        <label className="block text-sm font-medium text-slate-700">
          Role
          <select
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            {...register("role", { onChange: (event) => setRole(event.target.value as AdminUserFormValues["role"]) })}
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="editor">Editor</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {roleChanged ? "Changing the role revokes this account's active sessions." : "Determines the permissions this account holds."}
          </span>
          {errors.role && <span className="mt-1 block text-xs font-medium text-red-600">{errors.role.message}</span>}
        </label>
        {requirePassword && (
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            error={errors.password?.message}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register("isActive")} />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}