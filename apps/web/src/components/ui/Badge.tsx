import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "emerald" | "amber" | "zinc" | "red";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "purple",
  size = "md",
  dot = false,
  className = "",
}) => {
  const variantStyles = {
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700/50",
    red: "bg-red-500/10 text-red-300 border-red-500/30",
  };

  const dotColors = {
    purple: "bg-purple-400 shadow-purple-500/50",
    emerald: "bg-emerald-400 shadow-emerald-500/50",
    amber: "bg-amber-400 shadow-amber-500/50",
    zinc: "bg-zinc-400",
    red: "bg-red-400 shadow-red-500/50",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shadow-sm`}
        />
      )}
      {children}
    </span>
  );
};

