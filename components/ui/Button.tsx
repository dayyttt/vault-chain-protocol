"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  /** Periodic light sweep across the button — reserve for the one primary CTA on screen. */
  shine?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-primary text-white hover:bg-accent-primary-hover disabled:bg-bg-tertiary disabled:text-text-tertiary",
  secondary:
    "border border-border-subtle text-text-primary hover:bg-bg-tertiary disabled:border-transparent disabled:bg-bg-tertiary disabled:text-text-tertiary",
  ghost: "text-text-secondary hover:text-text-primary disabled:text-text-tertiary",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-4 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  busy,
  shine,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || busy;

  return (
    <button
      disabled={isDisabled}
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold transition disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {shine && !isDisabled && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-white/25 animate-[button-shine_3s_ease-in-out_infinite]" />
      )}
      {busy && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
