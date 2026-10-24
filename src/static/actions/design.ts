/**
 * Static-build replacement for src/actions/design.ts (GitHub Pages demo).
 * Saving designs needs the database, so the studio keeps working in-browser
 * (undo/redo, export, add-to-cart thumbnail) while cloud saving reports demo mode.
 */
import type { DesignDocument } from "@/lib/editor-types";

export interface SerializedDesign {
  id: string;
  name: string;
  productId: string;
  productSlug: string;
  productName: string;
  thumbnailUrl: string | null;
  state: DesignDocument;
  updatedAt: string;
}

import type { ApiResponse } from "@/lib/response";

const DISABLED = "Design saving needs the full backend. In this demo your design stays in your browser tab.";

export async function saveDesign(_input: {
  designId?: string | null;
  productId: string;
  name: string;
  state: { FRONT: { layers: unknown[] }; BACK: { layers: unknown[] } };
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  printReadyUrls?: Record<string, string> | null;
}): Promise<ApiResponse<{ id: string }>> {
  return { ok: false, error: DISABLED };
}

export async function listDesigns(): Promise<ApiResponse<SerializedDesign[]>> {
  return { ok: true, data: [] };
}

export async function getDesign(_designId: string): Promise<ApiResponse<SerializedDesign | null>> {
  return { ok: false, error: DISABLED };
}

export async function deleteDesign(_designId: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return { ok: false, error: DISABLED };
}
