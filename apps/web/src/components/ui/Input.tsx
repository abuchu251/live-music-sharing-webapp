import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-on-surface">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-tertiary pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg bg-surface border text-on-surface placeholder-tertiary/70 text-sm py-2.5 transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary ${
              leftIcon ? "pl-10" : "pl-3.5"
            } ${rightIcon ? "pr-10" : "pr-3.5"} ${
              error
                ? "border-error focus:border-error focus:ring-error"
                : "border-outline-variant hover:border-tertiary/60"
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-tertiary">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-xs text-error font-medium">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
