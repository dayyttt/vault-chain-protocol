"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  mono?: boolean;
  icon?: ReactNode;
}

export function Input({ label, error, mono, icon, id, className = "", ...props }: InputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`w-full rounded-lg border border-border-subtle bg-bg-tertiary py-3 text-sm text-text-primary outline-none transition focus:border-accent-primary disabled:opacity-50 ${icon ? "pl-10 pr-4" : "px-4"} ${mono ? "font-mono" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-warning">{error}</p>}
    </div>
  );
}
