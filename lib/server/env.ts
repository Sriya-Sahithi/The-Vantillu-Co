/** Server-only configuration. Every secret comes from the environment; nothing is hard-coded. */

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = read(name);
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = {
  get databaseUrl() { return read("DATABASE_URL"); },
  get databaseCaCert() { return read("DATABASE_CA_CERT"); },
  get databasePoolMax() { return Number(read("DATABASE_POOL_MAX") ?? 3); },
  get razorpayKeyId() { return read("RAZORPAY_KEY_ID"); },
  get razorpayKeySecret() { return read("RAZORPAY_KEY_SECRET"); },
  get razorpayWebhookSecret() { return read("RAZORPAY_WEBHOOK_SECRET"); },
  get sessionSecret() { return read("SESSION_SECRET"); },
  get resendApiKey() { return read("RESEND_API_KEY"); },
  get emailFrom() { return read("EMAIL_FROM"); },
  get adminNotifyEmail() { return read("ADMIN_NOTIFY_EMAIL"); },
  get adminBootstrapEmails() {
    return (read("ADMIN_BOOTSTRAP_EMAILS") ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  },
  get cronSecret() { return read("CRON_SECRET"); },
  get siteUrl() { return (read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, ""); },
  get isProduction() { return process.env.NODE_ENV === "production"; },
};

/** HMAC key for OTP hashing. Required in production; a fixed dev value is used locally only. */
export function sessionSecret(): string {
  const secret = env.sessionSecret;
  if (secret && secret.length >= 32) return secret;
  if (env.isProduction) throw new Error("SESSION_SECRET (min 32 chars) is required in production.");
  return "development-only-secret-do-not-use-in-production";
}
