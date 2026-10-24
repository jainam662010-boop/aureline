/**
 * Shared garment geometry — single source of truth for BOTH the SVG mockup
 * (components/shared/garment-mockup) and the Konva design studio. Because both
 * read these exact path strings, the editor preview and the exported mockup are
 * pixel-identical to the catalog renders.
 */

export type GarmentType = "tee" | "oversized" | "hoodie" | "polo" | "kids" | "tote";

/** Silhouette geometry in a shared 400 x 460 viewBox. */
export const GARMENT_PATHS: Record<GarmentType, { body: string; extras?: string; handles?: string }> = {
  tee: {
    body: "M138 46 C150 78 250 78 262 46 L340 78 L384 176 L312 206 L292 166 L292 424 L108 424 L108 166 L88 206 L16 176 L60 78 Z",
    extras: "M138 46 C160 68 240 68 262 46",
  },
  oversized: {
    body: "M130 46 C144 82 256 82 270 46 L354 86 L398 192 L318 222 L296 178 L296 442 L104 442 L104 178 L82 222 L2 192 L46 86 Z",
    extras: "M130 46 C154 70 246 70 270 46",
  },
  hoodie: {
    body: "M128 74 L44 112 L14 202 L88 234 L108 192 L108 432 L292 432 L292 192 L312 234 L386 202 L356 112 L272 74 Z",
    extras:
      "M132 74 C132 26 268 26 268 74 L268 104 L132 104 Z M152 336 L248 336 L262 402 L138 402 Z M188 104 L188 148 M212 104 L212 148",
  },
  polo: {
    body: "M138 46 C150 78 250 78 262 46 L340 78 L384 176 L312 206 L292 166 L292 424 L108 424 L108 166 L88 206 L16 176 L60 78 Z",
    extras: "M138 46 L200 100 L262 46 L274 62 L200 122 L126 62 Z M192 100 L192 164 L208 164 L208 100",
  },
  kids: {
    body: "M146 78 C157 106 243 106 254 78 L318 104 L354 186 L292 212 L276 180 L276 396 L124 396 L124 180 L108 212 L46 186 L82 104 Z",
    extras: "M146 78 C166 96 234 96 254 78",
  },
  tote: {
    body: "M92 158 L308 158 L330 432 L70 432 Z",
    extras: "M148 158 C148 74 252 74 252 158",
    handles: "M148 158 C148 74 252 74 252 158",
  },
};

export const GARMENT_VIEWBOX = { width: 400, height: 460 } as const;

/** Map category slugs to garment silhouettes. */
export function garmentTypeFromCategory(slug: string): GarmentType {
  const s = slug.toLowerCase();
  if (s.includes("hoodie") || s.includes("sweat")) return "hoodie";
  if (s.includes("oversized")) return "oversized";
  if (s.includes("polo")) return "polo";
  if (s.includes("kids") || s.includes("children")) return "kids";
  if (s.includes("tote") || s.includes("bag")) return "tote";
  return "tee";
}

/* --------------------------------------------------------------------------
   Print placements
   -------------------------------------------------------------------------- */

export type PrintSideKey = "FRONT" | "BACK" | "SLEEVE";

export interface PrintPlacement {
  key: string;
  label: string;
  side: PrintSideKey;
  /** Physical print width/height in inches (used for DPI + print-ready export). */
  widthIn: number;
  heightIn: number;
  /** Position + size as a percentage of the 400x460 garment box. */
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  /** Flat print cost in ₹. */
  baseCost: number;
  /** Extra cost when printing on a dark garment (white ink layer). */
  darkSurcharge: number;
  note?: string;
}

/**
 * Default placements per garment. Products narrow this down via
 * `placementKeys` so a tote never offers a sleeve print.
 */
export const DEFAULT_PLACEMENTS: Record<GarmentType, PrintPlacement[]> = {
  tee: [
    { key: "chest", label: "Front chest", side: "FRONT", widthIn: 10, heightIn: 12, leftPct: 32, topPct: 30, widthPct: 36, heightPct: 34, baseCost: 149, darkSurcharge: 30 },
    { key: "full-front", label: "Full front", side: "FRONT", widthIn: 12, heightIn: 16, leftPct: 26, topPct: 27, widthPct: 48, heightPct: 46, baseCost: 249, darkSurcharge: 40 },
    { key: "back-large", label: "Large back", side: "BACK", widthIn: 12, heightIn: 16, leftPct: 26, topPct: 27, widthPct: 48, heightPct: 46, baseCost: 249, darkSurcharge: 40 },
    { key: "back-small", label: "Upper back", side: "BACK", widthIn: 8, heightIn: 6, leftPct: 35, topPct: 28, widthPct: 30, heightPct: 18, baseCost: 129, darkSurcharge: 25 },
    { key: "sleeve", label: "Sleeve", side: "SLEEVE", widthIn: 3, heightIn: 5, leftPct: 12, topPct: 33, widthPct: 14, heightPct: 16, baseCost: 79, darkSurcharge: 20, note: "Left sleeve, print faces outward." },
  ],
  oversized: [
    { key: "chest", label: "Front chest", side: "FRONT", widthIn: 10, heightIn: 12, leftPct: 33, topPct: 30, widthPct: 34, heightPct: 32, baseCost: 159, darkSurcharge: 30 },
    { key: "full-front", label: "Full front", side: "FRONT", widthIn: 13, heightIn: 17, leftPct: 25, topPct: 26, widthPct: 50, heightPct: 48, baseCost: 269, darkSurcharge: 40 },
    { key: "back-large", label: "Large back", side: "BACK", widthIn: 13, heightIn: 17, leftPct: 25, topPct: 26, widthPct: 50, heightPct: 48, baseCost: 269, darkSurcharge: 40 },
    { key: "sleeve", label: "Sleeve", side: "SLEEVE", widthIn: 3, heightIn: 5, leftPct: 11, topPct: 34, widthPct: 14, heightPct: 16, baseCost: 89, darkSurcharge: 20 },
  ],
  hoodie: [
    { key: "chest", label: "Front chest", side: "FRONT", widthIn: 10, heightIn: 10, leftPct: 33, topPct: 30, widthPct: 34, heightPct: 26, baseCost: 179, darkSurcharge: 35 },
    { key: "full-front", label: "Full front", side: "FRONT", widthIn: 12, heightIn: 14, leftPct: 27, topPct: 28, widthPct: 46, heightPct: 38, baseCost: 299, darkSurcharge: 45 },
    { key: "back-large", label: "Large back", side: "BACK", widthIn: 12, heightIn: 15, leftPct: 26, topPct: 27, widthPct: 48, heightPct: 42, baseCost: 299, darkSurcharge: 45 },
  ],
  polo: [
    { key: "chest", label: "Left chest", side: "FRONT", widthIn: 4, heightIn: 4, leftPct: 36, topPct: 33, widthPct: 16, heightPct: 14, baseCost: 129, darkSurcharge: 25 },
    { key: "back-small", label: "Upper back", side: "BACK", widthIn: 8, heightIn: 8, leftPct: 35, topPct: 29, widthPct: 30, heightPct: 22, baseCost: 169, darkSurcharge: 30 },
  ],
  kids: [
    { key: "chest", label: "Front chest", side: "FRONT", widthIn: 7, heightIn: 8, leftPct: 34, topPct: 32, widthPct: 32, heightPct: 28, baseCost: 119, darkSurcharge: 25 },
    { key: "back-small", label: "Upper back", side: "BACK", widthIn: 8, heightIn: 9, leftPct: 34, topPct: 30, widthPct: 32, heightPct: 30, baseCost: 139, darkSurcharge: 25 },
  ],
  tote: [
    { key: "tote-front", label: "Tote face", side: "FRONT", widthIn: 11, heightIn: 12, leftPct: 26, topPct: 40, widthPct: 48, heightPct: 42, baseCost: 149, darkSurcharge: 30 },
  ],
};

export function placementsFor(garment: GarmentType, keys?: string[] | null): PrintPlacement[] {
  const all = DEFAULT_PLACEMENTS[garment] ?? DEFAULT_PLACEMENTS.tee;
  if (!keys || keys.length === 0) return all;
  return all.filter((p) => keys.includes(p.key));
}

/** Resolves the print rect in garment-box pixels for a placement. */
export function placementRect(p: PrintPlacement) {
  return {
    x: (p.leftPct / 100) * GARMENT_VIEWBOX.width,
    y: (p.topPct / 100) * GARMENT_VIEWBOX.height,
    width: (p.widthPct / 100) * GARMENT_VIEWBOX.width,
    height: (p.heightPct / 100) * GARMENT_VIEWBOX.height,
  };
}

/** Map category slugs to garment silhouettes (kept for the catalog layer). */
export const GARMENT_LABEL: Record<GarmentType, string> = {
  tee: "Boxy Tee",
  oversized: "Oversized",
  hoodie: "Hoodie",
  polo: "Polo",
  kids: "Kids Tee",
  tote: "Tote Bag",
};
