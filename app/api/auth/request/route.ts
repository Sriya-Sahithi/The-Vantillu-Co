import { createOtp } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { badRequest, clientIp, readJson, route } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { normalizeEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!email) throw badRequest("Enter a valid email address.", { email: "Enter a valid email address." });
  const db = getDb();
  await rateLimit(db, `otp-ip:${clientIp(req)}`, 15, 3600);
  await rateLimit(db, `otp-email:${email}`, 5, 3600);
  const code = await createOtp(db, email);
  if (env.resendApiKey && env.emailFrom) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [email],
        subject: `Your Vantillu Co. sign-in code: ${code}`,
        text: `Your sign-in code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!response?.ok) {
      console.error("Could not send sign-in email", { status: response?.status });
      throw new Error("email delivery failed");
    }
  } else if (!env.isProduction) {
    // Local development only: no email provider configured, so the code is printed to the server console.
    console.info(`[dev] sign-in code for ${email}: ${code}`);
  } else {
    throw new Error("Email provider is not configured");
  }
  return { sent: true };
});
