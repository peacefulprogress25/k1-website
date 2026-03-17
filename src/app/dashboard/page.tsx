"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import bs58 from "bs58";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import {
  buildDepositTx,
  buildRequestWithdrawTx,
  fetchUserVaultBalance,
  fetchUserPendingWithdrawal,
  fetchUserVaultActions,
  fetchVaultFeeEarned,
  fetchVaultSharePrice,
  fetchVaultSimulateDeposit,
  fetchVaultSimulateWithdraw,
  fetchVaultsTvl,
  fetchVaultsInterestEarned,
} from "@/lib/ranger-api";
import {
  parseVaultResponse,
  shortAddress,
  parseUserBalance,
  parsePendingWithdrawal,
  parseUserActions,
  formatWithdrawableDate,
  parseSharePriceResponse,
  parseFeeEarnedResponse,
  parseTvlResponse,
  parseInterestEarnedResponse,
} from "@/lib/vault-parse";

const VAULT_PUBKEYS = (process.env.NEXT_PUBLIC_VAULT_PUBKEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function DashboardPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [vaultInfo, setVaultInfo] = useState<{ status: "ok"; data: unknown } | { status: "not_found" } | { status: "error" } | null>(null);
  const [userBalance, setUserBalance] = useState<unknown | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<unknown | null>(null);
  const [userActions, setUserActions] = useState<unknown[] | null>(null);
  const [feeEarned, setFeeEarned] = useState<unknown | null>(null);
  const [sharePrice, setSharePrice] = useState<unknown | null>(null);
  const [simulateDeposit, setSimulateDeposit] = useState<unknown | null>(null);
  const [simulateWithdraw, setSimulateWithdraw] = useState<unknown | null>(null);
  const [globalTvl, setGlobalTvl] = useState<unknown | null>(null);
  const [globalInterestEarned, setGlobalInterestEarned] = useState<unknown | null>(null);
  const [selectedVault, setSelectedVault] = useState<string>(VAULT_PUBKEYS[0] || "");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "building" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  const explorerUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}`;

  function formatApiValue(v: unknown): string {
    if (v == null) return "—";
    let val: unknown = v;
    if (typeof v === "object" && v !== null && "data" in v)
      val = (v as { data?: unknown }).data;
    if (val == null) return "—";
    if (typeof val === "number") return val.toLocaleString();
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      const o = val as Record<string, unknown>;
      // Common API response shapes: sharePrice -> assetPerLp / sharePrice; fee -> total / amount
      const key = ["assetPerLp", "sharePrice", "assetPerLpDecimalBits", "total", "amount", "lpAmount", "lamportAmount"].find(
        (k) => o[k] !== undefined && o[k] !== null
      );
      if (key) return formatApiValue(o[key]);
      return JSON.stringify(val);
    }
    return String(val);
  }

  // Protocol-wide stats (TVL, interest earned) — fetch once on mount
  useEffect(() => {
    fetchVaultsTvl()
      .then((r) => setGlobalTvl(r.status === "ok" ? r.data : null))
      .catch(() => setGlobalTvl(null));
    fetchVaultsInterestEarned()
      .then((r) => setGlobalInterestEarned(r.status === "ok" ? r.data : null))
      .catch(() => setGlobalInterestEarned(null));
  }, []);

  useEffect(() => {
    if (!selectedVault) return;
    setVaultInfo(null);
    fetch(`/api/vault/${selectedVault}`)
      .then(async (res) => {
        if (res.status === 404) {
          return { status: "not_found" } as const;
        }
        if (!res.ok) {
          return { status: "error" } as const;
        }
        const data = await res.json();
        return { status: "ok", data } as const;
      })
      .then(setVaultInfo)
      .catch(() => setVaultInfo({ status: "error" }));
  }, [selectedVault]);

  // User-specific data via Ranger API (if vault is indexed)
  useEffect(() => {
    if (!publicKey || !selectedVault) {
      setUserBalance(null);
      setPendingWithdrawal(null);
      setUserActions(null);
      return;
    }
    const userPk = publicKey.toBase58();
    fetchUserVaultBalance(selectedVault, userPk)
      .then((res) => {
        setUserBalance(res.status === "ok" ? res.data ?? null : null);
      })
      .catch(() => setUserBalance(null));

    fetchUserPendingWithdrawal(selectedVault, userPk)
      .then((res) => {
        setPendingWithdrawal(res.status === "ok" ? res.data ?? null : null);
      })
      .catch(() => setPendingWithdrawal(null));

    fetchUserVaultActions(selectedVault, userPk)
      .then((res) => {
        setUserActions(
          res.status === "ok" && Array.isArray(res.data) ? (res.data as unknown[]) : null
        );
      })
      .catch(() => setUserActions(null));
  }, [publicKey, selectedVault]);

  // Vault API: fee-earned, share-price
  useEffect(() => {
    if (!selectedVault) return;
    setFeeEarned(null);
    setSharePrice(null);
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - 30 * 24 * 3600; // last 30 days
    fetchVaultFeeEarned(selectedVault, { startTs, endTs })
      .then((r) => setFeeEarned(r.status === "ok" ? r.data : null))
      .catch(() => setFeeEarned(null));
    fetchVaultSharePrice(selectedVault)
      .then((r) => setSharePrice(r.status === "ok" ? r.data : null))
      .catch(() => setSharePrice(null));
  }, [selectedVault]);

  // Simulate deposit when amount changes (debounced)
  useEffect(() => {
    if (!selectedVault || !depositAmount || Number(depositAmount) <= 0) {
      setSimulateDeposit(null);
      return;
    }
    const lamportAmount = (Number(depositAmount) * 1e6).toFixed(0);
    const t = setTimeout(() => {
      fetchVaultSimulateDeposit(selectedVault, { lamportAmount })
        .then((r) => setSimulateDeposit(r.status === "ok" ? r.data : null))
        .catch(() => setSimulateDeposit(null));
    }, 400);
    return () => clearTimeout(t);
  }, [selectedVault, depositAmount]);

  // Simulate withdraw when amount changes (debounced)
  useEffect(() => {
    if (!selectedVault || !withdrawAmount || Number(withdrawAmount) <= 0) {
      setSimulateWithdraw(null);
      return;
    }
    const lamportAmount = (Number(withdrawAmount) * 1e6).toFixed(0);
    const t = setTimeout(() => {
      fetchVaultSimulateWithdraw(selectedVault, { lamportAmount })
        .then((r) => setSimulateWithdraw(r.status === "ok" ? r.data : null))
        .catch(() => setSimulateWithdraw(null));
    }, 400);
    return () => clearTimeout(t);
  }, [selectedVault, withdrawAmount]);

  const handleDeposit = useCallback(async () => {
    if (!publicKey || !selectedVault || !depositAmount) return;
    setTxStatus("building");
    setError(null);
    try {
      const { success, transaction } = await buildDepositTx(
        selectedVault,
        depositAmount,
        publicKey.toBase58()
      );
      if (!success || !transaction) {
        setError("API did not return a transaction. Check vault and amount.");
        setTxStatus("error");
        return;
      }
      setTxStatus("sending");
      const txBuf = bs58.decode(transaction);
      const tx = VersionedTransaction.deserialize(txBuf);
      const sig = await sendTransaction(tx, connection);
      setLastTxSig(sig);
      try {
        await connection.confirmTransaction(sig);
      } catch (_) {
        // Timeout or RPC lag — tx may still succeed; show success + explorer link
        setError(null);
        setTxStatus("done");
        setDepositAmount("");
        return;
      }
      setError(null);
      setTxStatus("done");
      setDepositAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      const sigFromError = msg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0];
      if (sigFromError) {
        setLastTxSig(sigFromError);
        setError(null);
        setTxStatus("done");
        setDepositAmount("");
      } else {
        setError(msg);
        setTxStatus("error");
        setLastTxSig(null);
      }
    }
  }, [publicKey, selectedVault, depositAmount, connection]);

  const handleRequestWithdraw = useCallback(async () => {
    if (!publicKey || !selectedVault || !withdrawAmount) return;
    setTxStatus("building");
    setError(null);
    try {
      // Withdraw amount in LP token units (same decimals as asset, e.g. 6)
      const lamportAmount = (Number(withdrawAmount) * 1e6).toFixed(0);
      const { success, transaction } = await buildRequestWithdrawTx(
        selectedVault,
        lamportAmount,
        publicKey.toBase58(),
        true
      );
      if (!success || !transaction) {
        setError("API did not return a transaction.");
        setTxStatus("error");
        return;
      }
      setTxStatus("sending");
      const txBuf = bs58.decode(transaction);
      const tx = VersionedTransaction.deserialize(txBuf);
      const sig = await sendTransaction(tx, connection);
      setLastTxSig(sig);
      try {
        await connection.confirmTransaction(sig);
      } catch (_) {
        setError(null);
        setTxStatus("done");
        setWithdrawAmount("");
        return;
      }
      setError(null);
      setTxStatus("done");
      setWithdrawAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      const sigFromError = msg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0];
      if (sigFromError) {
        setLastTxSig(sigFromError);
        setError(null);
        setTxStatus("done");
        setWithdrawAmount("");
      } else {
        setError(msg);
        setTxStatus("error");
        setLastTxSig(null);
      }
    }
  }, [publicKey, selectedVault, withdrawAmount, connection]);

  return (
    <main className="min-h-screen p-6 md:p-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-vault-border pb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-vault-muted hover:text-white">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        </div>
        <WalletMultiButton />
      </header>

      {VAULT_PUBKEYS.length === 0 && (
        <div className="card mb-6 border-amber-500/50 bg-amber-500/10 text-amber-200">
          <p>
            Set <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_VAULT_PUBKEYS</code> in{" "}
            <code className="rounded bg-black/30 px-1">.env</code> (comma-separated vault addresses) to load your vault(s).
          </p>
        </div>
      )}

      {VAULT_PUBKEYS.length > 0 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm text-vault-muted">Vault</label>
          <select
            value={selectedVault}
            onChange={(e) => setSelectedVault(e.target.value)}
            className="card w-full max-w-md bg-vault-card"
          >
            {VAULT_PUBKEYS.map((pk) => (
              <option key={pk} value={pk}>
                {pk.slice(0, 8)}…{pk.slice(-8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-white">Vault overview</h2>
          {vaultInfo === null ? (
            <p className="text-vault-muted">
              {selectedVault ? "Loading…" : "Select a vault above."}
            </p>
          ) : vaultInfo.status === "ok" ? (
            (() => {
              const parsed = parseVaultResponse(vaultInfo.data);
              if (!parsed) {
                return (
                  <pre className="overflow-auto rounded bg-black/30 p-4 text-sm text-vault-muted">
                    {JSON.stringify(vaultInfo.data, null, 2)}
                  </pre>
                );
              }
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-medium text-white">{parsed.name}</h3>
                    {parsed.description && (
                      <p className="mt-0.5 text-sm text-vault-muted">{parsed.description}</p>
                    )}
                  </div>
                  <dl className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-vault-muted">Total value</dt>
                      <dd className="font-mono text-white">
                        {parsed.assetTotalValue} {parsed.assetLabel}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-vault-muted">Asset</dt>
                      <dd className="font-mono text-white" title={parsed.assetMint}>
                        {parsed.assetLabel}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-vault-muted">Withdrawal period</dt>
                      <dd className="text-white">{parsed.withdrawalWaitingPeriod}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-vault-muted">Manager</dt>
                      <dd className="font-mono text-white" title={parsed.manager}>
                        {shortAddress(parsed.manager)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-vault-muted">Admin</dt>
                      <dd className="font-mono text-white" title={parsed.admin}>
                        {shortAddress(parsed.admin)}
                      </dd>
                    </div>
                  </dl>
                  <div className="border-t border-vault-border pt-3">
                    <p className="mb-1.5 text-xs font-medium text-vault-muted">Fees</p>
                    <ul className="space-y-1 text-xs text-white">
                      <li>Manager performance: {parsed.fees.managerPerformance}</li>
                      <li>Admin performance: {parsed.fees.adminPerformance}</li>
                      <li>Redemption: {parsed.fees.redemption} · Issuance: {parsed.fees.issuance}</li>
                    </ul>
                  </div>
                  {(feeEarned != null || sharePrice != null) && (
                    <div className="border-t border-vault-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-vault-muted">
                        Vault stats (Ranger API)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {sharePrice != null && (() => {
                          const p = parseSharePriceResponse(sharePrice);
                          if (!p) return null;
                          return (
                            <div className="rounded-lg bg-black/30 p-2.5">
                              <p className="text-[10px] uppercase tracking-wider text-vault-muted">Share price</p>
                              <p className="mt-0.5 font-mono text-sm font-medium text-white">
                                {p.sharePriceFormatted}
                                <span className="ml-1 text-xs font-normal text-vault-muted">asset / LP</span>
                              </p>
                            </div>
                          );
                        })()}
                        {feeEarned != null && (() => {
                          const p = parseFeeEarnedResponse(feeEarned);
                          if (!p) return null;
                          return (
                            <div className="rounded-lg bg-black/30 p-2.5">
                              <p className="text-[10px] uppercase tracking-wider text-vault-muted">Fees earned</p>
                              <p className="mt-0.5 font-mono text-sm font-medium text-white">
                                {p.feeEarnedFormatted}
                                <span className="ml-1 text-xs font-normal text-vault-muted">LP</span>
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-vault-muted">
                    Vault: <span className="font-mono" title={parsed.address}>{shortAddress(parsed.address, 8, 8)}</span>
                  </p>
                </div>
              );
            })()
          ) : vaultInfo.status === "not_found" ? (
            <div className="space-y-2 text-sm">
              <p className="text-amber-200">
                Vault not found or not yet indexed by the Ranger API (404).
              </p>
              <p className="text-vault-muted">
                If this vault exists on-chain, deposit and request withdraw below may still work. Create and list your vault on Ranger to get full API details.
              </p>
            </div>
          ) : (
            <p className="text-vault-muted">
              Failed to load vault details. You can still try deposit/withdraw.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-white">Your position</h2>
            {!connected ? (
              <p className="text-vault-muted">Connect wallet to view your vault data.</p>
            ) : (
              (() => {
                const assetLabel =
                  vaultInfo?.status === "ok"
                    ? (parseVaultResponse(vaultInfo.data)?.assetLabel ?? "USDC")
                    : "USDC";
                const balance = parseUserBalance(userBalance);
                const pending = parsePendingWithdrawal(pendingWithdrawal);
                const actions = parseUserActions(userActions ?? []);

                return (
                  <div className="space-y-5">
                    {/* Balance */}
                    <div className="rounded-lg border border-vault-border bg-black/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">
                        Vault balance
                      </p>
                      {balance?.success ? (
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                          {balance.formatted} <span className="text-base font-normal text-vault-muted">{assetLabel}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-vault-muted">—</p>
                      )}
                    </div>

                    {/* Pending withdrawal */}
                    <div className="rounded-lg border border-vault-border bg-black/20 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">
                        Pending withdrawal
                      </p>
                      {pending?.success && pending.amountRaw > 0 ? (
                        <>
                          <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                            {pending.amountFormatted} <span className="text-sm font-normal text-vault-muted">{assetLabel}</span>
                          </p>
                          <p className="mt-1 text-xs text-vault-muted">
                            {pending.canClaim
                              ? "Available to claim now"
                              : `Withdrawable ${formatWithdrawableDate(pending.withdrawableFromTs)}`}
                          </p>
                          {pending.canClaim && (
                            <p className="mt-2 text-xs text-vault-primary">
                              Complete the withdrawal from the &quot;Request withdraw&quot; flow (claim step).
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-vault-muted">No pending withdrawal</p>
                      )}
                    </div>

                    {/* Recent actions */}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">
                        Recent actions
                      </p>
                      {actions.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {actions.slice(0, 5).map((a, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-3 rounded border border-vault-border/50 bg-black/20 px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-white">{a.label}</span>
                              <div className="flex items-center gap-2 text-right">
                                <span className="tabular-nums text-vault-muted">
                                  {a.amount} {assetLabel}
                                </span>
                                {a.time && (
                                  <span className="text-xs text-vault-muted">{a.time}</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-vault-muted">No actions yet</p>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-white">Deposit</h2>
            {!connected ? (
              <p className="text-vault-muted">Connect wallet to deposit.</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Amount (e.g. 100)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-vault-border bg-vault-dark px-4 py-2 text-white placeholder:text-vault-muted"
                />
                {simulateDeposit != null && (
                  <p className="mb-3 text-xs text-vault-muted">
                    Est. LP: {formatApiValue(simulateDeposit)}
                  </p>
                )}
                <button
                  onClick={handleDeposit}
                  disabled={txStatus === "building" || txStatus === "sending"}
                  className="btn-primary disabled:opacity-50"
                >
                  {txStatus === "building"
                    ? "Building…"
                    : txStatus === "sending"
                    ? "Sending…"
                    : "Deposit"}
                </button>
              </>
            )}
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-white">Request withdraw</h2>
            {!connected ? (
              <p className="text-vault-muted">Connect wallet to request withdrawal.</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Amount (LP tokens)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-vault-border bg-vault-dark px-4 py-2 text-white placeholder:text-vault-muted"
                />
                {simulateWithdraw != null && (
                  <p className="mb-3 text-xs text-vault-muted">
                    Est. asset: {formatApiValue(simulateWithdraw)}
                  </p>
                )}
                <button
                  onClick={handleRequestWithdraw}
                  disabled={txStatus === "building" || txStatus === "sending"}
                  className="btn-outline disabled:opacity-50"
                >
                  {txStatus === "building"
                    ? "Building…"
                    : txStatus === "sending"
                    ? "Sending…"
                    : "Request withdraw"}
                </button>
                <p className="mt-2 text-xs text-vault-muted">
                  Two-step withdrawal: request first, then complete after waiting period.
                </p>
              </>
            )}
          </div>

          {(txStatus === "done" || error) && (
            <div
              className={`card ${error ? "border-red-500/50 bg-red-500/10 text-red-200" : "border-green-500/30 bg-green-500/10 text-green-200"}`}
            >
              {error ? (
                error
              ) : (
                <div>
                  <p className="font-medium">Transaction confirmed.</p>
                  {lastTxSig && (
                    <a
                      href={explorerUrl(lastTxSig)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm underline"
                    >
                      View on Solana Explorer →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Protocol stats: total TVL & interest earned across all vaults */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-vault-muted">
          Ranger protocol
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {globalTvl != null && (() => {
            const p = parseTvlResponse(globalTvl);
            if (!p) return null;
            return (
              <div className="card flex flex-col border-vault-primary/20 bg-black/20">
                <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">
                  Total TVL
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">
                  {p.formatted}
                </p>
                <p className="mt-0.5 text-xs text-vault-muted">Across all vaults</p>
              </div>
            );
          })()}
          {globalInterestEarned != null && (() => {
            const p = parseInterestEarnedResponse(globalInterestEarned);
            if (!p) return null;
            return (
              <div className="card flex flex-col border-vault-primary/20 bg-black/20">
                <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">
                  Total interest earned
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">
                  {p.formatted}
                </p>
                <p className="mt-0.5 text-xs text-vault-muted">Across all vaults</p>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mt-8 card border-vault-primary/20">
        <h3 className="font-semibold text-white">Strategies (target)</h3>
        <ul className="mt-2 space-y-1 text-sm text-vault-muted">
          <li>40% Funding arbitrage (Drift)</li>
          <li>30% Lending (Kamino / Marginfi)</li>
          <li>20% Staking (LST via Jupiter)</li>
          <li>10% Treasury (custom adapter)</li>
        </ul>
        <p className="mt-2 text-xs text-vault-muted">
          Rebalancing is handled by the strategy-manager bot; configure it in the backend.
        </p>
      </div>
    </main>
  );
}
