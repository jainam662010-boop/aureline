/**
 * Print-area maths shared by the studio (client) and the pricing engine
 * (server). A cart line is priced on the square inches its artwork actually
 * covers inside the chosen placement, not on the placement's full rectangle.
 *
 * Design documents store layer x/y as the layer CENTRE and sizes in editor
 * pixels at 30 ppi (see components/editor/editor-utils.ts), so this module has
 * no DOM dependencies and is safe to import on both sides.
 */
import type { DesignDocument, DesignLayerState, PrintSideKey } from "@/lib/editor-types";

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const PRINT_PX_PER_INCH = 30;

export interface PrintArea {
  /** Union bounding box of every layer on the side, in inches. */
  widthIn: number;
  heightIn: number;
  /** Rounded to two decimals, in square inches. */
  areaSqIn: number;
}

export interface PrintPricing {
  /** ₹ per square inch. 0 disables area pricing (flat placement cost wins). */
  ratePerSqIn: number;
  /** Floor in ₹ for a print, regardless of how small the artwork is. */
  minimum: number;
}

export interface PlacementLike {
  widthIn: number;
  heightIn: number;
}

export const DEFAULT_PRINT_PRICING: PrintPricing = { ratePerSqIn: 1.35, minimum: 99 };

/** Axis-aligned bounds of one layer after rotation, in editor pixels. */
export function layerBounds(layer: DesignLayerState) {
  const w = Math.max(1, Number(layer.width) || 0);
  const h = Math.max(1, Number(layer.height) || 0);
  const angle = ((Number(layer.angle) || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const width = w * cos + h * sin;
  const height = w * sin + h * cos;
  return {
    left: layer.x - width / 2,
    top: layer.y - height / 2,
    right: layer.x + width / 2,
    bottom: layer.y + height / 2,
  };
}

/**
 * Bounding box (in inches) of a design side, clipped to the placement. Returns
 * null when the side has no layers, so callers can fall back to flat pricing.
 */
export function designPrintArea(
  doc: DesignDocument | null | undefined,
  side: PrintSideKey,
  placement: PlacementLike,
): PrintArea | null {
  const layers = doc?.[side]?.layers ?? [];
  if (layers.length === 0) return null;

  const canvasW = Math.max(1, placement.widthIn * PRINT_PX_PER_INCH);
  const canvasH = Math.max(1, placement.heightIn * PRINT_PX_PER_INCH);

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const layer of layers) {
    if (!Number.isFinite(layer.x) || !Number.isFinite(layer.y)) continue;
    const b = layerBounds(layer);
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }

  if (!Number.isFinite(left)) return null;

  left = Math.max(0, left);
  top = Math.max(0, top);
  right = Math.min(canvasW, right);
  bottom = Math.min(canvasH, bottom);

  const widthIn = Math.max(0, (right - left) / PRINT_PX_PER_INCH);
  const heightIn = Math.max(0, (bottom - top) / PRINT_PX_PER_INCH);
  if (widthIn <= 0 || heightIn <= 0) return null;

  return { widthIn: round2(widthIn), heightIn: round2(heightIn), areaSqIn: round2(widthIn * heightIn) };
}

/** Same bounding box, measured in editor pixels (used by the studio HUD). */
export function designPrintAreaPx(
  doc: DesignDocument | null | undefined,
  side: PrintSideKey,
  canvas: { width: number; height: number },
): { width: number; height: number } | null {
  const area = designPrintArea(doc, side, {
    widthIn: canvas.width / PRINT_PX_PER_INCH,
    heightIn: canvas.height / PRINT_PX_PER_INCH,
  });
  if (!area) return null;
  return { width: area.widthIn * PRINT_PX_PER_INCH, height: area.heightIn * PRINT_PX_PER_INCH };
}

/**
 * Charge for one print. With area pricing enabled the placement's flat fee is
 * replaced by `max(minimum, area × rate)`; without a design (e.g. quick-add
 * from the catalogue) the placement fee is used unchanged.
 */
export function resolvePrintCost(input: {
  baseCost: number;
  surcharge: number;
  areaSqIn?: number | null;
  pricing?: PrintPricing | null;
}): number {
  const flat = round2((Number(input.baseCost) || 0) + (Number(input.surcharge) || 0));
  const pricing = input.pricing;
  if (!pricing || pricing.ratePerSqIn <= 0 || input.areaSqIn == null) return flat;
  const areaCost = round2(input.areaSqIn * pricing.ratePerSqIn);
  return round2(Math.max(pricing.minimum, areaCost));
}

/** Effective ₹/in² for a flat placement fee — shown in admin tables. */
export function placementRatePerSqIn(baseCost: number, surcharge: number, widthIn: number, heightIn: number): number {
  const area = widthIn * heightIn;
  if (area <= 0) return 0;
  return round2((baseCost + surcharge) / area);
}
