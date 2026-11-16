import { describe, expect, it } from "vitest";
import { normalizeMobile, isValidPincode, validateCheckoutFields, normalizeEmail } from "@/lib/validation";
import { rupeesToPaise, formatPaise } from "@/lib/money";
import { buildTimeline } from "@/lib/order-status";
import { goodFields } from "./helpers";

describe("mobile numbers", () => {
  it.each(["9876543210", "+91 98765 43210", "919876543210", "09876543210", "98765-43210", "6000000000"])("accepts %s", (m) => expect(normalizeMobile(m)).toMatch(/^[6-9]\d{9}$/));
  it.each(["", "12345", "5876543210", "98765432101", "abcdefghij", "+1 9876543210", "98765 4321", null, 9876543210])("rejects %s", (m) => expect(normalizeMobile(m)).toBeNull());
});

describe("PIN codes", () => {
  it.each(["500034", "110001"])("accepts %s", (p) => expect(isValidPincode(p)).toBe(true));
  it.each(["", "50003", "5000345", "012345", "50003a", " 500034"])("rejects %j", (p) => expect(isValidPincode(p)).toBe(false));
});

describe("checkout fields", () => {
  it("accepts a complete address, email optional", () => {
    const r = validateCheckoutFields({ ...goodFields, email: "", landmark: "" });
    expect(r.ok).toBe(true);
    expect(r.value.mobile).toBe("9876543210");
  });
  it("reports every missing mandatory field", () => {
    const r = validateCheckoutFields({});
    expect(Object.keys(r.errors).sort()).toEqual(["city", "district", "fullName", "house", "mobile", "pincode", "state", "street"]);
  });
  it("rejects bad email, unknown state, markup characters", () => {
    const r = validateCheckoutFields({ ...goodFields, email: "x@", state: "Atlantis", fullName: "<script>" });
    expect(Object.keys(r.errors).sort()).toEqual(["email", "fullName", "state"]);
  });
  it("normalizes email", () => expect(normalizeEmail("  A@B.Com ")).toBe("a@b.com"));
});

describe("money", () => {
  it("parses rupees exactly", () => {
    expect(rupeesToPaise("249.50")).toBe(24950);
    expect(rupeesToPaise("0.30")).toBe(30);
    expect(rupeesToPaise("1e3")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("1.234")).toBeNull();
  });
  it("formats", () => expect(formatPaise(24950)).toBe("₹249.50"));
});

describe("timeline", () => {
  it("does not invent steps for cancelled orders", () => {
    const t = buildTimeline("cancelled", "2026-01-01T00:00:00Z", [{ to_status: "cancelled", created_at: "2026-01-01T01:00:00Z" }]);
    expect(t.map((s) => s.key)).toEqual(["placed", "cancelled"]);
  });
  it("shows refund path after payment", () => {
    const t = buildTimeline("refunded", "2026-01-01T00:00:00Z", [
      { to_status: "paid", created_at: "2026-01-01T00:05:00Z" }, { to_status: "refund_initiated", created_at: "2026-01-02T00:00:00Z" }, { to_status: "refunded", created_at: "2026-01-03T00:00:00Z" },
    ]);
    expect(t.map((s) => s.key)).toEqual(["placed", "paid", "refund_initiated", "refunded"]);
    expect(t.at(-1)!.state).toBe("current");
  });
});
