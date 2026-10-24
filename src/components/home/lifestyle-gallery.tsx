"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";
import { GarmentMockup, type GarmentType } from "@/components/shared/garment-mockup";

/**
 * Lifestyle / worn-in-the-wild photo strip.
 *
 * Drop real model shots into `public/photos/` using the file names below and
 * they appear automatically. Until a file exists the tile falls back to a
 * clipped garment mockup with the matching customer artwork, so the section
 * never shows a broken image.
 */
interface LifestyleShot {
  file: string;
  alt: string;
  title: string;
  meta: string;
  href: string;
  garment: GarmentType;
  color: string;
  artwork: string;
  placement: { topPct: number; leftPct: number; widthPct: number; heightPct: number };
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const SHOTS: LifestyleShot[] = [
  {
    file: "lifestyle-01.jpg",
    alt: "Model wearing a black oversized tee with a back print",
    title: "After hours",
    meta: "Vintage Washed Oversized · Bengaluru",
    href: "/products/vintage-washed-oversized",
    garment: "oversized",
    color: "#111111",
    artwork: "/showcase/black-hole.jpg",
    placement: { topPct: 26, leftPct: 26, widthPct: 48, heightPct: 46 },
  },
  {
    file: "lifestyle-02.jpg",
    alt: "Model wearing an olive hoodie with a sunflower chest print",
    title: "Field notes",
    meta: "French Terry Hoodie · Mumbai",
    href: "/products/french-terry-hoodie",
    garment: "hoodie",
    color: "#3D4035",
    artwork: "/showcase/ghibli-sunflowers.jpg",
    placement: { topPct: 28, leftPct: 27, widthPct: 46, heightPct: 38 },
  },
  {
    file: "lifestyle-03.jpg",
    alt: "Model wearing a white heavyweight tee with a drift car print",
    title: "Tunnel run",
    meta: "Heavyweight Box Tee · Delhi",
    href: "/products/heavyweight-box-tee",
    garment: "tee",
    color: "#F4F4F4",
    artwork: "/showcase/drift-car.jpg",
    placement: { topPct: 27, leftPct: 26, widthPct: 48, heightPct: 46 },
  },
  {
    file: "lifestyle-04.jpg",
    alt: "Model carrying a canvas tote printed with developer icons",
    title: "Ship day",
    meta: "Raw Canvas Merch Tote · Pune",
    href: "/products/raw-canvas-merch-tote",
    garment: "tote",
    color: "#E6DEC8",
    artwork: "/showcase/dev-icons.jpg",
    placement: { topPct: 40, leftPct: 26, widthPct: 48, heightPct: 42 },
  },
];

function PhotoTile({ shot, priority }: { shot: LifestyleShot; priority: boolean }) {
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  return (
    <figure className="group relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d0d10]">
      <Link href={shot.href} className="relative block aspect-[4/5] w-full">
        {/* Fallback is always mounted underneath; the photo fades in over it. */}
        <div
          className="absolute inset-0 flex items-center justify-center px-8 pt-10"
          style={{
            background:
              "radial-gradient(circle at 30% 15%, rgba(255,13,123,0.16), transparent 55%), radial-gradient(circle at 80% 85%, rgba(0,224,242,0.12), transparent 55%), #0d0d10",
          }}
        >
          <GarmentMockup
            type={shot.garment}
            color={shot.color}
            glow
            className="h-full w-auto"
            overlay={
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${BASE_PATH}${shot.artwork}`} alt="" aria-hidden className="h-full w-full object-contain" />
            }
            overlayBox={shot.placement}
          />
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 font-label-technical text-[9px] tracking-wide text-white/60 backdrop-blur-xl">
            <Camera className="size-3" aria-hidden /> Photo slot · {shot.file}
          </span>
        </div>

        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BASE_PATH}/photos/${shot.file}`}
            alt={shot.alt}
            loading={priority ? "eager" : "lazy"}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.04] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/10 to-transparent opacity-90" />

        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-space-sm p-space-md">
          <span className="flex flex-col gap-0.5">
            <span className="font-headline-md text-headline-md font-bold text-white">{shot.title}</span>
            <span className="font-label-technical text-[9px] uppercase tracking-widest text-white/50">{shot.meta}</span>
          </span>
          <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white/80 backdrop-blur-xl transition-all group-hover:bg-white/[0.16] group-hover:text-white">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </figcaption>
      </Link>
    </figure>
  );
}

export function LifestyleGallery() {
  return (
    <section id="worn" className="relative w-full bg-[#08080a] py-space-xl">
      <div className="pointer-events-none absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full bg-[#FF0D7B]/10 blur-[140px]" />
      <div className="relative z-10 mx-auto max-w-7xl px-gutter lg:px-gutter-lg">
        <div className="mb-space-xl flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <div>
            <span className="mb-space-xs block font-label-technical text-label-technical uppercase tracking-widest text-[#00E0F2] font-black">
              Worn in the wild
            </span>
            <h2 className="font-headline-xl text-headline-xl font-bold tracking-tight text-white">
              Real people, real prints
            </h2>
            <p className="mt-space-sm max-w-xl font-body-md text-body-md text-white/60">
              Single-piece orders shipped across India. Tag <span className="text-white">@aureline.atelier</span> and
              your fit may land here next.
            </p>
          </div>
          <Link href="/products" className="btn-glass group self-start px-space-lg py-space-sm md:self-auto">
            Shop the looks
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          {SHOTS.map((shot, i) => (
            <PhotoTile key={shot.file} shot={shot} priority={i < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
