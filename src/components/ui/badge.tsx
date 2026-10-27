import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-label-technical text-label-technical uppercase tracking-widest border backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-slate-900/[0.05] border-slate-900/[0.1] text-slate-800",
        brand: "bg-[#2563EB]/12 border-[#2563EB]/40 text-[#2563EB]",
        pink: "bg-[#0EA5E9]/12 border-[#0EA5E9]/40 text-[#0284C7]",
        violet: "bg-[#7C3AED]/15 border-[#7C3AED]/40 text-[#6D28D9]",
        cyan: "bg-[#0891B2]/12 border-[#0891B2]/40 text-[#0E7490]",
        success: "bg-[#22c55e]/12 border-[#22c55e]/40 text-[#047857]",
        warning: "bg-[#D97706]/12 border-[#D97706]/40 text-[#B45309]",
        danger: "bg-[#E11D48]/25 border-[#F43F5E]/40 text-[#BE123C]",
        solid: "bg-white text-black border-transparent",
      },
      size: {
        sm: "px-2 py-0.5 text-[9px]",
        md: "px-3 py-1",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
