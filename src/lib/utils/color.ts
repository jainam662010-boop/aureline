/** Colour helpers shared by the SVG mockup and the Konva studio canvas. */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(full || "111111", 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** Darkens (negative percent) or lightens (positive) a hex colour. */
export function shade(hex: string, percent: number): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * percent)));
    return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
  } catch {
    return hex;
  }
}

/** True when the garment is light enough that dark ink reads on it. */
export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/** Relative luminance 0..1 — used to auto-pick readable UI text on a swatch. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}
