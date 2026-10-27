import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full appearance-none rounded-2xl border border-slate-900/[0.1] bg-slate-900/[0.04] px-4 pr-10 text-body-md text-slate-900",
      "backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>option]:bg-[#FFFFFF] [&>option]:text-slate-900",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
