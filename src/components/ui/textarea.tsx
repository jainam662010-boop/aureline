import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-2xl border border-slate-900/[0.1] bg-slate-900/[0.04] px-4 py-3 text-body-md text-slate-900",
        "placeholder:text-secondary/50 backdrop-blur-md transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent",
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
