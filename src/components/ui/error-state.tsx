import type { ReactNode } from "react";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { Button } from "./button.tsx";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while communicating with the server.",
  onRetry,
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/40 p-6 text-center ${className}`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
        <FiAlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-red-700">{message}</p>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<FiRefreshCw className="h-3.5 w-3.5" />}
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
