import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-body-md text-on-surface",
        "placeholder:text-secondary/50 backdrop-blur-md transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[#FF3B30] focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
