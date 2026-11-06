import { clearSession, getOrganisation, getToken, getWorkspaceEnvironment } from "./session";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api/v1";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
};

function resolveApiBase(): string {
  if (/^https?:\/\//i.test(API_URL)) {
    return API_URL;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8443";
  return new URL(API_URL.startsWith("/") ? API_URL : `/${API_URL}`, origin).toString().replace(/\/$/, "");
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${resolveApiBase()}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const useAuth = options.auth !== false;
  const token = getToken();
  if (useAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const organisation = getOrganisation();
  if (useAuth && organisation?.id) {
    headers["X-Organisation-Id"] = String(organisation.id);
  }

  if (useAuth) {
    headers["X-Environment"] = getWorkspaceEnvironment();
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (response.status === 401 && useAuth && token) {
    clearSession();
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export type ApiData<T> = { data: T };
