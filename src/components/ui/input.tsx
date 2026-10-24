import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-body-md text-on-surface",
        "placeholder:text-secondary/50 backdrop-blur-md transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[#FF3B30] focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-label-md file:text-white",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
