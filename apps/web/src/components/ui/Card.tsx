import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", glow = false, className = "", ...props }, ref) => {
    const baseStyles =
      "rounded-2xl border transition-all duration-200 backdrop-blur-md";

    const variantStyles = {
      default: "bg-zinc-900/60 border-zinc-800/80 shadow-md",
      elevated: "bg-zinc-900/90 border-zinc-800 shadow-xl",
      interactive:
        "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-lg cursor-pointer",
    };

    const glowStyles = glow
      ? "relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-r before:from-purple-500/20 before:via-indigo-500/20 before:to-pink-500/20 before:-z-10 before:blur-sm"
      : "";

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${glowStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

