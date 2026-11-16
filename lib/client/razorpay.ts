import { ClientApiError, api } from "@/lib/client/api";

type RazorpayInstance = { open(): void; on(event: string, handler: (response: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export type PaymentSession = {
  orderNumber: string;
  accessToken: string;
  totalPaise: number;
  razorpay: { keyId: string; orderId: string; amountPaise: number };
};

let loading: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new ClientApiError(0, "script", "Could not load the payment window. Please check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export type PayResult = "paid" | "pending" | "dismissed" | "failed";

/**
 * Opens Razorpay Checkout. Success from the modal is only a *claim*: it is sent to our server, which
 * verifies the signature and re-reads the payment from Razorpay before the order is marked paid.
 */
export async function openCheckout(
  session: PaymentSession,
  prefill: { name?: string; email?: string; contact?: string },
  callbacks: { onFailedAttempt?: (message: string) => void },
): Promise<PayResult> {
  await loadRazorpay();
  return new Promise<PayResult>((resolve, reject) => {
    const instance = new window.Razorpay!({
      key: session.razorpay.keyId,
      amount: session.razorpay.amountPaise,
      currency: "INR",
      order_id: session.razorpay.orderId,
      name: "The Vantillu Co.",
      description: `Order ${session.orderNumber}`,
      prefill,
      notes: { order_number: session.orderNumber },
      theme: { color: "#43542a" },
      modal: { ondismiss: () => resolve("dismissed"), confirm_close: true },
      handler: async (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          const result = await api<{ outcome: string }>("/api/checkout/verify", {
            body: { orderNumber: session.orderNumber, token: session.accessToken, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature },
          });
          resolve(result.outcome === "paid" || result.outcome === "already_paid" ? "paid" : result.outcome === "failed" ? "failed" : "pending");
        } catch (error) {
          // The money may have moved even if verification could not complete; the order page reconciles with the gateway.
          if (error instanceof ClientApiError && error.code === "invalid_signature") reject(error);
          else resolve("pending");
        }
      },
    });
    instance.on("payment.failed", (response) => callbacks.onFailedAttempt?.(response.error?.description ?? "The payment did not go through. You can try again."));
    instance.open();
  });
}
