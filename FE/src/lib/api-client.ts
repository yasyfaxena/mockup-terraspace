import { forwardedRequestHeaders } from "@/shared/forwarded-headers";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export type ApiErrorDetail = { path: string; message: string };

/**
 * Mirrors BE's error envelope (docs/V2/BE/error-handling.md §3):
 * { error: { code, message, requestId, details } }
 */
export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;
  details: ApiErrorDetail[] | null;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId: string,
    details: ApiErrorDetail[] | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: ApiErrorDetail[] | null;
  };
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...forwardedRequestHeaders(),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body: ErrorEnvelope | null = await res.json().catch(() => null);
    const err = body?.error;
    throw new ApiError(
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "Something went wrong.",
      res.status,
      err?.requestId ?? "",
      err?.details ?? null,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function withBody(body: unknown): RequestInit {
  return body === undefined ? {} : { body: JSON.stringify(body) };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", ...withBody(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", ...withBody(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
