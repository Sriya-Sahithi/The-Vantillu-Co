export class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal; formData?: FormData } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? (init.body !== undefined || init.formData ? "POST" : "GET"),
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.formData ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      credentials: "same-origin",
      cache: "no-store",
      signal: init.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ClientApiError(0, "network", "We could not reach the server. Please check your connection and try again.");
  }
  const data = (await response.json().catch(() => null)) as { error?: { code: string; message: string; fields?: Record<string, string> } } | null;
  if (!response.ok) {
    throw new ClientApiError(response.status, data?.error?.code ?? "error", data?.error?.message ?? "Something went wrong. Please try again.", data?.error?.fields);
  }
  return data as T;
}

export function safeNext(value: string | null | undefined, fallback = "/account"): string {
  return value && /^\/(?!\/)[A-Za-z0-9/_\-?=&%.]*$/.test(value) ? value : fallback;
}

const GUEST_ORDERS_KEY = "vantillu-orders";
export function rememberOrder(orderNumber: string, token: string) {
  try {
    const list: { orderNumber: string; token: string }[] = JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) ?? "[]");
    const next = [{ orderNumber, token }, ...list.filter((o) => o.orderNumber !== orderNumber)].slice(0, 20);
    localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the emailed link and order lookup still work */
  }
}
