import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SiteNav } from "@/components/shared/SiteNav";
import { ChainRouteBadges } from "@/components/flow/ChainRouteBadges";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { SOURCE_CONTRACTS, DESTINATION_CONTRACTS } from "@/lib/contracts/chainConfig";

export const metadata: Metadata = {
  title: "Docs — VAULT",
  description: "App flow, CREATE2, LP timelock, router configuration, and risks.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pb-4 pt-8 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-accent-primary">
            VAULT
          </span>
          <SiteNav />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-24 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Documentation</h1>
          <p className="mt-1 text-sm text-text-secondary">
            How VAULT works, what it doesn&apos;t do, and the risks you should understand.
          </p>
        </div>

        <Card className="flex items-start gap-3 border-warning/30 bg-warning/5">
          <WarningTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-warning">This is not a bridge.</p>
            <p className="text-text-secondary">
              VAULT does not move your tokens across chains and does not lock the source token. It
              deploys a separate new <em>wrapper</em> token on the destination network with the name,
              symbol, and supply you choose. That wrapper has no on-chain link to, claim on, or value
              guarantee from the original token.
            </p>
          </div>
        </Card>

        <ChainRouteBadges />

        <Section title="App flow">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Pick a source network and paste the ERC-20 contract address you want to clone.</li>
            <li>
              The frontend reads <code>name</code>, <code>symbol</code>, <code>decimals</code>, and{" "}
              <code>totalSupply</code> straight from the source network&apos;s RPC.
            </li>
            <li>
              <code>originTokenId</code> is derived on-chain via{" "}
              <code>OriginIdHelper.fromEvm(sourceChainId, sourceToken)</code> — never hashed in the
              frontend.
            </li>
            <li>
              Configure the wrapper name/symbol, total supply, native liquidity, slippage, and LP
              lock duration.
            </li>
            <li>
              Switch your wallet to {DESTINATION_CONTRACTS.label}, then call{" "}
              <code>launchAndLock</code> on the UniversalFactory.
            </li>
            <li>The wrapper and its LP timelock are created on the destination network in one transaction.</li>
          </ol>
        </Section>

        <Section title="CREATE2 and deterministic addresses">
          <p>
            The wrapper is deployed with CREATE2 using a salt derived from{" "}
            <code>originTokenId</code>, so its address can be predicted before the transaction is
            sent. The app shows that prediction via <code>predictTokenAddress</code>.
          </p>
          <p>
            The wrapper address will be identical across chains <strong>only if</strong> the{" "}
            <code>UniversalFactory</code> address and every bytecode-forming parameter are identical
            on those chains. Treat this as information, not a guarantee.
          </p>
        </Section>

        <Section title="LP timelock">
          <p>
            The entire wrapper supply is paired with the native liquidity you deposit to form a DEX
            pool, and the resulting LP tokens are locked in a timelock contract until the unlock time
            you picked (30/90/180/365 days, or a custom UTC date).
          </p>
          <p>
            Locked LP reduces the risk of a sudden liquidity pull, but it does not remove other
            risks such as price volatility or actions by whoever holds the supply.
          </p>
        </Section>

        <Section title="Router configuration">
          <p>
            Liquidity is added through a Uniswap V2-compatible router on the destination network —
            the router must expose <code>addLiquidityETH</code>. The router and every destination
            contract are checked for deployed bytecode before the launch button is enabled; if any
            is missing, launching is refused.
          </p>
          <p>
            Slippage tolerance is computed entirely with <code>bigint</code> basis points, with no
            floating point, and the transaction <code>deadline</code> is set 20 minutes from
            submission.
          </p>
        </Section>

        <Section title="Risks">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>A wrapper can be used to impersonate a well-known token — always verify its origin.</li>
            <li>The contracts are unaudited; there is no absolute security guarantee.</li>
            <li>
              A supply that is too large can exceed Uniswap V2&apos;s <code>uint112</code> reserve
              limit.
            </li>
            <li>Slippage set too tight can cause the transaction to revert.</li>
            <li>Deposited native liquidity cannot be withdrawn before the LP timelock expires.</li>
          </ul>
        </Section>

        <Section title="Current network configuration">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Source: {SOURCE_CONTRACTS.label} (chain ID {SOURCE_CONTRACTS.chainId}) — read-only.
            </li>
            <li>
              Destination: {DESTINATION_CONTRACTS.label} (chain ID {DESTINATION_CONTRACTS.chainId}) —
              deployment, liquidity, and LP timelock.
            </li>
          </ul>
        </Section>

        <p className="border-t border-border-subtle pt-6 text-xs text-text-tertiary">
          Disclaimer: VAULT is not a bridge and is not affiliated with any token team. No audit is
          claimed and no security is guaranteed. Use at your own risk.
        </p>
      </main>
    </div>
  );
}
