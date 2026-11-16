/** Validation shared by the browser (instant feedback) and the server (authoritative). */

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

/** Accepts 9876543210, +91 98765 43210, 91-9876543210, 09876543210. Returns the 10-digit number or null. */
export function normalizeMobile(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function isValidPincode(input: unknown): input is string {
  return typeof input === "string" && /^[1-9]\d{5}$/.test(input);
}

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

export type CheckoutFields = {
  fullName: string;
  mobile: string;
  email: string;
  house: string;
  street: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
};

export type FieldErrors = Partial<Record<keyof CheckoutFields, string>>;

const CONTROL_CHARS = /[\p{Cc}<>]/u;

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function checkText(errors: FieldErrors, key: keyof CheckoutFields, value: string, label: string, min: number, max: number, required = true) {
  if (!value) {
    if (required) errors[key] = `${label} is required.`;
    return;
  }
  if (value.length < min) errors[key] = `${label} looks too short.`;
  else if (value.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
  else if (CONTROL_CHARS.test(value)) errors[key] = `${label} contains characters that are not allowed.`;
}

export function validateCheckoutFields(raw: Partial<Record<keyof CheckoutFields, unknown>>): {
  ok: boolean;
  errors: FieldErrors;
  value: CheckoutFields;
} {
  const errors: FieldErrors = {};
  const value: CheckoutFields = {
    fullName: text(raw.fullName),
    mobile: "",
    email: "",
    house: text(raw.house),
    street: text(raw.street),
    landmark: text(raw.landmark),
    city: text(raw.city),
    district: text(raw.district),
    state: text(raw.state),
    pincode: typeof raw.pincode === "string" ? raw.pincode.trim() : "",
  };

  checkText(errors, "fullName", value.fullName, "Full name", 2, 80);
  const mobile = normalizeMobile(raw.mobile);
  if (!text(raw.mobile)) errors.mobile = "Mobile number is required.";
  else if (!mobile) errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  else value.mobile = mobile;

  const emailText = text(raw.email);
  if (emailText) {
    const email = normalizeEmail(emailText);
    if (!email) errors.email = "Enter a valid email address or leave it blank.";
    else value.email = email;
  }

  checkText(errors, "house", value.house, "House / flat number", 1, 100);
  checkText(errors, "street", value.street, "Street / area", 2, 120);
  checkText(errors, "landmark", value.landmark, "Landmark", 2, 100, false);
  checkText(errors, "city", value.city, "Village / town / city", 2, 80);
  checkText(errors, "district", value.district, "District", 2, 80);
  if (!value.state) errors.state = "State is required.";
  else if (!(INDIAN_STATES as readonly string[]).includes(value.state)) errors.state = "Choose a state from the list.";
  if (!value.pincode) errors.pincode = "PIN code is required.";
  else if (!isValidPincode(value.pincode)) errors.pincode = "Enter a valid 6-digit PIN code.";

  return { ok: Object.keys(errors).length === 0, errors, value };
}
