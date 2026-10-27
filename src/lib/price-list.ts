/**
 * Blank garment price list (per piece, before printing).
 *
 * Quantities follow the studio price sheet: 1 · 2 · 3 · 4–5 · 6–8 · 9–22 · 23+.
 * The price is for the garment only — print cost is quoted separately by area.
 * Products without an explicit ladder keep their catalogue base price.
 */

export interface QtyBreak {
  minQty: number;
  maxQty: number | null;
  label: string;
}

export const PRINT_QTY_BREAKS: QtyBreak[] = [
  { minQty: 1, maxQty: 1, label: "1 pc" },
  { minQty: 2, maxQty: 2, label: "2 pcs" },
  { minQty: 3, maxQty: 3, label: "3 pcs" },
  { minQty: 4, maxQty: 5, label: "4–5 pcs" },
  { minQty: 6, maxQty: 8, label: "6–8 pcs" },
  { minQty: 9, maxQty: 22, label: "9–22 pcs" },
  { minQty: 23, maxQty: null, label: "23+ pcs" },
];

/**
 * Per-piece blank price by quantity break. Order matches PRINT_QTY_BREAKS.
 * Source: studio price sheet (blank garment only; print is charged separately).
 */
export const BLANK_PRICE_LADDERS: Record<string, number[]> = {
  // Heavy cotton tee: ₹520 at 1 pc, −₹40 for every following break.
  "heavyweight-box-tee": [520, 480, 440, 400, 360, 320, 280],
  // Oversized heavy: ₹625 at 1 pc, −₹40 for every following break.
  "vintage-washed-oversized": [625, 585, 545, 505, 465, 425, 385],
  // Hoodie: explicit sheet prices.
  "french-terry-hoodie": [825, 790, 750, 710, 670, 620, 560],
  // Pure cotton polo has a single blank price on the sheet.
  "structured-pique-polo": [589, 589, 589, 589, 589, 589, 589],
  // Not listed on the sheet — keep the catalogue price flat.
  "kids-essential-tee": [499, 499, 499, 499, 499, 499, 499],
  "raw-canvas-merch-tote": [549, 549, 549, 549, 549, 549, 549],
};

/** Index of the break a quantity falls into (last break wins). */
export function qtyBreakIndex(qty: number): number {
  const n = Math.max(1, Math.floor(Number(qty) || 1));
  for (let i = PRINT_QTY_BREAKS.length - 1; i >= 0; i--) {
    const b = PRINT_QTY_BREAKS[i]!;
    if (n >= b.minQty && (b.maxQty === null || n <= b.maxQty)) return i;
    if (b.maxQty === null && n >= b.minQty) return i;
  }
  return 0;
}

/** Per-piece blank price for a product at a given quantity. */
export function blankUnitPrice(slug: string | null | undefined, qty: number, fallback = 0): number {
  if (!slug) return fallback;
  const ladder = BLANK_PRICE_LADDERS[slug];
  if (!ladder || ladder.length === 0) return fallback;
  return ladder[Math.min(qtyBreakIndex(qty), ladder.length - 1)] ?? fallback;
}

/** True when the product uses the explicit quantity price sheet. */
export function hasBlankPriceLadder(slug: string | null | undefined): boolean {
  return Boolean(slug && BLANK_PRICE_LADDERS[slug]);
}

/** Row data for the "price by quantity" table shown on product pages. */
export function blankPriceRows(slug: string | null | undefined, fallback = 0) {
  const ladder = slug ? BLANK_PRICE_LADDERS[slug] : null;
  return PRINT_QTY_BREAKS.map((b, i) => ({
    ...b,
    price: ladder?.[i] ?? fallback,
  }));
}
