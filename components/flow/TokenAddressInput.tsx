"use client";

import { Input } from "@/components/ui/Input";
import { CrosshairIcon } from "@/components/ui/icons";
import { isValidAddress } from "@/lib/utils/validation";

interface TokenAddressInputProps {
  value: string;
  disabled?: boolean;
  onChange: (address: string) => void;
}

export function TokenAddressInput({ value, disabled, onChange }: TokenAddressInputProps) {
  const valid = isValidAddress(value);

  return (
    <Input
      id="token-address"
      label="Source token contract address"
      icon={<CrosshairIcon className="h-4 w-4" />}
      mono
      autoComplete="off"
      spellCheck={false}
      placeholder="0x..."
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      error={value && !valid ? "That isn't a valid contract address." : undefined}
    />
  );
}
