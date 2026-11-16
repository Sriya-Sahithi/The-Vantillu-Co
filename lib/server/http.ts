import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new ApiError(400, "bad_request", message, fields);
export const unauthorized = (message = "Please sign in to continue.") => new ApiError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this.") => new ApiError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new ApiError(404, "not_found", message);
export const conflict = (message: string, code = "conflict") => new ApiError(409, code, message);

export function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function clientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

/** Reads a JSON object body with a hard size cap. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "too_large", "Request is too large.");
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

export function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite=Lax cookies). */
function assertSameOrigin(req: NextRequest | Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Invalid origin.");
  }
  if (originHost !== host) throw forbidden("Cross-site requests are not allowed.");
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response | Record<string, unknown>>;

/**
 * Wraps a route handler with same-origin checks for mutations and safe, generic error output.
 * Stack traces and internal messages never reach the client.
 */
export function route<C = unknown>(handler: Handler<C>, options: { csrf?: boolean } = {}) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      if (options.csrf !== false && !["GET", "HEAD", "OPTIONS"].includes(req.method)) assertSameOrigin(req);
      const result = await handler(req, ctx);
      return result instanceof Response ? result : json(result);
    } catch (error) {
      if (error instanceof ApiError) {
        return json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status });
      }
      console.error("Unhandled API error", {
        path: new URL(req.url).pathname,
        method: req.method,
        message: error instanceof Error ? error.message : "unknown",
        stack: env.isProduction ? undefined : error instanceof Error ? error.stack : undefined,
      });
      return json({ error: { code: "server_error", message: "Something went wrong. Please try again." } }, { status: 500 });
    }
  };
}

export { getDb };
