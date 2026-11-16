import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { processWebhook } from "@/lib/server/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // The signature is computed over the exact raw bytes, so the body is read as text and never re-serialised.
  const rawBody = await req.text();
  if (rawBody.length > 512 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!verifyWebhookSignature(rawBody, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  try {
    const result = await processWebhook(rawBody, req.headers.get("x-razorpay-event-id"));
    return NextResponse.json({ status: result });
  } catch (error) {
    console.error("Webhook processing failed", { message: error instanceof Error ? error.message : "unknown" });
    // Non-2xx makes Razorpay retry, which is safe because processing is idempotent.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
