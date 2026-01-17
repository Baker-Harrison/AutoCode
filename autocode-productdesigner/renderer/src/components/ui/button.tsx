import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zed-border-focused disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-zed-border bg-zed-element text-zed-text hover:bg-zed-element-hover",
        secondary: "border-zed-border-alt bg-transparent text-zed-text-muted hover:text-zed-text hover:bg-zed-element-hover",
        ghost: "border-transparent text-zed-text-muted hover:text-zed-text hover:bg-zed-element-hover",
        destructive: "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-10 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
