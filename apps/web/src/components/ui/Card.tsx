import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", glow = false, className = "", ...props }, ref) => {
    const baseStyles =
      "rounded-lg border transition-all duration-150";

    const variantStyles = {
      default: "bg-surface-container-lowest border-outline-variant shadow-[0_1px_3px_0_rgba(24,24,27,0.04)]",
      elevated: "bg-surface-container-lowest border-outline-variant shadow-[0_4px_12px_0_rgba(24,24,27,0.06)]",
      interactive:
        "bg-surface-container-lowest border-outline-variant hover:border-primary/50 hover:shadow-[0_4px_12px_0_rgba(24,24,27,0.08)] cursor-pointer",
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
