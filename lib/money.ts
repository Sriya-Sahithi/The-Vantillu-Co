/** All amounts in the system are integer paise. */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Strict rupee-string → paise conversion ("249", "249.5", "249.50"). Returns null if invalid. */
export function rupeesToPaise(input: string | number): number | null {
  const text = String(input).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function paiseToRupeeString(paise: number): string {
  return (paise / 100).toFixed(2).replace(/\.00$/, "");
}
