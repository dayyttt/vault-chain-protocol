import type { ReactNode } from "react";

interface ModalProps {
  titleId: string;
  children: ReactNode;
}

export function Modal({ titleId, children }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border-subtle bg-bg-secondary p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
