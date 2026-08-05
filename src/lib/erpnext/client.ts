import { getErpnextConfig } from "./config";

export class ErpnextError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ErpnextError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | undefined>;
  body?: unknown;
  /** Frappe session id — when present, authenticates as that customer's session instead of the admin API key. */
  sid?: string;
};

function buildUrl(base: string, path: string, params?: RequestOptions["params"]) {
  const url = new URL(base + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return url;
}

export async function erpRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const config = getErpnextConfig();
  if (!config) throw new ErpnextError("ERPNext belum dikonfigurasi", 503);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.sid) {
    // Customer-specific actions run as that customer's own Frappe session,
    // not the admin API key, so ERPNext enforces that user's real permissions.
    headers.Cookie = `sid=${opts.sid}`;
  } else {
    headers.Authorization = `token ${config.apiKey}:${config.apiSecret}`;
  }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(config.url, path, opts.params), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ErpnextError(
      `ERPNext ${path} gagal (${res.status}): ${text.slice(0, 500)}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

export function jsonFields(fields: string[]): string {
  return JSON.stringify(fields);
}

export function jsonFilters(filters: unknown[]): string {
  return JSON.stringify(filters);
}

// ERPNext's dates are entered in the business's own timezone (Asia/Jakarta,
// UTC+7), not UTC — using `new Date().toISOString()` on the server would
// compare against the wrong day for several hours around midnight WIB.
export function erpToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
