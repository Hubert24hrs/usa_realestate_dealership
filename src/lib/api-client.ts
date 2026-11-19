/** Small JSON fetch wrapper for client components talking to our own API routes. */
export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

export async function api<T = Record<string, unknown>>(url: string, init: Omit<RequestInit, "body"> & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = init;
  try {
    const res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error — check your connection." } as T & { error?: string } };
  }
}

/** Human-readable message for a failed call. */
export function apiError(result: ApiResult<unknown>, fallback = "Something went wrong. Please try again."): string {
  if (result.status === 401) return "Please sign in again.";
  if (result.status === 429) return "You're doing that a lot — please wait a moment.";
  return result.data.error ?? fallback;
}
