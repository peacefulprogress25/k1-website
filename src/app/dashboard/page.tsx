"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction } from "@solana/web3.js";
import {
  buildDepositTx,
  buildWithdrawTx,
  buildRequestWithdrawTx,
  fetchUserVaultActions,
  fetchUserPendingWithdrawal,
  fetchUserVaultBalance,
  fetchVaultFeeEarned,
  fetchVaultSharePrice,
  fetchVaultSimulateDeposit,
  fetchVaultSimulateWithdraw,
  fetchVaultsInterestEarned,
  fetchVaultsTvl,
} from "@/lib/ranger-api";
import {
  formatWithdrawableDate,
  parseFeeEarnedResponse,
  parseInterestEarnedResponse,
  parsePendingWithdrawal,
  parseSharePriceResponse,
  parseTvlResponse,
  parseUserActions,
  parseUserBalance,
  parseVaultResponse,
  shortAddress,
} from "@/lib/vault-parse";

const VAULT_PUBKEYS = (process.env.NEXT_PUBLIC_VAULT_PUBKEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const STRATEGY_ALLOCATION = [
  { label: "sHYUSD", value: 40, tone: "bg-[#e26815]" },
  { label: "USD*", value: 30, tone: "bg-[#1f1f1f]" },
  { label: "uWatt", value: 20, tone: "bg-[#8f8f8f]" },
  { label: "USDv", value: 10, tone: "bg-[#d7d7d7]" },
];

type VaultInfoState =
  | { status: "ok"; data: unknown }
  | { status: "not_found" }
  | { status: "error" }
  | null;

function formatApiValue(v: unknown): string {
  if (v == null) return "--";
  let val: unknown = v;
  if (typeof v === "object" && v !== null && "data" in v) {
    val = (v as { data?: unknown }).data;
  }
  if (val == null) return "--";
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    const key = [
      "assetPerLp",
      "sharePrice",
      "assetPerLpDecimalBits",
      "total",
      "amount",
      "lpAmount",
      "lamportAmount",
    ].find((candidate) => o[candidate] !== undefined && o[candidate] !== null);
    if (key) return formatApiValue(o[key]);
    return JSON.stringify(val);
  }
  return String(val);
}

function buildChartPath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: values.length === 1 ? width : (index / (values.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  }));
  if (points.length === 1) {
    return `M 0 ${points[0].y.toFixed(2)} L ${width} ${points[0].y.toFixed(2)}`;
  }
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX.toFixed(2)} ${current.y.toFixed(2)}, ${controlX.toFixed(2)} ${next.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}

function getChartPoint(value: number, index: number, values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return {
    x: values.length === 1 ? width : (index / (values.length - 1)) * width,
    y: height - ((value - min) / range) * height,
  };
}

function formatMoney(value: string | null | undefined, fallback = "--") {
  if (!value) return fallback;
  return value;
}

function TerminalStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#d9d9d9] bg-white px-4 py-4">
      <p className="dashboard-label dashboard-eyebrow">{label}</p>
      <p className="dashboard-value mt-2 text-[2rem] leading-none text-[#0f1720]">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [mounted, setMounted] = useState(false);

  const [vaultInfo, setVaultInfo] = useState<VaultInfoState>(null);
  const [userBalance, setUserBalance] = useState<unknown | null>(null);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<unknown | null>(null);
  const [userActions, setUserActions] = useState<unknown[] | null>(null);
  const [feeEarned, setFeeEarned] = useState<unknown | null>(null);
  const [sharePrice, setSharePrice] = useState<unknown | null>(null);
  const [sharePriceSeries, setSharePriceSeries] = useState<
    Array<{ ts: number; value: number; label: string }>
  >([]);
  const [simulateDeposit, setSimulateDeposit] = useState<unknown | null>(null);
  const [simulateWithdraw, setSimulateWithdraw] = useState<unknown | null>(null);
  const [globalTvl, setGlobalTvl] = useState<unknown | null>(null);
  const [globalInterestEarned, setGlobalInterestEarned] = useState<unknown | null>(null);
  const [selectedVault, setSelectedVault] = useState<string>(VAULT_PUBKEYS[0] || "");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [tradeMode, setTradeMode] = useState<"deposit" | "withdraw">("deposit");
  const [txStatus, setTxStatus] = useState<"idle" | "building" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parsedVault = vaultInfo?.status === "ok" ? parseVaultResponse(vaultInfo.data) : null;
  const parsedSharePrice = parseSharePriceResponse(sharePrice);
  const parsedFeeEarned = parseFeeEarnedResponse(feeEarned);
  const parsedTvl = parseTvlResponse(globalTvl);
  const parsedInterestEarned = parseInterestEarnedResponse(globalInterestEarned);
  const parsedBalance = parseUserBalance(userBalance);
  const parsedPending = parsePendingWithdrawal(pendingWithdrawal);
  const parsedActions = parseUserActions(userActions ?? []);
  const assetLabel = parsedVault?.assetLabel ?? "USDC";
  const chartValues = useMemo(() => {
    if (sharePriceSeries.length > 0) {
      return sharePriceSeries.map((point) => point.value);
    }
    const numeric = Number(String(parsedSharePrice?.sharePriceFormatted ?? "1.0204").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(numeric) && numeric > 0 ? [numeric] : [1.0204];
  }, [parsedSharePrice?.sharePriceFormatted, sharePriceSeries]);
  const chartPath = useMemo(() => buildChartPath(chartValues, 1000, 180), [chartValues]);
  const latestChartValue = chartValues[chartValues.length - 1];
  const latestChartLabel =
    sharePriceSeries[sharePriceSeries.length - 1]?.label ?? "Latest";
  const marketPrice =
    parsedSharePrice?.sharePriceFormatted && parsedSharePrice.sharePriceFormatted !== "--"
      ? parsedSharePrice.sharePriceFormatted
      : latestChartValue != null
      ? latestChartValue.toFixed(4)
      : "--";
  const latestPoint = useMemo(
    () => getChartPoint(latestChartValue ?? 1.0204, chartValues.length - 1, chartValues, 1000, 180),
    [chartValues, latestChartValue]
  );
  const chartMin = chartValues.length > 0 ? Math.min(...chartValues) : null;
  const chartMax = chartValues.length > 0 ? Math.max(...chartValues) : null;
  const chartTicks = useMemo(() => {
    if (sharePriceSeries.length >= 4) {
      const indices = [0, Math.floor((sharePriceSeries.length - 1) / 3), Math.floor(((sharePriceSeries.length - 1) * 2) / 3), sharePriceSeries.length - 1];
      return indices.map((index) => {
        const point = sharePriceSeries[index];
        return {
          x: sharePriceSeries.length === 1 ? 1000 : (index / (sharePriceSeries.length - 1)) * 1000,
          label: point.label,
        };
      });
    }
    return [];
  }, [sharePriceSeries]);

  const explorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}`;

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
        if (res.status === 404) return { status: "not_found" } as const;
        if (!res.ok) return { status: "error" } as const;
        return { status: "ok", data: await res.json() } as const;
      })
      .then(setVaultInfo)
      .catch(() => setVaultInfo({ status: "error" }));
  }, [selectedVault]);

  useEffect(() => {
    if (!publicKey || !selectedVault) {
      setUserBalance(null);
      setPendingWithdrawal(null);
      setUserActions(null);
      return;
    }
    const userPk = publicKey.toBase58();
    fetchUserVaultBalance(selectedVault, userPk)
      .then((res) => setUserBalance(res.status === "ok" ? res.data ?? null : null))
      .catch(() => setUserBalance(null));
    fetchUserPendingWithdrawal(selectedVault, userPk)
      .then((res) => setPendingWithdrawal(res.status === "ok" ? res.data ?? null : null))
      .catch(() => setPendingWithdrawal(null));
    fetchUserVaultActions(selectedVault, userPk)
      .then((res) =>
        setUserActions(res.status === "ok" && Array.isArray(res.data) ? (res.data as unknown[]) : null)
      )
      .catch(() => setUserActions(null));
  }, [publicKey, selectedVault]);

  useEffect(() => {
    if (!selectedVault) return;
    setFeeEarned(null);
    setSharePrice(null);
    setSharePriceSeries([]);
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - 30 * 24 * 3600;
    fetchVaultFeeEarned(selectedVault, { startTs, endTs })
      .then((r) => setFeeEarned(r.status === "ok" ? r.data : null))
      .catch(() => setFeeEarned(null));
    fetchVaultSharePrice(selectedVault)
      .then((r) => setSharePrice(r.status === "ok" ? r.data : null))
      .catch(() => setSharePrice(null));

    const sampleCount = 18;
    const interval = Math.floor((endTs - startTs) / (sampleCount - 1));
    const sampleTs = Array.from({ length: sampleCount }, (_, index) =>
      startTs + index * interval
    );
    Promise.all(
      sampleTs.map(async (ts) => {
        const result = await fetchVaultSharePrice(selectedVault, ts);
        if (result.status !== "ok") return null;
        const parsed = parseSharePriceResponse(result.data);
        if (!parsed?.sharePrice || Number.isNaN(parsed.sharePrice)) return null;
        const normalizedValue =
          parsed.sharePrice >= 10 ** 6 ? parsed.sharePrice / 10 ** 6 : parsed.sharePrice;
        return {
          ts,
          value: normalizedValue,
          label: new Date(ts * 1000).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        };
      })
    )
      .then((points) => {
        const series = points.filter(
          (point): point is { ts: number; value: number; label: string } => point !== null
        );
        setSharePriceSeries(series);
      })
      .catch(() => setSharePriceSeries([]));
  }, [selectedVault]);

  useEffect(() => {
    if (!selectedVault || !depositAmount || Number(depositAmount) <= 0) {
      setSimulateDeposit(null);
      return;
    }
    const lamportAmount = (Number(depositAmount) * 1e6).toFixed(0);
    const timer = setTimeout(() => {
      fetchVaultSimulateDeposit(selectedVault, { lamportAmount })
        .then((r) => setSimulateDeposit(r.status === "ok" ? r.data : null))
        .catch(() => setSimulateDeposit(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedVault, depositAmount]);

  useEffect(() => {
    if (!selectedVault || !withdrawAmount || Number(withdrawAmount) <= 0) {
      setSimulateWithdraw(null);
      return;
    }
    const lamportAmount = (Number(withdrawAmount) * 1e6).toFixed(0);
    const timer = setTimeout(() => {
      fetchVaultSimulateWithdraw(selectedVault, { lamportAmount })
        .then((r) => setSimulateWithdraw(r.status === "ok" ? r.data : null))
        .catch(() => setSimulateWithdraw(null));
    }, 400);
    return () => clearTimeout(timer);
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
      const tx = VersionedTransaction.deserialize(bs58.decode(transaction));
      const sig = await sendTransaction(tx, connection);
      setLastTxSig(sig);
      try {
        await connection.confirmTransaction(sig);
      } catch {
        setTxStatus("done");
        setDepositAmount("");
        return;
      }
      setTxStatus("done");
      setDepositAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      const sigFromError = msg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0];
      if (sigFromError) {
        setLastTxSig(sigFromError);
        setTxStatus("done");
        setDepositAmount("");
      } else {
        setError(msg);
        setTxStatus("error");
        setLastTxSig(null);
      }
    }
  }, [connection, depositAmount, publicKey, selectedVault, sendTransaction]);

  const handleRequestWithdraw = useCallback(async () => {
    if (!publicKey || !selectedVault || !withdrawAmount) return;
    setTxStatus("building");
    setError(null);
    try {
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
      const tx = VersionedTransaction.deserialize(bs58.decode(transaction));
      const sig = await sendTransaction(tx, connection);
      setLastTxSig(sig);
      try {
        await connection.confirmTransaction(sig);
      } catch {
        setTxStatus("done");
        setWithdrawAmount("");
        return;
      }
      setTxStatus("done");
      setWithdrawAmount("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed.";
      const sigFromError = msg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0];
      if (sigFromError) {
        setLastTxSig(sigFromError);
        setTxStatus("done");
        setWithdrawAmount("");
      } else {
        setError(msg);
        setTxStatus("error");
        setLastTxSig(null);
      }
    }
  }, [connection, publicKey, selectedVault, sendTransaction, withdrawAmount]);

  const handleClaim = useCallback(async () => {
    if (!publicKey || !selectedVault || !parsedPending?.canClaim) return;
    setTxStatus("building");
    setError(null);
    try {
      const { success, transaction } = await buildWithdrawTx(
        selectedVault,
        publicKey.toBase58()
      );
      if (!success || !transaction) {
        setError("API did not return a claim transaction.");
        setTxStatus("error");
        return;
      }
      setTxStatus("sending");
      const tx = VersionedTransaction.deserialize(bs58.decode(transaction));
      const sig = await sendTransaction(tx, connection);
      setLastTxSig(sig);
      try {
        await connection.confirmTransaction(sig);
      } catch {
        setTxStatus("done");
        return;
      }
      setTxStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim transaction failed.";
      const sigFromError = msg.match(/[1-9A-HJ-NP-Za-km-z]{87,88}/)?.[0];
      if (sigFromError) {
        setLastTxSig(sigFromError);
        setTxStatus("done");
      } else {
        setError(msg);
        setTxStatus("error");
        setLastTxSig(null);
      }
    }
  }, [connection, parsedPending?.canClaim, publicKey, selectedVault, sendTransaction]);

  const actionDisabled = txStatus === "building" || txStatus === "sending";
  const inputAmount = tradeMode === "deposit" ? depositAmount : withdrawAmount;
  const outputEstimate = tradeMode === "deposit" ? simulateDeposit : simulateWithdraw;

  return (
    <main className="dashboard-surface dashboard-body min-h-screen px-3 py-4 text-[#0f1720] md:px-6">
      <div className="mx-auto max-w-[1880px]">
        <header className="flex flex-wrap items-center justify-between gap-4 border border-[#d9d9d9] bg-[#faf8f3] px-4 py-3">
          <div className="flex items-center gap-4">
            <img src="/k1-logo.png" alt="K1" className="h-8 w-auto" />
          </div>
          <div className="[&_.wallet-adapter-button]:dashboard-body [&_.wallet-adapter-button]:h-10 [&_.wallet-adapter-button]:rounded-none [&_.wallet-adapter-button]:border [&_.wallet-adapter-button]:border-[#1f1f1f] [&_.wallet-adapter-button]:bg-[#1f1f1f] [&_.wallet-adapter-button]:px-4 [&_.wallet-adapter-button]:text-[11px] [&_.wallet-adapter-button]:font-medium [&_.wallet-adapter-button]:uppercase [&_.wallet-adapter-button]:tracking-[0.12em]">
            {mounted ? (
              <WalletMultiButton />
            ) : (
              <button
                type="button"
                disabled
                className="dashboard-body h-10 border border-[#1f1f1f] bg-[#1f1f1f] px-4 text-[11px] font-medium uppercase tracking-[0.12em] text-white opacity-60"
              >
                Select Wallet
              </button>
            )}
          </div>
        </header>

        {VAULT_PUBKEYS.length === 0 ? (
          <div className="mt-4 border border-[#d9d9d9] bg-white px-4 py-4 text-sm text-[#7a4b20]">
            Set <code>NEXT_PUBLIC_VAULT_PUBKEYS</code> in <code>.env</code> to load vault addresses into the terminal.
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="border border-[#d9d9d9] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-label dashboard-eyebrow">K1 / USDC</p>
                <p className="dashboard-value mt-2 text-[2.35rem] leading-none">{marketPrice}</p>
              </div>
              {VAULT_PUBKEYS.length > 1 ? (
                <select
                  value={selectedVault}
                  onChange={(e) => setSelectedVault(e.target.value)}
                  className="dashboard-body min-w-[220px] border border-[#d9d9d9] bg-[#f7f5f1] px-3 py-2 text-[11px] uppercase tracking-[0.1em] outline-none"
                >
                  {VAULT_PUBKEYS.map((pk) => (
                    <option key={pk} value={pk}>
                      {pk.slice(0, 8)}...{pk.slice(-8)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="mt-6 h-[220px] w-full">
              <svg viewBox="0 0 1000 220" className="h-full w-full" preserveAspectRatio="none">
                <line x1="0" y1="180" x2="1000" y2="180" stroke="#e6e1d8" strokeWidth="1" />
                <line x1="0" y1="90" x2="1000" y2="90" stroke="#f1ece3" strokeWidth="1" strokeDasharray="3 5" />
                <path d={chartPath} fill="none" stroke="#e26815" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx={latestPoint.x.toFixed(2)} cy={latestPoint.y.toFixed(2)} r="4" fill="#e26815" />
                <circle cx={latestPoint.x.toFixed(2)} cy={latestPoint.y.toFixed(2)} r="8" fill="none" stroke="#e26815" strokeOpacity="0.18" />
                <rect
                  x={Math.max(18, Math.min(latestPoint.x - 86, 820)).toFixed(2)}
                  y={Math.max(18, latestPoint.y - 54).toFixed(2)}
                  width="86"
                  height="44"
                  fill="#fcfbf8"
                  stroke="#d9d9d9"
                />
                <text
                  x={Math.max(28, Math.min(latestPoint.x - 76, 830)).toFixed(2)}
                  y={Math.max(34, latestPoint.y - 36).toFixed(2)}
                  fontSize="10"
                  fill="#0f1720"
                >
                  {latestChartLabel}
                </text>
                <text
                  x={Math.max(28, Math.min(latestPoint.x - 76, 830)).toFixed(2)}
                  y={Math.max(52, latestPoint.y - 18).toFixed(2)}
                  fontSize="10"
                  fill="#e26815"
                >
                  price : ${latestChartValue?.toFixed(4) ?? "1.0204"}
                </text>
                {chartTicks.map((tick) => (
                  <g key={`${tick.label}-${tick.x}`}>
                    <line x1={tick.x.toFixed(2)} y1="184" x2={tick.x.toFixed(2)} y2="190" stroke="#c9c3b8" strokeWidth="1" />
                    <text x={tick.x.toFixed(2)} y="205" fontSize="10" fill="#8b8b8b" textAnchor="middle">
                      {tick.label}
                    </text>
                  </g>
                ))}
                {chartMin != null ? (
                  <text x="0" y="16" fontSize="10" fill="#8b8b8b">
                    max ${chartMax?.toFixed(4)}
                  </text>
                ) : null}
                {chartMin != null ? (
                  <text x="0" y="176" fontSize="10" fill="#8b8b8b">
                    min ${chartMin.toFixed(4)}
                  </text>
                ) : null}
              </svg>
            </div>
          </div>

          <div className="border border-[#d9d9d9] bg-white px-4 py-4">
            <div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeMode("deposit")}
                  className={`dashboard-ui h-10 border text-[11px] font-medium uppercase tracking-[0.12em] ${
                    tradeMode === "deposit"
                      ? "border-[#1f1f1f] bg-[#1f1f1f] text-white"
                      : "border-[#d9d9d9] bg-white text-[#0f1720]"
                  }`}
                >
                  01_Mint
                </button>
                <button
                  onClick={() => setTradeMode("withdraw")}
                  className={`dashboard-ui h-10 border text-[11px] font-medium uppercase tracking-[0.12em] ${
                    tradeMode === "withdraw"
                      ? "border-[#1f1f1f] bg-[#1f1f1f] text-white"
                      : "border-[#d9d9d9] bg-white text-[#0f1720]"
                  }`}
                >
                  02_Redeem
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="dashboard-label dashboard-muted">Input_Amount</label>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="text"
                      value={inputAmount}
                      onChange={(e) =>
                        tradeMode === "deposit"
                          ? setDepositAmount(e.target.value)
                          : setWithdrawAmount(e.target.value)
                      }
                      placeholder="0.00"
                      className="dashboard-body h-11 border border-[#d9d9d9] bg-[#faf8f3] px-3 outline-none placeholder:text-[#9a9a9a]"
                    />
                    <div className="dashboard-body flex h-11 min-w-[48px] items-center justify-center border border-[#d9d9d9] bg-[#faf8f3] px-3 text-[11px] uppercase tracking-[0.12em]">
                      {tradeMode === "deposit" ? assetLabel : "K1"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="dashboard-label dashboard-muted">Output_Estimated</label>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <div className="dashboard-body flex h-11 items-center border border-[#d9d9d9] bg-[#faf8f3] px-3 font-medium">
                      {formatApiValue(outputEstimate)}
                    </div>
                    <div className="dashboard-body flex h-11 min-w-[48px] items-center justify-center border border-[#d9d9d9] bg-[#faf8f3] px-3 text-[11px] uppercase tracking-[0.12em]">
                      {tradeMode === "deposit" ? "K1" : assetLabel}
                    </div>
                  </div>
                </div>

                <button
                  onClick={tradeMode === "deposit" ? handleDeposit : handleRequestWithdraw}
                  disabled={!connected || actionDisabled}
                  className="dashboard-ui h-11 w-full border border-[#1f1f1f] bg-[#1f1f1f] text-[11px] font-medium uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {txStatus === "building"
                    ? "BUILDING_TRANSACTION"
                    : txStatus === "sending"
                    ? "SENDING_TRANSACTION"
                    : "EXECUTE_TRANSACTION"}
                </button>

                <button
                  onClick={handleClaim}
                  disabled={!connected || actionDisabled || !parsedPending?.canClaim}
                  className="dashboard-ui h-11 w-full border border-[#d9d9d9] bg-white text-[11px] font-medium uppercase tracking-[0.14em] text-[#0f1720] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  CLAIM
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div>
                  <p className="dashboard-label dashboard-muted">K1_Balance</p>
                  <p className="mt-1">
                    {parsedBalance?.success ? `${parsedBalance.formatted} K1` : "--"}
                  </p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Withdraw_Pending</p>
                  <p className="mt-1">
                    {parsedPending?.success && parsedPending.amountRaw > 0
                      ? `${parsedPending.amountFormatted} USDC`
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Claim</p>
                  <p className="mt-1">
                    {parsedPending?.success && parsedPending.amountRaw > 0
                      ? parsedPending.canClaim
                        ? "Available now"
                        : formatWithdrawableDate(parsedPending.withdrawableFromTs)
                      : "--"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TerminalStat
            label="Protocol_TVL"
            value={
              parsedVault
                ? `${parsedVault.assetTotalValue} ${parsedVault.assetLabel}`
                : "--"
            }
          />
          <TerminalStat
            label="Holders"
            value="--"
          />
          <TerminalStat
            label="Yield_Distributed"
            value={formatMoney(parsedInterestEarned?.formatted)}
          />
          <TerminalStat
            label="Points"
            value={parsedFeeEarned?.feeEarnedFormatted ?? "--"}
          />
        </section>

        <section className="mt-4 border border-[#d9d9d9] bg-white px-4 py-4">
          <p className="dashboard-label dashboard-eyebrow">Reserve_Allocation</p>
          <div className="mt-5 flex h-9 overflow-hidden border border-[#d9d9d9] bg-[#f3f1ec]">
            {STRATEGY_ALLOCATION.map((item) => (
              <div key={item.label} className={item.tone} style={{ width: `${item.value}%` }} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STRATEGY_ALLOCATION.map((item) => (
              <div key={item.label}>
                <div className="dashboard-label dashboard-eyebrow flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 ${item.tone}`} />
                  {item.label}
                </div>
                <p className="mt-1 text-sm">{item.value}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="border border-[#d9d9d9] bg-white px-4 py-4">
            <p className="dashboard-label dashboard-eyebrow">Vault_Metadata</p>
            {vaultInfo === null ? (
              <p className="mt-4 text-sm text-[#8b8b8b]">{selectedVault ? "Loading vault data..." : "Select a vault."}</p>
            ) : vaultInfo.status === "not_found" ? (
              <p className="mt-4 text-sm text-[#8b8b8b]">
                This vault is not yet indexed by the Ranger API. On-chain deposit and withdraw flows may still work.
              </p>
            ) : vaultInfo.status === "error" ? (
              <p className="mt-4 text-sm text-[#8b8b8b]">Vault metadata could not be loaded right now.</p>
            ) : parsedVault ? (
              <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
                <div>
                  <p className="dashboard-label dashboard-muted">Vault_Name</p>
                  <p className="mt-1 text-sm">{parsedVault.name}</p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Asset</p>
                  <p className="mt-1 text-sm">{parsedVault.assetLabel}</p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Total_Value</p>
                  <p className="mt-1 text-sm">
                    {parsedVault.assetTotalValue} {parsedVault.assetLabel}
                  </p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Withdrawal_Period</p>
                  <p className="mt-1 text-sm">{parsedVault.withdrawalWaitingPeriod}</p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Admin</p>
                  <p className="mt-1 text-sm">{shortAddress(parsedVault.admin)}</p>
                </div>
                <div>
                  <p className="dashboard-label dashboard-muted">Vault_Address</p>
                  <p className="mt-1 break-all text-sm">{parsedVault.address}</p>
                </div>
                {parsedVault.description ? (
                  <div className="md:col-span-2">
                    <p className="dashboard-label dashboard-muted">Description</p>
                    <p className="mt-1 text-sm text-[#4d4d4d]">{parsedVault.description}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <pre className="mt-4 overflow-auto border border-[#d9d9d9] bg-[#faf8f3] p-3 text-xs">
                {JSON.stringify(vaultInfo?.status === "ok" ? vaultInfo.data : {}, null, 2)}
              </pre>
            )}
          </div>

          <div className="border border-[#d9d9d9] bg-white px-4 py-4">
            <p className="dashboard-label dashboard-eyebrow">Recent_Actions</p>
            {connected ? (
              parsedActions.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {parsedActions.slice(0, 6).map((action, index) => (
                    <li
                      key={`${action.label}-${index}`}
                      className="grid grid-cols-[1fr_auto] gap-3 border border-[#d9d9d9] bg-[#faf8f3] px-3 py-3"
                    >
                      <div>
                        <p className="text-sm">{action.label}</p>
                        {action.time ? (
                          <p className="dashboard-label dashboard-muted mt-1 tracking-[0.12em]">{action.time}</p>
                        ) : null}
                      </div>
                      <p className="text-right text-sm">
                        {action.amount} {assetLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-[#8b8b8b]">No wallet actions recorded yet.</p>
              )
            ) : (
              <p className="mt-4 text-sm text-[#8b8b8b]">Connect wallet to see position activity.</p>
            )}

            {(txStatus === "done" || error) && (
              <div className={`mt-4 border px-3 py-3 text-sm ${error ? "border-[#e0b2b2] bg-[#fff4f4]" : "border-[#d9d9d9] bg-[#faf8f3]"}`}>
                {error ? (
                  <p>{error}</p>
                ) : (
                  <div>
                    <p>Transaction submitted successfully.</p>
                    {lastTxSig ? (
                      <a
                        href={explorerUrl(lastTxSig)}
                        target="_blank"
                        rel="noreferrer"
                        className="dashboard-body mt-2 inline-block text-[11px] font-medium uppercase tracking-[0.12em] text-[#d76a1d] underline"
                      >
                        View_On_Solana_Explorer
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <div className="dashboard-label dashboard-muted mt-4 border-t border-[#d9d9d9] pt-4 text-[11px] tracking-[0.1em]">
              Fees:
              <span className="ml-2 text-[#0f1720]">
                Manager {parsedVault?.fees.managerPerformance ?? "--"} / Admin {parsedVault?.fees.adminPerformance ?? "--"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
