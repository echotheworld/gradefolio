import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gold" | "outline" | "destructive" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98]";

    const variants = {
      primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] border border-blue-700/20 focus-visible:ring-[#2563EB] shadow-xs",
      secondary: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-700 focus-visible:ring-slate-900 shadow-xs",
      gold: "bg-[#FBBF24] text-amber-950 hover:bg-[#F59E0B] border border-amber-300 shadow-xs focus-visible:ring-[#FBBF24]",
      outline: "border border-slate-200/90 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-[#2563EB] shadow-2xs",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-xs",
      ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      link: "text-[#2563EB] underline-offset-4 hover:underline p-0 h-auto hover:text-[#1D4ED8]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
