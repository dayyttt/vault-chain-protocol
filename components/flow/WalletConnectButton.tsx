"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnectButton() {
  return (
    <div className="flex justify-center">
      <ConnectButton
        showBalance={false}
        accountStatus="address"
        chainStatus="none"
      />
    </div>
  );
}
