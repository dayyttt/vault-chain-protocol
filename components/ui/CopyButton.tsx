"use client";

import { useEffect, useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={`${label} ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      className="shrink-0 rounded-md border border-border-subtle px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary transition hover:border-accent-primary/60 hover:text-accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
