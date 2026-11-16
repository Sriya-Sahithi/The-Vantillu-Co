export const ORDER_STATUSES = [
  "payment_pending",
  "payment_failed",
  "paid",
  "confirmed",
  "preparing",
  "dispatched",
  "delivered",
  "cancelled",
  "refund_initiated",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  payment_pending: "Payment Pending",
  payment_failed: "Payment Failed",
  paid: "Payment Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refund_initiated: "Refund Initiated",
  refunded: "Refunded",
};

/** Fulfilment moves an admin may make by hand. Payment and refund states are driven by the gateway. */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  payment_pending: ["cancelled"],
  payment_failed: ["cancelled"],
  paid: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered: [],
  cancelled: [],
  refund_initiated: [],
  refunded: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** Statuses in which the customer has paid and stock is committed. */
export const PAID_STATUSES: OrderStatus[] = ["paid", "confirmed", "preparing", "dispatched", "delivered"];

export type TimelineStep = { key: string; label: string; state: "done" | "current" | "upcoming"; at: string | null };

const FULFILMENT_STEPS: { key: OrderStatus | "placed"; label: string }[] = [
  { key: "placed", label: "Order placed" },
  { key: "paid", label: "Payment received" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
];

const TERMINAL_LABELS: Partial<Record<OrderStatus, string>> = {
  payment_failed: "Payment failed",
  cancelled: "Cancelled",
  refund_initiated: "Refund initiated",
  refunded: "Refunded",
};

/**
 * Builds a timeline using only timestamps that really exist in the order's status history.
 * Nothing is inferred or invented.
 */
export function buildTimeline(
  status: OrderStatus,
  createdAt: string,
  history: { to_status: string; created_at: string }[],
): TimelineStep[] {
  const reached = new Map<string, string>([["placed", createdAt]]);
  for (const entry of history) if (!reached.has(entry.to_status)) reached.set(entry.to_status, entry.created_at);

  const rank = status === "payment_pending" ? 0 : FULFILMENT_STEPS.findIndex((step) => step.key === status);
  if (rank !== -1) {
    return FULFILMENT_STEPS.map((step, index) => ({
      key: step.key,
      label: step.label,
      at: reached.get(step.key) ?? (index === 0 ? createdAt : null),
      state: index < rank || (index === rank && status === "delivered") ? "done" : index === rank ? "current" : "upcoming",
    }));
  }
  // payment_failed / cancelled / refund_initiated / refunded: show only what actually happened.
  const steps: TimelineStep[] = FULFILMENT_STEPS.filter((step) => reached.has(step.key)).map((step) => ({
    key: step.key,
    label: step.label,
    at: reached.get(step.key)!,
    state: "done" as const,
  }));
  const terminals = (Object.keys(TERMINAL_LABELS) as OrderStatus[]).filter((key) => reached.has(key) && key !== status);
  const ordered = [...terminals, status].sort((a, b) => {
    const order = ["payment_failed", "cancelled", "refund_initiated", "refunded"];
    return order.indexOf(a) - order.indexOf(b);
  });
  for (const key of ordered) {
    steps.push({ key, label: TERMINAL_LABELS[key]!, at: reached.get(key) ?? null, state: key === status ? "current" : "done" });
  }
  return steps;
}
