import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");
export const hmacHex = (secret: string, value: string | Buffer) => createHmac("sha256", secret).update(value).digest("hex");

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time string comparison; false for differing lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function randomOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

const ORDER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** e.g. VC-7K3M9QXP. 31^8 ≈ 8.5e11 combinations, so numbers cannot be enumerated. */
export function randomOrderNumber(): string {
  let out = "";
  for (let i = 0; i < 8; i += 1) out += ORDER_ALPHABET[randomInt(0, ORDER_ALPHABET.length)];
  return `VC-${out}`;
}
