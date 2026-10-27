import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-label-lg text-label-lg transition-all duration-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "text-white bg-gradient-to-r from-volt-red via-volt-pink to-volt-violet shadow-[0_0_24px_rgba(14,165,233,0.4)] hover:shadow-[0_0_36px_rgba(6,182,212,0.5)] hover:brightness-110",
        glass:
          "text-slate-900 backdrop-blur-2xl bg-slate-900/[0.05] border border-slate-900/[0.1] hover:bg-slate-900/[0.08] hover:border-slate-900/[0.1]",
        outline:
          "text-slate-800 bg-slate-900/[0.05] border border-slate-900/[0.1] hover:bg-slate-900/[0.09] hover:text-slate-900",
        ghost: "text-slate-700 hover:text-slate-900 hover:bg-slate-900/[0.06]",
        danger:
          "text-white bg-gradient-to-r from-[#E11D48] to-[#BE123C] hover:brightness-110 shadow-[0_0_18px_rgba(192,0,10,0.35)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-label-md",
        md: "h-11 px-6",
        lg: "h-12 px-8 py-3",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
