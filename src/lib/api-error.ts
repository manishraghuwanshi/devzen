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

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidationError(): boolean {
    return this.status === 400 && this.code === "VALIDATION_ERROR";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}
