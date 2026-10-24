"use client";

import * as React from "react";

/**
 * Viewport-wide mouse-tracing spotlight from the Aureline design.
 * Mounted once in the shop/admin/auth layouts so the trace follows the cursor
 * on every page, not just home. No-ops on touch devices and reduced motion.
 */
export function MouseSpotlight() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const root = document.documentElement;
    const onMove = (e: PointerEvent) => {
      root.style.setProperty("--mouse-x", `${((e.clientX / window.innerWidth) * 100).toFixed(2)}%`);
      root.style.setProperty("--mouse-y", `${((e.clientY / window.innerHeight) * 100).toFixed(2)}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return <div className="mouse-spotlight" aria-hidden />;
}
