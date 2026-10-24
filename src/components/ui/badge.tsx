import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-label-technical text-label-technical uppercase tracking-widest border backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] border-white/10 text-white/80",
        brand: "bg-[#FF3B30]/12 border-[#FF3B30]/40 text-[#FF6B62]",
        pink: "bg-[#FF0D7B]/12 border-[#FF0D7B]/40 text-[#FF6BC0]",
        violet: "bg-[#8026F2]/15 border-[#8026F2]/40 text-[#B08CFF]",
        cyan: "bg-[#00E0F2]/12 border-[#00E0F2]/40 text-[#66EFFA]",
        success: "bg-[#22c55e]/12 border-[#22c55e]/40 text-[#7ef0a8]",
        warning: "bg-[#FF8C26]/12 border-[#FF8C26]/40 text-[#FFC084]",
        danger: "bg-[#93000a]/25 border-[#ff5545]/40 text-[#ff9d95]",
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
