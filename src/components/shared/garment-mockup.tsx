import * as React from "react";
import { cn } from "@/lib/utils";
import { GARMENT_PATHS, GARMENT_VIEWBOX, type GarmentType } from "@/lib/garment";
import { isLightColor, shade } from "@/lib/utils/color";

export type { GarmentType };
export { isLightColor };
export { garmentTypeFromCategory } from "@/lib/garment";

export interface GarmentMockupProps {
  type?: GarmentType;
  color?: string;
  className?: string;
  /** Overlay content (design preview) positioned in % of the garment box. */
  overlay?: React.ReactNode;
  overlayStyle?: React.CSSProperties;
  showGuides?: boolean;
  /** Rendered behind the garment (glow). */
  glow?: boolean;
  /** Disable the fabric shading layer that sits above the print. */
  flat?: boolean;
}

/**
 * Vector garment mockup used across catalog, product page, cart thumbnails and
 * the design studio. Color-aware so the selected variant colour renders live.
 *
 * The silhouette paths come from src/lib/garment.ts — the same source the Konva
 * studio reads — so the catalog render and the editor preview never drift.
 *
 * Realism: the garment is rendered as THREE stacked layers sharing one clip —
 *   1. base SVG  → fabric gradient, seams, stitching, neck shadow, grain
 *   2. the print (overlay node) sits between the two SVG layers
 *   3. top SVG   → soft-light sheen + wrinkle shading + grain rendered ON TOP
 * of the print, which is what makes a design look printed *into* the cloth
 * instead of pasted onto it.
 */
export function GarmentMockup({
  type = "tee",
  color = "#111111",
  className,
  overlay,
  overlayStyle,
  showGuides = false,
  glow = false,
  flat = false,
}: GarmentMockupProps) {
  const { body, extras } = GARMENT_PATHS[type] ?? GARMENT_PATHS.tee;
  const isLight = isLightColor(color);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const bodyClip = `${uid}-clip`;
  const grainFilter = `${uid}-grain`;
  const softBlur = `${uid}-blur`;
  const hardBlur = `${uid}-blur-hard`;
  const gradientId = `${uid}-grad`;
  const stitchColor = isLight ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.20)";
  const seamColor = isLight ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.30)";
  const isTote = type === "tote";

  return (
    <div className={cn("relative aspect-[400/460] w-full select-none", className)}>
      {glow ? (
        <div className="absolute inset-x-1/4 bottom-4 h-10 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#FF0D7B]/40 to-[#00E0F2]/40 blur-xl" />
      ) : null}

      {/* ---------------------------------------------------------------- 1. BASE SVG */}
      <svg
        viewBox={`0 0 ${GARMENT_VIEWBOX.width} ${GARMENT_VIEWBOX.height}`}
        className="relative h-full w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)]"
        role="img"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={shade(color, 0.04)} />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor={shade(color, -0.28)} />
          </linearGradient>
          {/* Chest sheen — soft vertical highlight, like light raking heavy cotton */}
          <linearGradient id={`${gradientId}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? 0.10 : 0.05} />
            <stop offset="38%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.22} />
          </linearGradient>
          <radialGradient id={`${gradientId}-neck`} cx="0.5" cy="0" r="1">
            <stop offset="0%" stopColor="#000000" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </radialGradient>
          <filter id={softBlur} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id={hardBlur} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* Woven fabric grain */}
          <filter id={grainFilter} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0.5 0.5 0 -0.55"
            />
          </filter>
          <clipPath id={bodyClip}>
            <path d={body} />
          </clipPath>
        </defs>

        {/* Tote straps sit behind the bag face */}
        {isTote && extras ? (
          <path d={extras} fill="none" stroke={shade(color, -0.3)} strokeWidth="18" strokeLinecap="round" />
        ) : null}

        <path d={body} fill={`url(#${gradientId})`} />

        <g clipPath={`url(#${bodyClip})`}>
          {/* main chest sheen */}
          <path d={body} fill={`url(#${gradientId}-sheen)`} />

          {/* neckline interior shadow */}
          {!isTote ? (
            <ellipse cx="200" cy={type === "hoodie" ? 96 : 58} rx="76" ry="30" fill={`url(#${gradientId}-neck)`} />
          ) : null}

          {/* body wrinkles — raking soft-light blotches for cloth depth */}
          <g style={{ mixBlendMode: "soft-light" }} opacity="0.85">
            <ellipse cx="128" cy="300" rx="60" ry="120" fill="#ffffff" opacity={isLight ? 0.22 : 0.12} filter={`url(#${softBlur})`} />
            <ellipse cx="286" cy="280" rx="54" ry="110" fill="#000000" opacity={isLight ? 0.10 : 0.22} filter={`url(#${softBlur})`} />
            <ellipse cx="200" cy="250" rx="90" ry="60" fill="#ffffff" opacity={isLight ? 0.10 : 0.05} filter={`url(#${softBlur})`} />
            <ellipse cx="170" cy="360" rx="110" ry="34" fill="#000000" opacity={isLight ? 0.08 : 0.16} filter={`url(#${softBlur})`} />
          </g>

          {/* drop shading under sleeves + bottom hem */}
          <g clipPath={`url(#${bodyClip})`} opacity={isLight ? 0.35 : 0.5}>
            <ellipse cx="98" cy="196" rx="30" ry="22" fill="#000" opacity="0.5" filter={`url(#${hardBlur})`} />
            <ellipse cx="302" cy="196" rx="30" ry="22" fill="#000" opacity="0.5" filter={`url(#${hardBlur})`} />
            <ellipse cx="200" cy="424" rx="130" ry="18" fill="#000" opacity="0.4" filter={`url(#${hardBlur})`} />
          </g>

          {/* woven grain */}
          <rect
            x="0"
            y="0"
            width={GARMENT_VIEWBOX.width}
            height={GARMENT_VIEWBOX.height}
            filter={`url(#${grainFilter})`}
            opacity="0.4"
            style={{ mixBlendMode: "overlay" }}
          />

          {/* seams: armhole joins + side seams */}
          {!isTote ? (
            <g stroke={seamColor} strokeWidth="1.6" fill="none" opacity="0.8">
              <path d="M96 186 C112 200 118 216 116 238" />
              <path d="M304 186 C288 200 282 216 284 238" />
              <path d="M116 240 C114 300 114 370 118 424" />
              <path d="M284 240 C286 300 286 370 282 424" />
            </g>
          ) : (
            <g stroke={seamColor} strokeWidth="1.6" fill="none" opacity="0.8">
              <path d="M88 180 L84 420" />
              <path d="M312 180 L316 420" />
            </g>
          )}

          {/* stitching: neckline rib + hems */}
          <g stroke={stitchColor} strokeWidth="2" fill="none" strokeDasharray="7 5" opacity="0.9">
            {!isTote && extras ? <path d={extras} /> : null}
            {type === "hoodie" ? <path d="M138 402 L152 336 L248 336 L262 402" /> : null}
            <path d={isTote ? "M76 414 L324 414" : "M112 400 C160 412 240 412 288 400"} />
          </g>
          {/* collar rib highlight */}
          {!isTote && extras ? (
            <path d={extras} fill="none" stroke={isLight ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          ) : null}
        </g>

        {/* crisp outer edge */}
        <path
          d={body}
          fill="none"
          stroke={isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)"}
          strokeWidth="2"
        />
        {extras && !isTote ? (
          <path
            d={extras}
            fill="none"
            stroke={isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.16)"}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>

      {/* ---------------------------------------------------------------- 2. THE PRINT */}
      {overlay ? (
        <div className="absolute" style={overlayStyle}>
          {overlay}
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- 3. FABRIC LAYER ABOVE THE PRINT */}
      {!flat ? (
        <svg
          viewBox={`0 0 ${GARMENT_VIEWBOX.width} ${GARMENT_VIEWBOX.height}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id={`${gradientId}-top-sheen`} x1="0" y1="0" x2="1" y2="0.15">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={isLight ? 0.20 : 0.10} />
              <stop offset="30%" stopColor="#ffffff" stopOpacity={0} />
              <stop offset="78%" stopColor="#000000" stopOpacity={isLight ? 0.06 : 0.16} />
              <stop offset="100%" stopColor="#000000" stopOpacity={isLight ? 0.10 : 0.24} />
            </linearGradient>
            <clipPath id={`${bodyClip}-top`}>
              <path d={body} />
            </clipPath>
            <filter id={`${grainFilter}-top`}>
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.6 0.6 0.6 0 -0.6"
              />
            </filter>
          </defs>
          <g clipPath={`url(#${bodyClip}-top)`}>
            {/* raking light across the print so pigment reads as dyed-in fabric */}
            <path d={body} fill={`url(#${gradientId}-top-sheen)`} style={{ mixBlendMode: "soft-light" }} />
            {/* fine grain over print */}
            <rect
              x="0"
              y="0"
              width={GARMENT_VIEWBOX.width}
              height={GARMENT_VIEWBOX.height}
              filter={`url(#${grainFilter}-top)`}
              opacity="0.45"
              style={{ mixBlendMode: "overlay" }}
            />
            {/* two faint folds crossing the print area */}
            <g style={{ mixBlendMode: "multiply" }} opacity={isLight ? 0.18 : 0.30}>
              <path
                d="M120 210 C160 240 180 300 168 400"
                stroke="#000"
                strokeWidth="16"
                fill="none"
                filter={`url(#${softBlur})`}
              />
              <path
                d="M292 240 C260 280 250 330 258 408"
                stroke="#000"
                strokeWidth="12"
                fill="none"
                filter={`url(#${softBlur})`}
              />
            </g>
          </g>
        </svg>
      ) : null}

      {showGuides ? (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-dashed border-[#FF0D7B]/50" />
      ) : null}
    </div>
  );
}
