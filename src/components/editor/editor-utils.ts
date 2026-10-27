import type { DesignDocument, DesignLayerState, PrintSideKey } from "@/lib/editor-types";

/** Editor canvas runs at 30 px per inch; exports multiply by 10 for 300 DPI. */
export const PX_PER_INCH = 30;
export const EXPORT_SCALE = 10;
export const THUMB_SCALE = 1;

export interface PlacementInfo {
  key: string;
  label: string;
  side: string;
  widthIn: number;
  heightIn: number;
  topPct: number;
  leftPct: number;
  baseCost: number;
  surcharge: number;
}

export interface EditorProduct {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  basePrice: number;
  gstRate: number;
  colors: { name: string; hex: string }[];
  variants: { id: string; size: string; colorName: string; colorHex: string; stock: number; priceDelta: number }[];
  placements: PlacementInfo[];
}

export function canvasSize(placement: PlacementInfo) {
  return { width: Math.round(placement.widthIn * PX_PER_INCH), height: Math.round(placement.heightIn * PX_PER_INCH) };
}

export function inches(px: number): string {
  return (px / PX_PER_INCH).toFixed(1);
}

export function newLayerId(): string {
  return `l_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Effective DPI of an image layer at its placed size. */
export function layerDpi(layer: DesignLayerState): number | null {
  if (layer.type !== "IMAGE" || !layer.naturalWidth || !layer.width) return null;
  const widthInches = layer.width / PX_PER_INCH;
  return Math.round(layer.naturalWidth / widthInches);
}

export function isLowRes(layer: DesignLayerState, minDpi = 150): boolean {
  const dpi = layerDpi(layer);
  return dpi !== null && dpi < minDpi;
}

/**
 * Layer x/y always store the CENTRE point of the object. Konva nodes render
 * with offsetX/offsetY = width/2, height/2 so rotation happens around the
 * visual centre and bounds math stays symmetric.
 */
export function clampLayer<T extends DesignLayerState>(layer: T, canvas: { width: number; height: number }): T {
  const w = Math.max(10, layer.width);
  const h = Math.max(10, layer.height);
  const x = Math.min(Math.max(layer.x, w / 2), canvas.width - w / 2);
  const y = Math.min(Math.max(layer.y, h / 2), canvas.height - h / 2);
  return { ...layer, width: w, height: h, x, y };
}

export function createTextLayer(canvas: { width: number; height: number }, text = "Your text here"): DesignLayerState {
  const fontSize = 34;
  const width = Math.min(canvas.width * 0.85, canvas.width - 20);
  const height = fontSize * 1.4;
  return {
    id: newLayerId(),
    type: "TEXT",
    text,
    fontFamily: "Plus Jakarta Sans",
    fontSize,
    fontWeight: "bold",
    fontStyle: "normal",
    textAlign: "center",
    letterSpacing: 0,
    lineHeight: 1.2,
    fill: "#FFFFFF",
    x: canvas.width / 2,
    y: canvas.height / 2,
    width,
    height,
    angle: 0,
    opacity: 1,
  };
}

export function createImageLayer(
  canvas: { width: number; height: number },
  src: string,
  naturalWidth: number,
  naturalHeight: number,
): DesignLayerState {
  const maxW = canvas.width * 0.8;
  const maxH = canvas.height * 0.8;
  const ratio = Math.min(maxW / (naturalWidth || 300), maxH / (naturalHeight || 300), 1);
  const width = Math.max(30, Math.round((naturalWidth || 300) * ratio));
  const height = Math.max(30, Math.round((naturalHeight || 300) * ratio));
  return {
    id: newLayerId(),
    type: "IMAGE",
    src,
    naturalWidth,
    naturalHeight,
    x: canvas.width / 2,
    y: canvas.height / 2,
    width,
    height,
    angle: 0,
    opacity: 1,
  };
}

export function createClipartLayer(canvas: { width: number; height: number }, clipartKey: string): DesignLayerState {
  const size = Math.min(canvas.width, canvas.height) * 0.4;
  return {
    id: newLayerId(),
    type: "CLIPART",
    clipartKey,
    fill: "#2563EB",
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: size,
    height: size,
    angle: 0,
    opacity: 1,
  };
}

export function duplicateLayer(layer: DesignLayerState, canvas: { width: number; height: number }): DesignLayerState {
  return clampLayer(
    { ...layer, id: newLayerId(), x: layer.x + 16, y: layer.y + 16 },
    canvas,
  );
}

export function sideHasContent(doc: DesignDocument, side: PrintSideKey): boolean {
  return (doc[side]?.layers?.length ?? 0) > 0;
}

/** Snapshot for undo/redo (deep clone). */
export function cloneDoc(doc: DesignDocument): DesignDocument {
  return JSON.parse(JSON.stringify(doc)) as DesignDocument;
}
