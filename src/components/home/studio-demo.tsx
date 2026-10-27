"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SlidersHorizontal, CloudUpload, Wand2, BadgeCheck } from "lucide-react";
import { GarmentMockup } from "@/components/shared/garment-mockup";

const PRESETS = [
  { key: "acid", name: "Acid Metal", tag: "Cyber Glyph", accent: "#2563EB", glow: "rgba(37,99,235,0.8)" },
  { key: "brutalist", name: "Brutalist Typo", tag: "Swiss Metric", accent: "#D97706", glow: "rgba(217,119,6,0.8)" },
  { key: "tokyo", name: "Neo Tokyo", tag: "Hyper CMYK", accent: "#0891B2", glow: "rgba(6,182,212,0.8)" },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

export function StudioDemo() {
  const [active, setActive] = React.useState<PresetKey>("acid");

  const applyDemo = React.useCallback(() => {
    setActive((current) => {
      const idx = PRESETS.findIndex((p) => p.key === current);
      return PRESETS[(idx + 1) % PRESETS.length]!.key;
    });
    toast.success("High-resolution vector asset applied (300 DPI cured)", {
      duration: 2400,
      style: { background: "linear-gradient(90deg,#2563EB,#0EA5E9)", border: "1px solid rgba(255,255,255,0.2)" },
    });
  }, []);

  const preset = PRESETS.find((p) => p.key === active)!;

  return (
    <section className="w-full bg-[#FFFFFF] py-space-xl relative">
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-[#7C3AED]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs font-label-technical text-label-technical uppercase tracking-widest text-[#0891B2] mb-space-xs">
              <SlidersHorizontal className="size-4" aria-hidden />
              <span>Tactile web engine</span>
            </div>
            <h2 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">
              Live print &amp; fabric displacement
            </h2>
          </div>
          <p className="font-body-md text-body-md text-slate-700 max-w-md">
            Preview artwork scaled to millimetre accuracy. Test high-density DTF curing layers on dark fabrics before
            ordering a single unit.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
          <div className="lg:col-span-5 glass-panel p-space-lg flex flex-col justify-between glass-card-hover shadow-[0_8px_32px_0_rgba(37,99,235,0.14)]">
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg font-bold text-slate-900">Art placement console</span>
                <span className="pill-tech text-[#0891B2]">A3 format</span>
              </div>

              <button
                type="button"
                onClick={applyDemo}
                className="backdrop-blur-md bg-slate-900/[0.02] border border-dashed border-slate-900/[0.1] hover:border-[#0EA5E9] p-space-lg rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-900/[0.05]"
              >
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#0EA5E9] flex items-center justify-center mb-space-sm text-white shadow-[0_0_20px_rgba(14,165,233,0.5)]">
                  <CloudUpload className="size-6" aria-hidden />
                </span>
                <span className="font-label-lg text-label-lg text-slate-900 font-semibold mb-1">
                  Drop PNG, PDF or SVG (300 DPI)
                </span>
                <span className="font-body-sm text-body-sm text-slate-500">
                  Up to 10 MB with transparent alpha channel
                </span>
              </button>

              <div>
                <span className="label-tech">Quick demo artwork presets</span>
                <div className="grid grid-cols-3 gap-space-xs">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setActive(p.key)}
                      aria-pressed={active === p.key}
                      className={`p-space-sm rounded-xl bg-slate-900/[0.05] border text-slate-900 transition-all text-left hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] ${
                        active === p.key ? "border-[#0EA5E9] bg-slate-900/[0.1]" : "border-slate-900/[0.1] hover:border-slate-900/[0.1]"
                      }`}
                    >
                      <span className="font-label-md text-label-md block font-bold">{p.name}</span>
                      <span className="font-label-technical text-[9px]" style={{ color: p.accent }}>
                        {p.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-space-xs pt-space-xs">
                <ToggleRow icon={Wand2} color="#0891B2" title="AI background remover" subtitle="Cleans halo noise on raster edges" defaultChecked />
                <ToggleRow icon={BadgeCheck} color="#7C3AED" title="Auto 300 DPI vector scale" subtitle="Sub-pixel anti-aliased DTF rasterizer" defaultChecked />
              </div>
            </div>

            <div className="mt-space-lg pt-space-md backdrop-blur-xl bg-white/80 border border-slate-900/10 p-space-md rounded-2xl flex items-center justify-between gap-space-sm shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)]">
              <div>
                <span className="label-tech mb-0">Estimated production (1 pc)</span>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-headline-lg text-headline-lg font-bold text-slate-900">₹682</span>
                  <span className="font-label-technical text-label-technical text-[#0891B2]">INCL. TAX</span>
                </div>
                <span className="font-label-technical text-[10px] text-slate-500">Base tee ₹520 + DTF transfer ₹162</span>
              </div>
              <Link href="/products" className="btn-gradient px-space-md py-space-sm font-bold">
                Order single spec
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 glass-panel p-space-md flex flex-col justify-between relative overflow-hidden glass-card-hover shadow-[0_8px_32px_0_rgba(124,58,237,0.18)]">
            <div className="flex items-center justify-between z-20 relative">
              <div className="flex items-center gap-space-xs backdrop-blur-2xl bg-white/90 border border-slate-900/10 px-space-md py-space-xs rounded-full shadow-[0_10px_24px_-22px_rgba(15,23,42,0.5)]">
                <span className="font-label-technical text-label-technical text-[#0EA5E9] font-bold">TARGET:</span>
                <span className="font-label-technical text-label-technical text-slate-900 uppercase tracking-widest">
                  Chest centre · 12&quot; × 16&quot; max
                </span>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="pill-tech">{preset.tag}</span>
              </div>
            </div>

            <div className="relative w-full h-[420px] flex items-center justify-center my-space-md">
              <GarmentMockup
                type="tee"
                color="#E9F0F9"
                className="h-full w-auto"
                overlay={
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-space-sm text-center backdrop-blur-sm bg-white/55 rounded-xl border-2 border-dashed transition-all"
                    style={{ borderColor: `${preset.accent}cc`, boxShadow: `0 0 30px ${preset.glow}55` }}
                  >
                    <PresetArt preset={active} accent={preset.accent} glow={preset.glow} />
                  </div>
                }
                overlayStyle={{ top: "20%", left: "26%", width: "46%", height: "34%" }}
              />
            </div>

            <div className="grid grid-cols-3 gap-space-sm backdrop-blur-xl bg-white/85 border border-slate-900/10 p-space-sm rounded-2xl z-20 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.45)]">
              <div>
                <span className="font-label-technical text-[9px] text-slate-500 uppercase block">Fabric base</span>
                <span className="font-label-md text-label-md text-slate-900 font-bold">280 GSM Compact</span>
              </div>
              <div>
                <span className="font-label-technical text-[9px] text-slate-500 uppercase block">Print finish</span>
                <span className="font-label-md text-label-md text-slate-900 font-bold">Matte Polyurethane</span>
              </div>
              <div>
                <span className="font-label-technical text-[9px] text-slate-500 uppercase block">Elongation</span>
                <span className="text-gradient-fire font-label-md font-black">98% no crack</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  icon: Icon,
  color,
  title,
  subtitle,
  defaultChecked,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
  color: string;
  title: string;
  subtitle: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = React.useState(Boolean(defaultChecked));
  return (
    <label className="flex items-center justify-between p-space-sm bg-slate-900/[0.03] border border-slate-900/[0.06] rounded-xl cursor-pointer hover:bg-slate-900/[0.05] transition-colors">
      <span className="flex items-center gap-space-xs">
        <Icon className="size-[18px]" style={{ color }} aria-hidden />
        <span className="flex flex-col">
          <span className="font-label-md text-label-md text-slate-900 font-semibold">{title}</span>
          <span className="font-body-sm text-[11px] text-slate-500">{subtitle}</span>
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="w-5 h-5 accent-[#2563EB] rounded cursor-pointer"
        aria-label={title}
      />
    </label>
  );
}

function PresetArt({ preset, accent, glow }: { preset: PresetKey; accent: string; glow: string }) {
  if (preset === "acid") {
    return (
      <>
        <svg viewBox="0 0 100 100" className="w-20 h-20" fill="none" style={{ color: accent, filter: `drop-shadow(0 0 12px ${glow})` }} aria-hidden>
          <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="3" />
          <path d="M30 50 L70 50 M50 30 L50 70" stroke="currentColor" strokeWidth="3" />
        </svg>
        <span className="font-label-technical text-[#0891B2] uppercase tracking-widest mt-space-xs font-bold">ACID-CYBER 04</span>
      </>
    );
  }
  if (preset === "brutalist") {
    return (
      <>
        <div className="flex flex-col items-center justify-center border-2 border-slate-900/10 p-2">
          <span className="font-display-hero text-headline-md font-black text-slate-900 tracking-tighter leading-none">AURELINE</span>
          <span className="font-label-technical text-[8px] bg-white text-black px-1 tracking-widest mt-1 font-bold">NEW DELHI ATELIER</span>
          <span className="font-label-technical text-[7px] font-mono mt-1" style={{ color: accent }}>
            LAT 28.6139° N
          </span>
        </div>
        <span className="font-label-technical text-[#0EA5E9] uppercase tracking-widest mt-space-xs font-bold">SWISS BRUTAL 01</span>
      </>
    );
  }
  return (
    <>
      <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center" style={{ borderColor: accent, filter: `drop-shadow(0 0 12px ${glow})` }}>
        <span className="font-display-hero text-headline-lg font-black" style={{ color: accent }}>
          無
        </span>
      </div>
      <span className="font-label-technical text-[10px] text-[#0EA5E9] uppercase tracking-widest mt-2 font-bold">NEO TOKYO CMYK</span>
    </>
  );
}
