"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import type { Hash } from "viem";
import { useDeployFlow } from "@/lib/hooks/useDeployFlow";
import { useOriginTokenId } from "@/lib/hooks/useOriginTokenId";
import { useClonePreview } from "@/lib/hooks/useClonePreview";
import { useDestinationReadiness } from "@/lib/hooks/useDestinationReadiness";
import { useLaunchAndLock } from "@/lib/hooks/useLaunchAndLock";
import {
  DESTINATION_CHAIN_ID,
  DESTINATION_CONTRACTS,
  SOURCE_CHAIN_ID,
  getLaunchFeeGateway,
} from "@/lib/contracts/chainConfig";
import { launchFeeGatewayAbi } from "@/lib/contracts/launchFeeGateway";
import { isValidAddress, isValidDecimalString } from "@/lib/utils/validation";
import { getSourceChain, getSourcePublicClient, isSourceChainSupported } from "@/lib/contracts/sourceChains";
import {
  buildLaunchParams,
  unlockDateFromDays,
  DEADLINE_SECONDS,
  type LaunchParams,
} from "@/lib/utils/launchParams";
import { useNowSeconds } from "@/lib/hooks/useNowSeconds";
import { evaluateLaunchGate } from "@/lib/utils/launchGate";
import { UnofficialCloneBanner } from "@/components/shared/UnofficialCloneBanner";
import { SiteNav } from "@/components/shared/SiteNav";
import { ErrorToast } from "@/components/shared/ErrorToast";
import { WalletConnectButton } from "@/components/flow/WalletConnectButton";
import { WalletStatusBar } from "@/components/flow/WalletStatusBar";
import { ChainRouteBadges } from "@/components/flow/ChainRouteBadges";
import { SourceChainSelector } from "@/components/flow/SourceChainSelector";
import { TokenAddressInput } from "@/components/flow/TokenAddressInput";
import { SourceTokenBoard } from "@/components/flow/SourceTokenBoard";
import { WrapperConfigForm } from "@/components/flow/WrapperConfigForm";
import { ClonePreviewPanel } from "@/components/flow/ClonePreviewPanel";
import { DeploySummary } from "@/components/flow/DeploySummary";
import { SuccessModal } from "@/components/flow/SuccessModal";
import { Card } from "@/components/ui/Card";

const DEBOUNCE_MS = 500;

export function DeployFlow() {
  const { status, address } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const {
    data,
    onWalletConnecting,
    onWalletConnected,
    setSourceChain,
    setTokenAddress,
    setLiquidity,
    setSlippage,
    setLockDuration,
    setCustomUnlock,
    fetchMetadata,
    deploy,
    retry,
    clearError,
    reset,
  } = useDeployFlow();

  const { data: originTokenId } = useOriginTokenId(data.sourceChainId, data.tokenAddress);
  const destination = useDestinationReadiness();
  const { launchAndLock } = useLaunchAndLock();

  const prevStatusRef = useRef(status);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [acknowledgedTokenId, setAcknowledgedTokenId] = useState<string | null>(null);
  const [paidFee, setPaidFee] = useState<{ originTokenId: string; payer: string; txHash: string } | null>(null);
  const [feePending, setFeePending] = useState(false);
  const acknowledged =
    data.metadata != null && acknowledgedTokenId === data.metadata.address;

  useEffect(() => {
    const prev = prevStatusRef.current;
    const idleOrConnecting = data.state === "IDLE" || data.state === "WALLET_CONNECTING";
    if (status === "connecting" && idleOrConnecting) onWalletConnecting();
    if (status === "connected" && idleOrConnecting) onWalletConnected();
    if (prev === "connecting" && status === "disconnected") {
      setWalletError("Wallet connection was cancelled.");
    }
    if (prev === "connected" && status === "disconnected") {
      setWalletError("Wallet disconnected. Reconnect to continue.");
    }
    prevStatusRef.current = status;
  }, [status, data.state, onWalletConnecting, onWalletConnected]);

  // The address field commonly contains a token copied from the network currently open in
  // MetaMask.  Before a token has been successfully loaded, make that network the source
  // automatically.  Once metadata exists we deliberately keep the chosen source: the fee
  // flow later switches the wallet to the destination and must not erase the loaded token.
  useEffect(() => {
    if (
      status !== "connected" ||
      data.metadata ||
      data.state === "FETCHING_METADATA" ||
      !isSourceChainSupported(walletChainId) ||
      walletChainId === data.sourceChainId
    ) {
      return;
    }
    setSourceChain(walletChainId);
  }, [status, walletChainId, data.sourceChainId, data.metadata, data.state, setSourceChain]);

  // Debounced source-chain metadata read.
  useEffect(() => {
    const addr = data.tokenAddress.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isValidAddress(addr)) return;
    debounceRef.current = setTimeout(
      () => fetchMetadata(data.sourceChainId, addr as `0x${string}`),
      DEBOUNCE_MS,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tokenAddress, data.sourceChainId]);

  const nowSeconds = useNowSeconds();

  const unlockDate = useMemo(() => {
    if (data.lockDurationDays != null) {
      if (!nowSeconds) return null;
      return unlockDateFromDays(data.lockDurationDays, new Date(nowSeconds * 1000));
    }
    if (!data.customUnlockIso) return null;
    // datetime-local has no zone; the spec treats the entered value as UTC.
    const parsed = new Date(`${data.customUnlockIso}:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [data.lockDurationDays, data.customUnlockIso, nowSeconds]);

  // LaunchParams drives both the CREATE2 preview and the write — built once here.
  const launchParams: LaunchParams | null = useMemo(() => {
    if (!originTokenId || !unlockDate || !nowSeconds || !data.metadata) return null;
    if (!data.metadata.name?.trim() || !data.metadata.symbol?.trim()) return null;
    if (!isValidDecimalString(data.metadata.totalSupply)) return null;
    if (!isValidDecimalString(data.liquidityAmount)) return null;
    if (!DESTINATION_CONTRACTS.dexRouter) return null;
    try {
      return buildLaunchParams({
        originTokenId: originTokenId as `0x${string}`,
        name: data.metadata.name.trim(),
        symbol: data.metadata.symbol.trim(),
        supply: data.metadata.totalSupply,
        nativeLiquidity: data.liquidityAmount,
        slippageBps: data.slippageBps,
        unlockTime: unlockDate,
        dexRouter: DESTINATION_CONTRACTS.dexRouter,
        nowSeconds,
      });
    } catch {
      return null;
    }
  }, [
    originTokenId,
    unlockDate,
    data.metadata,
    data.liquidityAmount,
    data.slippageBps,
    nowSeconds,
  ]);

  const preview = useClonePreview(launchParams);

  const originTokenIdHex = typeof originTokenId === "string" ? originTokenId : null;
  const feeGateway = getLaunchFeeGateway(data.sourceChainId);
  const feeConfigured = !!feeGateway && feeGateway.length > 0;
  const paidSourceFee =
    feeConfigured &&
    !!originTokenIdHex &&
    !!address &&
    !!paidFee &&
    paidFee.originTokenId.toLowerCase() === originTokenIdHex.toLowerCase() &&
    paidFee.payer.toLowerCase() === address.toLowerCase();
  // Each source network requires its own fee payment before a new clone can launch.
  const feeSatisfied = feeConfigured && paidSourceFee;

  const handlePayFee = async () => {
    if (!feeGateway || !originTokenIdHex || !address) return;
    try {
      if (walletChainId !== data.sourceChainId) {
        await switchChainAsync({ chainId: data.sourceChainId });
        setWalletError(`Wallet switched to ${getSourceChain(data.sourceChainId)?.name ?? "the source network"}. Click Pay fee once more to confirm it.`);
        return;
      }
      const client = getSourcePublicClient(data.sourceChainId);
      if (!client) throw new Error("No source-network RPC is configured.");
      const amount = (await client.readContract({
        address: feeGateway,
        abi: launchFeeGatewayAbi,
        functionName: "LAUNCH_FEE",
      })) as bigint;
      setFeePending(true);
      const hash = await writeContractAsync({
        chainId: data.sourceChainId,
        address: feeGateway,
        abi: launchFeeGatewayAbi,
        functionName: "payFee",
        args: [originTokenIdHex as `0x${string}`, BigInt(DESTINATION_CHAIN_ID)],
        value: amount,
      });
      const receipt = await client.waitForTransactionReceipt({ hash: hash as Hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error("The source-chain fee transaction reverted.");
      setPaidFee({ originTokenId: originTokenIdHex, payer: address, txHash: hash });
      // Once the source-side fee is final, immediately request the destination switch so the
      // user can continue with the Base/OP liquidity transaction without hunting for a network menu.
      try {
        await switchChainAsync({ chainId: DESTINATION_CHAIN_ID });
      } catch {
        setWalletError(`Fee paid. Switch to ${DESTINATION_CONTRACTS.label} to launch with liquidity.`);
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Couldn't pay the source-chain launch fee.");
    } finally {
      setFeePending(false);
    }
  };

  const onDestinationChain = walletChainId === DESTINATION_CHAIN_ID;
  const busy =
    data.state === "PREPARING" ||
    data.state === "AWAITING_SIGNATURE" ||
    data.state === "TX_PENDING";

  const { canLaunch: canDeploy } = evaluateLaunchGate({
    state: data.state,
    walletConnected: status === "connected",
    onDestinationChain,
    destinationReady: destination.ready,
    hasLaunchParams: launchParams != null,
    existingClone: preview.existing,
    previewLoading: preview.loading,
    feePaid: feeSatisfied,
    acknowledged,
  });

  const handleDeploy = () => {
    if (!launchParams || !data.metadata) return;
    const { chainId, address } = data.metadata;
    // Rebuild with the wall-clock time at submit so the 20-minute deadline is fresh,
    // rather than whatever the memo captured on its last tick.
    const fresh: LaunchParams = {
      ...launchParams,
      deadline: BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS),
    };
    deploy((onSig, onHash) => launchAndLock(fresh, chainId, address, onSig, onHash));
  };

  const connected = status === "connected";
  const inFlow = connected || data.state === "WALLET_CONNECTING";

  return (
    <div className="min-h-screen">
      <UnofficialCloneBanner />

      <header
        className={`mx-auto flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-8 sm:px-6 ${inFlow ? "max-w-5xl" : "max-w-4xl"}`}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-accent-primary">
            VAULT
          </span>
          <SiteNav />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WalletStatusBar onSwitchError={setWalletError} allowDestinationSwitch={feeSatisfied} />
          <WalletConnectButton />
        </div>
      </header>

      <main className={`mx-auto px-4 pb-24 sm:px-6 ${inFlow ? "max-w-5xl" : "max-w-4xl"}`}>
        {data.state === "WALLET_CONNECTING" ? (
          <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 py-10 text-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            <p className="text-sm text-text-secondary">Connecting wallet…</p>
          </Card>
        ) : !connected ? (
          <div className="space-y-6 py-10">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Clone tokens.
              <br />
              Lock liquidity.
            </h1>
            <p className="max-w-md text-sm text-text-secondary">
              Read an ERC-20 from the source network, then deploy its wrapper along with a
              liquidity pool whose LP tokens are locked on the destination network.
            </p>
            <ChainRouteBadges />
            <WalletConnectButton />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            <ChainRouteBadges />

            <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                    Clone &amp; lock liquidity
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    Pick a source network and paste a token contract address to get started.
                  </p>
                </div>

                <Card className="space-y-4">
                  <SourceChainSelector
                    value={data.sourceChainId}
                    disabled={busy}
                    onChange={setSourceChain}
                  />
                  <TokenAddressInput
                    value={data.tokenAddress}
                    disabled={busy}
                    onChange={setTokenAddress}
                  />
                </Card>

                {(data.state === "FETCHING_METADATA" || data.metadata) && (
                  <div className="animate-[fade-slide-in_0.35s_ease-out]">
                    <SourceTokenBoard
                      loading={data.state === "FETCHING_METADATA"}
                      metadata={data.metadata}
                      originTokenId={originTokenId as string | undefined}
                    />
                  </div>
                )}

                {data.metadata && (
                  <Card className="animate-[fade-slide-in_0.35s_ease-out]">
                    <WrapperConfigForm
                      name={data.metadata.name ?? ""}
                      symbol={data.metadata.symbol ?? ""}
                      supply={data.metadata.totalSupply}
                      liquidityAmount={data.liquidityAmount}
                      slippageBps={data.slippageBps}
                      lockDurationDays={data.lockDurationDays}
                      customUnlockIso={data.customUnlockIso}
                      disabled={busy}
                      onLiquidityChange={setLiquidity}
                      onSlippageChange={setSlippage}
                      onLockDurationChange={setLockDuration}
                      onCustomUnlockChange={setCustomUnlock}
                    />
                  </Card>
                )}

                {data.metadata && <ClonePreviewPanel preview={preview} />}
              </div>

              <div className="lg:sticky lg:top-24">
                <DeploySummary
                  metadata={data.metadata}
                  wrapperName={data.metadata?.name ?? ""}
                  wrapperSymbol={data.metadata?.symbol ?? ""}
                  wrapperSupply={data.metadata?.totalSupply ?? ""}
                  liquidityAmount={data.liquidityAmount}
                  slippageBps={data.slippageBps}
                  unlockDate={unlockDate}
                  state={data.state}
                  canDeploy={canDeploy}
                  onDeploy={handleDeploy}
                  acknowledged={acknowledged}
                  onAcknowledgedChange={(checked) =>
                    setAcknowledgedTokenId(checked ? (data.metadata?.address ?? null) : null)
                  }
                  onDestinationChain={onDestinationChain}
                  destination={destination}
                  existingClone={preview.existing}
                  sourceFee={{
                    configured: feeConfigured,
                    paid: paidSourceFee,
                    paying: feePending,
                    txHash: paidFee?.txHash ?? null,
                    needsNetworkSwitch: walletChainId !== data.sourceChainId,
                    sourceLabel: getSourceChain(data.sourceChainId)?.name ?? `Chain ${data.sourceChainId}`,
                    onPay: handlePayFee,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {data.state === "SUCCESS" && data.deployResult && (
        <SuccessModal
          result={data.deployResult}
          sourceFeeTxHash={paidFee?.txHash ?? null}
          onReset={reset}
        />
      )}

      {data.state === "ERROR_REJECTED" && data.error && (
        <ErrorToast message={data.error} onRetry={retry} onClose={retry} />
      )}

      {data.state === "FORM_READY" && data.error && (
        <ErrorToast
          message={data.error}
          onRetry={
            isValidAddress(data.tokenAddress)
              ? () =>
                  fetchMetadata(data.sourceChainId, data.tokenAddress.trim() as `0x${string}`)
              : undefined
          }
          onClose={clearError}
        />
      )}

      {walletError && data.state !== "ERROR_REJECTED" && !data.error && (
        <ErrorToast message={walletError} onClose={() => setWalletError(null)} />
      )}
    </div>
  );
}
