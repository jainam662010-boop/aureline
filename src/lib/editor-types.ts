/** Shared design-editor types (client + server safe). */

export type PrintSideKey = "FRONT" | "BACK" | "SLEEVE";
export type LayerKind = "TEXT" | "IMAGE" | "CLIPART";

export interface DesignLayerState {
  id: string;
  type: LayerKind;
  /** Top-left position, in garment-box units, relative to the print area origin. */
  x: number;
  y: number;
  /** Size in garment-box units. */
  width: number;
  height: number;
  /** Rotation in degrees, around the layer centre. */
  angle: number;
  opacity: number;
  /** TEXT */
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;
  lineHeight?: number;
  fill?: string;
  /** IMAGE / CLIPART */
  src?: string;
  clipartKey?: string;
  /** Natural pixel size of uploaded images (for DPI warnings). */
  naturalWidth?: number;
  naturalHeight?: number;
}

export type DesignSideState = {
  layers: DesignLayerState[];
};

export interface DesignDocument {
  FRONT: DesignSideState;
  BACK: DesignSideState;
  SLEEVE: DesignSideState;
}

export const EMPTY_DESIGN: DesignDocument = {
  FRONT: { layers: [] },
  BACK: { layers: [] },
  SLEEVE: { layers: [] },
};

export function createEmptyDesign(): DesignDocument {
  return JSON.parse(JSON.stringify(EMPTY_DESIGN)) as DesignDocument;
}

export function countLayers(doc: DesignDocument | null | undefined): number {
  if (!doc) return 0;
  return (
    (doc.FRONT?.layers?.length ?? 0) +
    (doc.BACK?.layers?.length ?? 0) +
    (doc.SLEEVE?.layers?.length ?? 0)
  );
}

/** True when no side has any content — used to disable export/save. */
export function isEmptyDesign(doc: DesignDocument | null | undefined): boolean {
  return countLayers(doc) === 0;
}

/** Total pixel dimensions across every side (rough payload guard). */
export function layerCount(doc: DesignDocument | null | undefined, side?: PrintSideKey): number {
  if (!doc) return 0;
  if (side) return doc[side]?.layers?.length ?? 0;
  return countLayers(doc);
}
