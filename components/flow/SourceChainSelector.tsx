"use client";

import { useEffect, useRef, useState } from "react";
import { ChainIcon } from "@/components/ui/ChainIcon";
import { SOURCE_CHAINS } from "@/lib/contracts/sourceChains";

interface SourceChainSelectorProps {
  value: number;
  disabled?: boolean;
  onChange: (chainId: number) => void;
}

/**
 * Picks which chain the ORIGINAL token lives on. Read-only selection —
 * never switches the wallet's network (that's the destination selector's job).
 */
export function SourceChainSelector({ value, disabled, onChange }: SourceChainSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const current = SOURCE_CHAINS.find((c) => c.id === value);

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Source network
      </span>
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2.5 text-sm font-medium text-text-primary transition hover:border-accent-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary disabled:opacity-50"
        >
          <ChainIcon chainId={value} className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{current?.name ?? `Chain ${value}`}</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border-subtle bg-bg-secondary p-1 shadow-xl"
          >
            {SOURCE_CHAINS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition hover:bg-bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary ${
                    c.id === value ? "text-accent-primary" : "text-text-primary"
                  }`}
                >
                  <ChainIcon chainId={c.id} className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{c.name}</span>
                  {c.id === value && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
