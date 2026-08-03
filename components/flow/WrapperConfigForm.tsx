"use client";

import { Input } from "@/components/ui/Input";
import { CoinsIcon } from "@/components/ui/icons";
import { LOCK_DURATION_OPTIONS } from "@/lib/utils/launchParams";
import { isValidDecimalString } from "@/lib/utils/validation";

interface WrapperConfigFormProps {
  name: string;
  symbol: string;
  supply: string;
  liquidityAmount: string;
  slippageBps: number;
  lockDurationDays: number | null;
  customUnlockIso: string;
  disabled?: boolean;
  onLiquidityChange: (v: string) => void;
  onSlippageChange: (bps: number) => void;
  onLockDurationChange: (days: number) => void;
  onCustomUnlockChange: (iso: string) => void;
}

export function WrapperConfigForm({
  name,
  symbol,
  supply,
  liquidityAmount,
  slippageBps,
  lockDurationDays,
  customUnlockIso,
  disabled,
  onLiquidityChange,
  onSlippageChange,
  onLockDurationChange,
  onCustomUnlockChange,
}: WrapperConfigFormProps) {
  const liquidityInvalid = liquidityAmount.length > 0 && !isValidDecimalString(liquidityAmount);
  const slippagePercent = (slippageBps / 100).toString();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="wrapper-name"
          label="Wrapper name (from source)"
          value={name}
          readOnly
          aria-readonly="true"
          title="Copied from the source ERC-20 contract"
          className="cursor-not-allowed opacity-75"
          error={name.trim() ? undefined : "The source contract did not return a name."}
        />
        <Input
          id="wrapper-symbol"
          label="Wrapper symbol (from source)"
          value={symbol}
          readOnly
          aria-readonly="true"
          title="Copied from the source ERC-20 contract"
          className="cursor-not-allowed opacity-75"
          error={symbol.trim() ? undefined : "The source contract did not return a symbol."}
        />
      </div>

      <div>
        <Input
          id="wrapper-supply"
          label="Wrapper total supply (fixed from source)"
          icon={<CoinsIcon className="h-4 w-4" />}
          inputMode="decimal"
          value={supply}
          readOnly
          aria-readonly="true"
          title="Copied from the source ERC-20 totalSupply()"
          className="cursor-not-allowed opacity-75"
        />
        <p className="mt-1.5 text-xs text-text-tertiary">
          Copied automatically from the source token&apos;s totalSupply(). This entire amount is sent
          to the DEX pool as initial liquidity and cannot be edited here.
        </p>
      </div>

      <Input
        id="liquidity-amount"
        label="Native liquidity (ETH)"
        icon={<CoinsIcon className="h-4 w-4" />}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.05"
        value={liquidityAmount}
        disabled={disabled}
        onChange={(e) => onLiquidityChange(e.target.value)}
        error={liquidityInvalid ? "Enter a valid decimal number." : undefined}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="slippage"
          className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary"
        >
          Slippage tolerance (%)
        </label>
        <div className="flex flex-wrap gap-2">
          {[50, 100, 300].map((bps) => (
            <button
              key={bps}
              type="button"
              disabled={disabled}
              onClick={() => onSlippageChange(bps)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary disabled:opacity-50 ${
                slippageBps === bps
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle bg-bg-tertiary text-text-secondary hover:border-accent-primary/60"
              }`}
            >
              {bps / 100}%
            </button>
          ))}
          <input
            id="slippage"
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            disabled={disabled}
            value={slippagePercent}
            onChange={(e) => {
              const pct = Number(e.target.value);
              if (Number.isFinite(pct)) onSlippageChange(Math.round(pct * 100));
            }}
            className="w-24 rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-1.5 text-xs text-text-primary outline-none transition focus:border-accent-primary disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          LP lock duration
        </span>
        <div className="flex flex-wrap gap-2">
          {LOCK_DURATION_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              disabled={disabled}
              onClick={() => onLockDurationChange(days)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary disabled:opacity-50 ${
                lockDurationDays === days
                  ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                  : "border-border-subtle bg-bg-tertiary text-text-secondary hover:border-accent-primary/60"
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
        <label htmlFor="custom-unlock" className="mt-2 block text-xs text-text-tertiary">
          Or a custom unlock date (UTC)
        </label>
        <input
          id="custom-unlock"
          type="datetime-local"
          disabled={disabled}
          value={customUnlockIso}
          onChange={(e) => onCustomUnlockChange(e.target.value)}
          className="w-full rounded-lg border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
}
