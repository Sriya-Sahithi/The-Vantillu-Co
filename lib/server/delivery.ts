import type { Queryable } from "@/lib/server/db";

export type DeliverySettings = {
  enabled: boolean;
  feePaise: number;
  /** Only set when the owner explicitly configures it in the admin dashboard. */
  freeThresholdPaise: number | null;
};

export async function getDeliverySettings(q: Queryable): Promise<DeliverySettings> {
  const { rows } = await q.query(`select * from delivery_settings where id = 1`);
  const row = rows[0];
  if (!row) return { enabled: false, feePaise: 0, freeThresholdPaise: null };
  return {
    enabled: row.delivery_enabled,
    feePaise: row.delivery_fee_paise,
    freeThresholdPaise: row.free_delivery_threshold_paise,
  };
}

export type Serviceability =
  | { serviceable: true; label: string; feeOverridePaise: number | null }
  | { serviceable: false; reason: "delivery_disabled" | "not_serviceable" };

/** Longest matching PIN prefix wins, so a specific PIN can opt out of (or into) a wider region. */
export async function checkServiceability(q: Queryable, settings: DeliverySettings, pincode: string): Promise<Serviceability> {
  if (!settings.enabled) return { serviceable: false, reason: "delivery_disabled" };
  const { rows } = await q.query(
    `select pattern, label, enabled, delivery_fee_paise from serviceable_postcodes
     where $1 like pattern || '%' order by length(pattern) desc limit 1`,
    [pincode],
  );
  const match = rows[0];
  if (!match || !match.enabled) return { serviceable: false, reason: "not_serviceable" };
  return { serviceable: true, label: match.label, feeOverridePaise: match.delivery_fee_paise };
}

export function deliveryFeeFor(settings: DeliverySettings, area: { feeOverridePaise: number | null }, subtotalPaise: number): number {
  if (settings.freeThresholdPaise !== null && subtotalPaise >= settings.freeThresholdPaise) return 0;
  return area.feeOverridePaise ?? settings.feePaise;
}
