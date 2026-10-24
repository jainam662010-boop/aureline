/**
 * Physical store pickup ("take away") location.
 *
 * Only the mall, area and city are hard-coded; the exact unit/floor comes from
 * env so the storefront never ships a fabricated shop number. If the env var is
 * unset we show the mall + area only and confirm the exact counter on WhatsApp
 * when the order is accepted.
 */
export const PICKUP_STORE = {
  name: "Aureline Atelier counter",
  mall: "Kumar Pacific Mall",
  area: "Kothrud",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411038",
} as const;

/** Exact unit/floor, e.g. "Level 2, Shop 214". Empty string when not configured. */
export function pickupUnit(): string {
  return (process.env.PICKUP_STORE_UNIT ?? "").trim();
}

/** Full one-line address shown at checkout and on order/invoice pages. */
export function pickupAddressLine(): string {
  const unit = pickupUnit();
  return [unit ? `${PICKUP_STORE.mall}, ${unit}` : PICKUP_STORE.mall, PICKUP_STORE.area, PICKUP_STORE.city]
    .filter(Boolean)
    .join(", ");
}

/** Short label used in compact UI spots (badges, order summaries). */
export const PICKUP_LABEL = `${PICKUP_STORE.mall}, ${PICKUP_STORE.city}`;
