"use client";

import { Button } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";

interface ErrorToastProps {
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorToast({ message, onRetry, onClose }: ErrorToastProps) {
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-error/30 bg-bg-secondary p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-primary">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="shrink-0 text-text-tertiary hover:text-text-primary"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry} className="mt-3">
          Try again
        </Button>
      )}
    </div>
  );
}
