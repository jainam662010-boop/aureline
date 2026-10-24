"use client";

import * as React from "react";
import { APP_NAME } from "@/lib/constants";

/**
 * One-time kinetic intro (2.8s) + mouse-following spotlight, ported from the
 * supplied design. Skipped for reduced-motion users and after first view in a
 * session so repeat navigation stays fast.
 */
export function KineticIntro() {
  const [visible, setVisible] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState("INITIALIZING MATRIX");

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem("aureline-intro") === "1";

    let raf = 0;
    if (!reduced && !seen) {
      setVisible(true);
      sessionStorage.setItem("aureline-intro", "1");
      const start = performance.now();
      const duration = 2600;

      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.floor(eased * 100);
        setProgress(value);
        if (value > 75) setStatus("MOUNTING DTF ATELIER");
        else if (value > 40) setStatus("CALIBRATING 300 DPI CARRIERS");

        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setStatus("ENGINE READY");
          window.setTimeout(() => setExiting(true), 200);
          window.setTimeout(() => setVisible(false), 1100);
        }
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {visible ? (
        <aside
          aria-label={`Loading ${APP_NAME}`}
          className={`fixed inset-0 z-[100] bg-[#070709] flex flex-col justify-between p-6 sm:p-12 select-none overflow-hidden transition-all duration-[850ms] ${
            exiting ? "intro-exit" : ""
          }`}
        >
          <div className="absolute inset-0 noise-grid pointer-events-none opacity-40" />
          <div className="absolute -top-32 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-[#FF3B30]/15 via-[#8026F2]/10 to-transparent blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between text-white/60 font-mono text-[11px] uppercase tracking-widest border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] animate-ping" />
              <span className="text-white font-semibold">{APP_NAME.toUpperCase()}</span>
              <span className="text-white/30">{"//"}</span>
              <span className="text-white/70">ARCHITECTURAL DTF CORE</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-white/40">
              <span>LAT 28.6139° N / LONG 77.2090° E</span>
              <span>INDEX {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-[#00E0F2]">STATUS:</span>
              <span className="text-white">{status}</span>
            </div>
          </div>

          <div className="relative z-10 max-w-4xl my-auto py-12">
            <div className="mb-3">
              <span className="block font-mono text-xs uppercase tracking-[0.28em] text-[#FF0D7B] font-semibold animate-bounce-in [animation-delay:100ms]">
                ENGINEERING STREETWEAR AT SCALE
              </span>
            </div>
            <div>
              <h2 className="font-display-hero text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05]">
                <span className="block animate-bounce-in [animation-delay:260ms]">BACKING CREATORS.</span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#FF3B30] via-[#FF0D7B] to-[#00E0F2] animate-bounce-in [animation-delay:480ms]">
                  ZERO COMPROMISE.
                </span>
              </h2>
            </div>
            <div className="mt-4">
              <p className="font-mono text-sm sm:text-base text-white/50 max-w-xl tracking-tight animate-pop-in [animation-delay:760ms]">
                {"// 240–450 GSM COMPACT BLANKS · 5-LAYER DTF · ZERO MINIMUM ORDER"}
              </p>
            </div>
          </div>

          <div className="relative z-10 w-full flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">SYSTEM SYNCHRONIZATION</span>
                <span className="font-mono text-xs text-white/70">Pan-India Express Dispatch Rails</span>
              </div>
              <div className="flex items-baseline font-display-hero text-white font-black tracking-tighter">
                <span className="text-5xl sm:text-7xl lg:text-8xl tabular-nums leading-none">
                  {progress < 10 ? `0${progress}` : progress}
                </span>
                <span className="text-xl sm:text-3xl text-[#FF0D7B] font-mono ml-1">%</span>
              </div>
            </div>
            <div className="w-full h-2px bg-white/[0.08] relative overflow-hidden rounded-full" style={{ height: 2 }}>
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#FF3B30] via-[#FF0D7B] to-[#00E0F2] shadow-[0_0_12px_rgba(255,13,123,0.8)] transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
