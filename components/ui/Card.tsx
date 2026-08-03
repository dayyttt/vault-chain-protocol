import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ elevated, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-border-subtle ${elevated ? "bg-bg-tertiary" : "bg-bg-secondary"} p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}
