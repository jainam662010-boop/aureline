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
          "text-white bg-gradient-to-r from-volt-red via-volt-pink to-volt-violet shadow-[0_0_24px_rgba(255,13,123,0.4)] hover:shadow-[0_0_36px_rgba(0,224,242,0.5)] hover:brightness-110",
        glass:
          "text-white backdrop-blur-2xl bg-white/[0.05] border border-white/[0.14] hover:bg-white/[0.1] hover:border-white/30",
        outline:
          "text-white/85 bg-white/[0.06] border border-white/15 hover:bg-white/[0.12] hover:text-white",
        ghost: "text-white/70 hover:text-white hover:bg-white/[0.08]",
        danger:
          "text-white bg-gradient-to-r from-[#93000a] to-[#c0000a] hover:brightness-110 shadow-[0_0_18px_rgba(192,0,10,0.35)]",
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
