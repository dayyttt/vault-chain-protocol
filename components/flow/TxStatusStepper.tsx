import type { FlowState } from "@/lib/types/flow.types";

/** The five transaction states required by spec §7. */
const STAGES = [
  { key: "PREPARING", label: "Preparing" },
  { key: "AWAITING_SIGNATURE", label: "Waiting for wallet confirmation" },
  { key: "TX_PENDING", label: "Pending on-chain" },
  { key: "SUCCESS", label: "Confirmed" },
] as const;

const ORDER: Record<string, number> = {
  PREPARING: 0,
  AWAITING_SIGNATURE: 1,
  TX_PENDING: 2,
  SUCCESS: 3,
};

export function TxStatusStepper({ state }: { state: FlowState }) {
  const failed = state === "ERROR_REJECTED";
  const current = ORDER[state];
  if (current === undefined && !failed) return null;

  return (
    <ol className="space-y-1.5" aria-label="Transaction status">
      {STAGES.map((stage, i) => {
        const done = current !== undefined && i < current;
        const active = current === i;
        return (
          <li key={stage.key} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                done
                  ? "border-success bg-success text-white"
                  : active
                    ? "border-accent-primary text-accent-primary"
                    : "border-border-subtle text-text-tertiary"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={
                active ? "font-semibold text-text-primary" : done ? "text-success" : "text-text-tertiary"
              }
            >
              {stage.label}
            </span>
            {active && stage.key !== "SUCCESS" && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            )}
          </li>
        );
      })}
      {failed && (
        <li className="flex items-center gap-2 text-xs font-semibold text-warning">
          <span
            aria-hidden
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-warning text-[9px]"
          >
            !
          </span>
          Failed / rejected
        </li>
      )}
    </ol>
  );
}
