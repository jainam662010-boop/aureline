"use client";

import * as React from "react";

/** Loads an image URL into an HTMLImageElement for Konva. */
export function useImage(src?: string | null): [HTMLImageElement | null, "loading" | "loaded" | "error"] {
  const [state, setState] = React.useState<{ img: HTMLImageElement | null; status: "loading" | "loaded" | "error" }>({
    img: null,
    status: src ? "loading" : "error",
  });

  React.useEffect(() => {
    if (!src) {
      setState({ img: null, status: "error" });
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setState({ img, status: "loaded" });
    };
    img.onerror = () => {
      if (!cancelled) setState({ img: null, status: "error" });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return [state.img, state.status];
}

/** Loads many images at once (clipart / multi-layer rendering). */
export function useImages(sources: Record<string, string | undefined>) {
  const [images, setImages] = React.useState<Record<string, HTMLImageElement | null>>({});
  const keys = Object.keys(sources).sort().join("|");

  React.useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(sources);
    entries.forEach(([key, src]) => {
      if (!src) return;
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelled) setImages((prev) => ({ ...prev, [key]: img }));
      };
      img.onerror = () => {
        if (!cancelled) setImages((prev) => ({ ...prev, [key]: null }));
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  return images;
}
