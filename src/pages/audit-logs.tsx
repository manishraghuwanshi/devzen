import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FiActivity, FiChevronLeft, FiChevronRight, FiRotateCcw, FiSearch } from "react-icons/fi";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { ErrorState } from "../components/ui/error-state.tsx";
import { Input } from "../components/ui/input.tsx";
import { Spinner } from "../components/ui/spinner.tsx";
import { AuditLogTable } from "../features/audit-logs/audit-log-table.tsx";
import {
  auditLogKeys,
  listAuditActions,
  listAuditLogs,
  type AuditLogListParams,
} from "../features/audit-logs/api.ts";
import { ApiError } from "../lib/api-error.ts";

const selectClass =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

function errorText(error: unknown, fallback = "Please try again."): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * Audit trail.
 *
 * Read-only, and permission-scoped server-side: `auditLogs.read` (owner) sees every
 * actor while `auditLogs.readLimited` (manager) is restricted to the caller's own
 * rows by the backend `WHERE` clause — so one page serves both roles with no special
 * cases. Filters live in the URL and each row expands to its redacted metadata.
 */
export default function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = positiveInt(searchParams.get("page"), 1);
  const limit = positiveInt(searchParams.get("limit"), 20);
  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entityType") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sort = (searchParams.get("sort") ?? "createdAt") as AuditLogListParams["sort"];
  const order = (searchParams.get("order") ?? "desc") as AuditLogListParams["order"];

  const params: AuditLogListParams = {
    page,
    limit,
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(dayStart(from) ? { from: dayStart(from)! } : {}),
    ...(dayEnd(to) ? { to: dayEnd(to)! } : {}),
    sort,
    order,
  };

  const logsQuery = useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => listAuditLogs(params),
  });

  const actionsQuery = useQuery({
    queryKey: auditLogKeys.actions,
    queryFn: listAuditActions,
    staleTime: 5 * 60 * 1000,
  });

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
    const read = (name: string) =>
      ((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();
    updateParams({
      entityType: read("entityType") || null,
      from: read("from") || null,
      to: read("to") || null,
    });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const logs = logsQuery.data?.data ?? [];
  const pagination = logsQuery.data?.pagination;
  const hasFilters = Boolean(action || entityType || from || to);

  return (
<div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Immutable chronological trail of security &amp; catalog actions</p>
      </div>

      <Card>
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700">
            Action
            <select
              className={selectClass}
              value={action}
              onChange={(event) => updateParams({ action: event.target.value })}
            >
              <option value="">All actions</option>
              {(actionsQuery.data?.data ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <Input
            name="entityType"
            label="Entity type"
            key={`entity-${entityType}`}
            defaultValue={entityType}
            placeholder="e.g. product"
            leftIcon={<FiSearch className="h-4 w-4" />}
          />

          <Input name="from" label="From" type="date" key={`from-${from}`} defaultValue={from} />
          <Input name="to" label="To" type="date" key={`to-${to}`} defaultValue={to} />

          <label className="block text-sm font-medium text-slate-700">
            Sort
            <select
              className={selectClass}
              value={`${sort}:${order}`}
              onChange={(event) => {
                const [nextSort, nextOrder] = event.target.value.split(":");
                updateParams({ sort: nextSort, order: nextOrder });
              }}
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="action:asc">Action A-Z</option>
              <option value="action:desc">Action Z-A</option>
            </select>
          </label>

          <div className="flex items-end gap-2 lg:col-span-3">
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
        {logsQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : logsQuery.isError ? (
          <div className="p-6">
            <ErrorState
              title="Could not load audit logs"
              message={errorText(logsQuery.error)}
              onRetry={() => logsQuery.refetch()}
            />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FiActivity className="h-8 w-8 text-slate-400" />}
              title={hasFilters ? "No audit entries match these filters" : "No audit activity yet"}
              description={
                hasFilters
                  ? "Adjust or reset the filters to widen the search."
                  : "Security and catalog actions will appear here as they happen."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <AuditLogTable logs={logs} />
        )}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
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
    </div>
  );
}

function positiveInt(raw: string | null, fallback: number): number {
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * The backend parses `from`/`to` with `z.coerce.date()`, so a bare `2026-10-07`
 * becomes midnight UTC. Sending the raw date input value would therefore exclude
 * everything that happened *on* the selected "to" day. Widen the picks to the full
 * day — start of the `from` day, end of the `to` day — so the filter matches what
 * the label promises.
 */
function dayStart(date: string): string | null {
  return toIsoDay(date, 0);
}

function dayEnd(date: string): string | null {
  return toIsoDay(date, 1);
}

function toIsoDay(date: string, dayOffset: 0 | 1): string | null {
  if (!date) return null;

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  if (dayOffset === 1) {
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    parsed.setUTCMilliseconds(-1);
  }

  return parsed.toISOString();
}
