"use client";

import { useState } from "react";
import type { Hex } from "viem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CopyButton";
import { SiteNav } from "@/components/shared/SiteNav";
import { SourceChainSelector } from "@/components/flow/SourceChainSelector";
import { ChainRouteBadges } from "@/components/flow/ChainRouteBadges";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { useRegistryLookup } from "@/lib/hooks/useRegistryLookup";
import { SOURCE_CHAIN_ID, DESTINATION_CONTRACTS } from "@/lib/contracts/chainConfig";
import { isValidAddress } from "@/lib/utils/validation";
import { destinationAddressUrl, sourceAddressUrl } from "@/lib/utils/explorer";
import { truncateAddress } from "@/lib/utils/formatting";

type Mode = "origin-id" | "source";

const ORIGIN_ID_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function ExploreView() {
  const [mode, setMode] = useState<Mode>("source");
  const [originId, setOriginId] = useState("");
  const [sourceChainId, setSourceChainId] = useState<number>(SOURCE_CHAIN_ID);
  const [sourceToken, setSourceToken] = useState("");
  const { loading, result, notFound, error, lookup, reset } = useRegistryLookup();

  const originIdValid = ORIGIN_ID_PATTERN.test(originId.trim());
  const sourceValid = isValidAddress(sourceToken);
  const canSubmit = mode === "origin-id" ? originIdValid : sourceValid;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "origin-id") {
      lookup({ originTokenId: originId.trim() as Hex });
    } else {
      lookup({ sourceChainId, sourceToken: sourceToken.trim() as `0x${string}` });
    }
  };

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

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-24 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Explore wrappers</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Look up wrappers registered in the TokenRegistry on {DESTINATION_CONTRACTS.label}.
          </p>
        </div>

        <ChainRouteBadges />

        <Card className="space-y-4">
          <div
            role="tablist"
            aria-label="Search mode"
            className="flex gap-1 rounded-lg border border-border-subtle bg-bg-tertiary p-1"
          >
            {(
              [
                { key: "source", label: "Source network + address" },
                { key: "origin-id", label: "originTokenId" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={mode === t.key}
                onClick={() => {
                  setMode(t.key);
                  reset();
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary ${
                  mode === t.key
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "origin-id" ? (
              <Input
                id="origin-token-id"
                label="originTokenId"
                mono
                autoComplete="off"
                spellCheck={false}
                placeholder="0x…"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                error={
                  originId && !originIdValid ? "originTokenId must be bytes32 (0x + 64 hex)." : undefined
                }
              />
            ) : (
              <>
                <SourceChainSelector value={sourceChainId} onChange={setSourceChainId} />
                <Input
                  id="source-token"
                  label="Source token address"
                  mono
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0x…"
                  value={sourceToken}
                  onChange={(e) => setSourceToken(e.target.value)}
                  error={sourceToken && !sourceValid ? "That isn't a valid contract address." : undefined}
                />
              </>
            )}

            <Button type="submit" busy={loading} disabled={!canSubmit} className="w-full">
              Search
            </Button>
          </form>
        </Card>

        {error && (
          <Card className="flex items-start gap-2 border-warning/30 text-xs text-warning">
            <WarningTriangleIcon className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </Card>
        )}

        {notFound && (
          <Card className="space-y-1 text-center">
            <p className="text-sm font-semibold text-text-primary">No wrapper yet</p>
            <p className="text-xs text-text-tertiary">
              This token hasn&apos;t been cloned to {DESTINATION_CONTRACTS.label} yet.
            </p>
          </Card>
        )}

        {result && (
          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Wrapper found
            </p>
            <dl className="space-y-2 text-sm">
              {[
                {
                  label: "Wrapper",
                  value: result.token,
                  href: destinationAddressUrl(result.token),
                },
                {
                  label: "LP timelock",
                  value: result.lpTimelock,
                  href: destinationAddressUrl(result.lpTimelock),
                },
                {
                  label: "Creator",
                  value: result.creator,
                  href: destinationAddressUrl(result.creator),
                },
                { label: "originTokenId", value: result.originTokenId, href: null },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-text-tertiary">{row.label}</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    {row.href ? (
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-mono text-xs text-accent-primary underline underline-offset-2"
                      >
                        {truncateAddress(row.value, 6)}
                      </a>
                    ) : (
                      <span className="truncate font-mono text-xs text-text-primary">
                        {truncateAddress(row.value, 6)}
                      </span>
                    )}
                    <CopyButton value={row.value} />
                  </dd>
                </div>
              ))}
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-text-tertiary">Created</dt>
                <dd className="text-xs text-text-primary">
                  {new Date(result.createdAt * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC
                </dd>
              </div>
              {mode === "source" && sourceAddressUrl(sourceChainId, sourceToken.trim()) && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-text-tertiary">Source token</dt>
                  <dd>
                    <a
                      href={sourceAddressUrl(sourceChainId, sourceToken.trim()) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-accent-primary underline underline-offset-2"
                    >
                      {truncateAddress(sourceToken.trim(), 6)}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </main>
    </div>
  );
}
