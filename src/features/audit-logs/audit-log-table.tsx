import { Fragment, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Button } from "../../components/ui/button.tsx";
import type { AuditLog } from "./api.ts";

export interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-220 text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3">Time</th>
            <th className="px-3 py-3">Actor</th>
            <th className="px-3 py-3">Action</th>
            <th className="px-3 py-3">Entity</th>
            <th className="px-3 py-3">IP Address</th>
            <th className="px-3 py-3 text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const expanded = expandedId === log.id;
            const hasPayload = log.metadata !== null && log.metadata !== undefined;

            return (
              <Fragment key={log.id}>
                <tr className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-4 text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-4">
                    {log.actorName ? (
                      <>
                        <div className="font-medium text-slate-900">{log.actorName}</div>
                        {log.actorEmail && (
                          <div className="mt-0.5 text-xs text-slate-500">{log.actorEmail}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">System</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <span className="font-medium text-slate-700">{log.action}</span>
                  </td>
                  <td className="px-3 py-4">
                    {log.entityType ? (
                      <>
                        <div className="font-medium text-slate-500">{log.entityType}</div>
                        {log.entityId && (
                          <div className="text-xs text-slate-400">{log.entityId}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-slate-500">{log.ipAddress ?? "—"}</td>
                  <td className="px-3 py-4 text-right">
                    <Button
                      aria-label={
                        expanded ? `Hide details for ${log.action}` : `Show details for ${log.action}`
                      }
                      aria-expanded={expanded}
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                    >
                      {expanded ? <FiChevronUp /> : <FiChevronDown />}
                    </Button>
                  </td>
                </tr>
                {expanded && (
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <td colSpan={6} className="px-3 py-4">
                      <div className="space-y-2 text-xs text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">Entity id:</span>{" "}
                          {log.entityId ?? "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">User agent:</span>{" "}
                          {log.userAgent ?? "—"}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Metadata:</span>
                          <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                            {hasPayload ? JSON.stringify(log.metadata, null, 2) : "null"}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}