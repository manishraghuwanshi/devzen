import type { ApiErrorBody } from "../types/api.ts";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    status: number,
    errorBody: ApiErrorBody,
    requestId?: string
  ) {
    super(errorBody.message || "An unexpected error occurred");
    this.name = "ApiError";
    this.status = status;
    this.code = errorBody.code || "APP_ERROR";
    this.details = errorBody.details;
    this.requestId = requestId;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}
