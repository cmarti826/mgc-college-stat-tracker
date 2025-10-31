// components/Button.tsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--mgc-blue)] disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-[var(--mgc-red)] text-white hover:bg-[#8f1b2a] shadow-sm",
        secondary: "bg-[var(--mgc-blue)] text-white hover:bg-[#2f2e5a] shadow-sm",
        outline:
          "border border-gray-300 bg-white text-[var(--mgc-blue)] hover:bg-gray-50 hover:border-gray-400",
        ghost:
          "bg-transparent text-[var(--mgc-blue)] hover:bg-gray-100 hover:text-[var(--mgc-red)]",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, icon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
        <span>{children}</span>
      </Comp>
    );
  }
);

Button.displayName = "Button";