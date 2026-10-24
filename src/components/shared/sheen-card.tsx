"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card wrapper that tracks the pointer so the `.sheen-hover` cursor-following
 * highlight (globals.css) has real coordinates. No-ops on touch devices.
 */
export function SheenCard({
  as: Tag = "div",
  className,
  children,
  ...props
}: {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);

  const onMove = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--card-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--card-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <Tag ref={ref} onPointerMove={onMove} className={cn("sheen-hover", className)} {...props}>
      {children}
    </Tag>
  );
}
