import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Textarea } from "../../components/ui/textarea.tsx";
import type { InventoryItem } from "../../types/models.ts";
import type { InventoryAdjustPayload, InventorySetPayload } from "./api.ts";

export type StockMode = "set" | "adjust";

const numberField = z.coerce.number().int("Whole numbers only").min(0, "Must be 0 or more");

/** Mirrors `inventorySetSchema` (absolute quantities). */
const setSchema = z
  .object({
    quantity: numberField,
    reservedQuantity: numberField,
    lowStockThreshold: numberField,
  })
  .refine((value) => value.reservedQuantity <= value.quantity, {
    path: ["reservedQuantity"],
    message: "Reserved cannot exceed quantity",
  });

/** Mirrors `inventoryAdjustSchema` (a non-zero delta). */
const adjustSchema = z.object({
  delta: z.coerce
    .number()
    .int("Whole numbers only")
    .refine((value) => value !== 0, { message: "Enter a non-zero adjustment" }),
  reason: z.string().max(500).optional(),
});

type SetValues = z.infer<typeof setSchema>;
type AdjustValues = z.infer<typeof adjustSchema>;

/** Absolute stock setter. Defaults are seeded from the current inventory row. */
export function SetStockForm({
  item,
  onSubmit,
  submitting,
  onCancel,
}: {
  item: InventoryItem;
  onSubmit: (payload: InventorySetPayload) => void;
  submitting: boolean;
  onCancel: () => void;
}) {
  // React Compiler memoises `register()`'s change/blur handlers together with the
  // values they close over, so react-hook-form can end up reading stale values. The
  // same opt-out is applied to every RHF form in this project.
  "use no memo";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetValues>({
    resolver: zodResolver(setSchema) as unknown as Resolver<SetValues>,
    defaultValues: {
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      lowStockThreshold: item.lowStockThreshold,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Quantity" type="number" min="0" step="1" {...register("quantity")} error={errors.quantity?.message} />
        <Input label="Reserved" type="number" min="0" step="1" {...register("reservedQuantity")} error={errors.reservedQuantity?.message} />
        <Input label="Low-stock threshold" type="number" min="0" step="1" {...register("lowStockThreshold")} error={errors.lowStockThreshold?.message} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          Save levels
        </Button>
      </div>
    </form>
  );
}

/**
 * Relative stock adjustment.
 *
 * A delta is safe under concurrency (the new value is computed inside the database
 * UPDATE), so this is preferred over the absolute setter for day-to-day restocking.
 */
export function AdjustStockForm({
  onSubmit,
  submitting,
  onCancel,
}: {
  onSubmit: (payload: InventoryAdjustPayload) => void;
  submitting: boolean;
  onCancel: () => void;
}) {
  // See `SetStockForm` above for why this form opts out of React Compiler.
  "use no memo";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema) as unknown as Resolver<AdjustValues>,
    defaultValues: { delta: 0, reason: "" },
  });

  const submit = (values: AdjustValues) =>
    onSubmit({ delta: values.delta, reason: values.reason?.trim() ? values.reason : undefined });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <Input
        label="Adjustment"
        type="number"
        step="1"
        helperText="Positive to add stock, negative to remove it"
        {...register("delta")}
        error={errors.delta?.message}
      />
      <Textarea label="Reason (optional)" rows={2} {...register("reason")} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          Apply adjustment
        </Button>
      </div>
    </form>
  );
}