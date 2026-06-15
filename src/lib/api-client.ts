import { ApiError } from "./api-error.ts";
import type { ApiResponse, ApiSuccessResponse, PaginationMeta } from "../types/api.ts";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  skipAuthRefresh?: boolean;
}

export interface RequestResult<T> {
  data: T;
  pagination?: PaginationMeta;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const url = `${BASE_URL}/api/auth/refresh`;
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<RequestResult<T>> {
  const { params, body, headers, skipAuthRefresh = false, ...restOptions } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  let serializedBody: string | undefined;
  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      credentials: "include",
      headers: requestHeaders,
      body: serializedBody,
    });
  } catch (err) {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network error, please check connection",
    });
  }

  // Intercept 401 and attempt one-time silent refresh unless on auth endpoints
  if (response.status === 401 && !skipAuthRefresh && !endpoint.includes("/api/auth/")) {
    const refreshOk = await attemptTokenRefresh();
    if (refreshOk) {
      return apiClient<T>(endpoint, { ...options, skipAuthRefresh: true });
    }
  }

  const requestId = response.headers.get("x-request-id") || undefined;
  let json: ApiResponse<T>;

  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      {
        code: "INVALID_JSON_RESPONSE",
        message: `Server returned HTTP ${response.status} with non-JSON body`,
      },
      requestId
    );
  }

  if (!response.ok || !json.success) {
    const errorBody = !json.success && json.error
      ? json.error
      : { code: "HTTP_ERROR", message: `Request failed with HTTP status ${response.status}` };

    throw new ApiError(response.status, errorBody, (!json.success && json.requestId) || requestId);
  }

  const successPayload = json as ApiSuccessResponse<T>;
  return {
    data: successPayload.data,
    pagination: successPayload.pagination,
  };
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method">) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
