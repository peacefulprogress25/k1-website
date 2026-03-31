"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import { motion, AnimatePresence } from "motion/react";
import { X, TrendingUp, Activity } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { K1Logo } from "@/components/K1Logo";
import {
  buildDepositTx,
  buildRequestWithdrawTx,
  buildWithdrawTx,
  fetchUserPendingWithdrawal,
  fetchUserVaultBalance,
  fetchVaultFeeEarned,
  fetchVaultSharePrice,
  fetchVaultSimulateDeposit,
  fetchVaultSimulateWithdraw,
  fetchVaultsTvl,
} from "@/lib/ranger-api";
import {
  formatWithdrawableDate,
  parseFeeEarnedResponse,
  parsePendingWithdrawal,
  parseSharePriceResponse,
  parseTvlResponse,
  parseUserBalance,
  parseVaultResponse,
  shortAddress,
} from "@/lib/vault-parse";

interface MintPageProps { onClose: () => void }

const VAULT_PUBKEYS = (process.env.NEXT_PUBLIC_VAULT_PUBKEYS || "").split(",").map((v) => v.trim()).filter(Boolean);
const K1_TOKEN_MINT = process.env.NEXT_PUBLIC_K1_TOKEN_MINT || "";
const ASSET_DECIMALS = 6;
const LP_DECIMALS = 9;

const toBaseUnits = (amount: string, decimals: number) => {
  const [whole, frac = ""] = amount.trim().split(".");
  return `${whole || "0"}${frac.slice(0, decimals).padEnd(decimals, "0")}`.replace(/^0+/, "") || "0";
};
const waitForConfirmation = (connection: { confirmTransaction: (signature: string) => Promise<unknown> }, signature: string) =>
  Promise.race([connection.confirmTransaction(signature), new Promise((resolve) => setTimeout(resolve, 15000))]);
const metricClass = "relative border border-gray-900 bg-gray-950/30 p-6";
const formatMaybe = (value: string | null | undefined, prefix = "") => (!value || value === "--" || value === "—" ? "--" : `${prefix}${value}`);
const chartEstimate = (estimate: unknown, mode: "deposit" | "withdraw") => {
  if (!estimate || typeof estimate !== "object") return "--";
  const inner = "data" in (estimate as Record<string, unknown>) && typeof (estimate as { data?: unknown }).data === "object"
    ? ((estimate as { data: Record<string, unknown> }).data)
    : (estimate as Record<string, unknown>);
  const raw = mode === "deposit" ? inner.lpAmount ?? inner.lamportAmount ?? inner.amount : inner.amount ?? inner.lamportAmount ?? inner.assetAmount;
  const decimals = mode === "deposit" ? LP_DECIMALS : ASSET_DECIMALS;
  return raw != null ? (Number(raw) / 10 ** decimals).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : "--";
};
const actionHelpText = {
  MINT: "Mint K1 by depositing the vault asset.",
  REDEEM: "Step 1 of 2. Request a withdrawal by locking K1 for redemption.",
  CLAIM: "Step 2 of 2. Claim the withdrawal once the waiting period ends.",
} as const;

export default function MintPage({ onClose }: MintPageProps) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [tab, setTab] = useState<"MINT" | "REDEEM" | "CLAIM">("MINT");
  const [vault, setVault] = useState(VAULT_PUBKEYS[0] || "");
  const [amount, setAmount] = useState("");
  const [vaultInfo, setVaultInfo] = useState<unknown | null>(null);
  const [globalTvl, setGlobalTvl] = useState<unknown | null>(null);
  const [holders, setHolders] = useState<number | null>(null);
  const [balance, setBalance] = useState<unknown | null>(null);
  const [pending, setPending] = useState<unknown | null>(null);
  const [feeEarned, setFeeEarned] = useState<unknown | null>(null);
  const [simulateDeposit, setSimulateDeposit] = useState<unknown | null>(null);
  const [simulateWithdraw, setSimulateWithdraw] = useState<unknown | null>(null);
  const [chartTab, setChartTab] = useState<"PRICE" | "APY">("PRICE");
  const [series, setSeries] = useState<Array<{ time: string; price: number; apy: number }>>([]);
  const [txState, setTxState] = useState<"idle" | "building" | "sending" | "done" | "error">("idle");
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const parsedVault = useMemo(() => parseVaultResponse(vaultInfo), [vaultInfo]);
  const parsedTvl = useMemo(() => parseTvlResponse(globalTvl), [globalTvl]);
  const parsedBalance = useMemo(() => parseUserBalance(balance), [balance]);
  const parsedPending = useMemo(() => parsePendingWithdrawal(pending), [pending]);
  const parsedFee = useMemo(() => parseFeeEarnedResponse(feeEarned), [feeEarned]);
  const assetLabel = parsedVault?.assetLabel ?? "USDC";
  const walletAddress = publicKey?.toBase58() ?? null;
  const marketPrice = series[series.length - 1]?.price ?? parsedVault?.currentPrice ?? null;
  const annualizedApy = useMemo(() => {
    if (series.length < 2) return null;
    const first = series[0].price;
    const last = series[series.length - 1].price;
    if (!first || !last) return null;
    return (Math.pow(1 + (last / first - 1), 12) - 1) * 100;
  }, [series]);
  const outputEstimate = useMemo(() => {
    if (tab === "CLAIM") return parsedPending?.success && parsedPending.amountRaw > 0 ? parsedPending.amountFormatted : "--";
    if (!amount || Number(amount) <= 0) return "0.00";
    return tab === "MINT" ? chartEstimate(simulateDeposit, "deposit") : chartEstimate(simulateWithdraw, "withdraw");
  }, [amount, parsedPending, simulateDeposit, simulateWithdraw, tab]);

  useEffect(() => {
    fetchVaultsTvl().then((r) => setGlobalTvl(r.status === "ok" ? r.data : null)).catch(() => setGlobalTvl(null));
  }, []);
  useEffect(() => {
    if (!K1_TOKEN_MINT) return;
    fetch(`/api/token/${K1_TOKEN_MINT}/holders`).then(async (r) => (r.ok ? (await r.json()) as { holders?: number } : null)).then((d) => setHolders(typeof d?.holders === "number" ? d.holders : null)).catch(() => setHolders(null));
  }, []);
  useEffect(() => {
    if (!vault) return;
    fetch(`/api/vault/${vault}`).then(async (r) => (r.ok ? await r.json() : null)).then(setVaultInfo).catch(() => setVaultInfo(null));
    fetchVaultFeeEarned(vault).then((r) => setFeeEarned(r.status === "ok" ? r.data : null)).catch(() => setFeeEarned(null));
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - 30 * 24 * 3600;
    const points = Array.from({ length: 12 }, (_, i) => startTs + Math.floor(((endTs - startTs) / 11) * i));
    Promise.all(points.map(async (ts) => {
      const response = await fetchVaultSharePrice(vault, ts);
      if (response.status !== "ok") return null;
      const parsed = parseSharePriceResponse(response.data);
      const raw = parsed?.sharePrice;
      if (!raw || Number.isNaN(raw)) return null;
      return { label: new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }), price: raw >= 10 ** 6 ? raw / 10 ** 6 : raw };
    })).then((values) => {
      const clean = values.filter((v): v is { label: string; price: number } => v !== null);
      setSeries(clean.map((point, index) => {
        const prev = index === 0 ? point.price : clean[index - 1].price;
        const apy = prev > 0 ? ((point.price / prev) ** 12 - 1) * 100 : 0;
        return { time: point.label, price: point.price, apy: Number.isFinite(apy) ? apy : 0 };
      }));
    }).catch(() => setSeries([]));
  }, [vault]);
  useEffect(() => {
    if (!publicKey || !vault) { setBalance(null); setPending(null); return; }
    const userPk = publicKey.toBase58();
    fetchUserVaultBalance(vault, userPk).then((r) => setBalance(r.status === "ok" ? r.data : null)).catch(() => setBalance(null));
    fetchUserPendingWithdrawal(vault, userPk).then((r) => setPending(r.status === "ok" ? r.data : null)).catch(() => setPending(null));
  }, [publicKey, vault]);
  useEffect(() => {
    if (tab !== "MINT" || !vault || !amount || Number(amount) <= 0) { setSimulateDeposit(null); return; }
    const timer = setTimeout(() => {
      fetchVaultSimulateDeposit(vault, { lamportAmount: toBaseUnits(amount, ASSET_DECIMALS) }).then((r) => setSimulateDeposit(r.status === "ok" ? r.data : null)).catch(() => setSimulateDeposit(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [amount, tab, vault]);
  useEffect(() => {
    if (tab !== "REDEEM" || !vault || !amount || Number(amount) <= 0) { setSimulateWithdraw(null); return; }
    const timer = setTimeout(() => {
      fetchVaultSimulateWithdraw(vault, { lamportAmount: toBaseUnits(amount, LP_DECIMALS) }).then((r) => setSimulateWithdraw(r.status === "ok" ? r.data : null)).catch(() => setSimulateWithdraw(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [amount, tab, vault]);

  const runTx = useCallback(async (builder: () => Promise<{ success: boolean; transaction?: string }>, successLabel: string) => {
    setTxState("building");
    setTxMessage(null);
    try {
      const response = await builder();
      if (!response.success || !response.transaction) throw new Error(`${successLabel} transaction could not be built.`);
      setTxState("sending");
      const tx = VersionedTransaction.deserialize(bs58.decode(response.transaction));
      const signature = await sendTransaction(tx, connection);
      await waitForConfirmation(connection, signature).catch(() => undefined);
      setTxState("done");
      setTxMessage(`${successLabel} submitted: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
      setAmount("");
    } catch (error) {
      setTxState("error");
      setTxMessage(error instanceof Error ? error.message : `${successLabel} failed.`);
    }
  }, [connection, sendTransaction]);

  const chartData = series.length > 0 ? series : [{ time: "Live", price: marketPrice ?? 1, apy: annualizedApy ?? 0 }];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] overflow-y-auto bg-black font-mono text-white">
      <div className="fixed inset-0 pointer-events-none opacity-10" style={{ backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="relative mx-auto max-w-6xl px-6 pb-12 pt-2 md:px-12 md:pb-24 md:pt-4">
        <div className="mb-4 flex justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 md:h-16 md:w-16"><K1Logo className="h-full w-full text-brand-orange" /></div>
            {VAULT_PUBKEYS.length > 1 ? <select value={vault} onChange={(e) => setVault(e.target.value)} className="border border-gray-800 bg-gray-950/70 px-3 py-2 text-[10px] uppercase tracking-[0.2em] outline-none">{VAULT_PUBKEYS.map((value) => <option key={value} value={value}>{value.slice(0, 6)}...{value.slice(-6)}</option>)}</select> : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="[&_.wallet-adapter-button]:h-10 [&_.wallet-adapter-button]:rounded-none [&_.wallet-adapter-button]:border [&_.wallet-adapter-button]:border-brand-orange/50 [&_.wallet-adapter-button]:bg-brand-orange [&_.wallet-adapter-button]:px-4 [&_.wallet-adapter-button]:text-[10px] [&_.wallet-adapter-button]:font-bold [&_.wallet-adapter-button]:tracking-[0.18em] [&_.wallet-adapter-button]:text-black"><WalletMultiButton /></div>
            <button onClick={onClose} className="p-2 transition-colors hover:text-brand-orange"><X size={24} /></button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Value Locked" value={formatMaybe(parsedTvl?.formatted, "$")} />
          <Metric label="Annualized APY" value={annualizedApy != null ? `${annualizedApy.toFixed(2)}%` : "--"} accent />
          <Metric label="K1 Balance" value={parsedBalance?.success ? parsedBalance.formatted : "--"} />
          <Metric label="Holders" value={holders != null ? holders.toLocaleString() : "--"} accent />
        </div>

        {!connected ? (
          <div className="mb-8 border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 text-sm text-gray-200">
            Connect your wallet to mint, request redemption, or claim completed withdrawals.
          </div>
        ) : null}
        {!vault ? (
          <div className="mb-8 border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            No vault is configured. Add `NEXT_PUBLIC_VAULT_PUBKEYS` in your environment to enable transactions.
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-7">
          <div className="relative border border-gray-900 bg-gray-950/20 p-8 lg:col-span-4">
            <Corners />
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="mb-1 text-xl font-serif">Vault Overview</h2>
                <div className="mt-4 flex gap-6">
                  <button onClick={() => setChartTab("PRICE")} className={`flex items-center gap-2 transition-colors ${chartTab === "PRICE" ? "text-brand-orange" : "text-gray-600 hover:text-white"}`}><TrendingUp size={14} /><span className="text-[10px] tracking-[0.18em]">PRICE</span></button>
                  <button onClick={() => setChartTab("APY")} className={`flex items-center gap-2 transition-colors ${chartTab === "APY" ? "text-brand-orange" : "text-gray-600 hover:text-white"}`}><Activity size={14} /><span className="text-[10px] tracking-[0.18em]">YIELD</span></button>
                </div>
              </div>
              <div className="text-right"><div className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Spot Price</div><div className="mt-2 text-2xl font-serif text-brand-orange">{marketPrice != null ? `$${marketPrice.toFixed(4)}` : "--"}</div></div>
            </div>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fe5500" stopOpacity={0.3} /><stop offset="95%" stopColor="#fe5500" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#4b5563", fontSize: 10 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#4b5563", fontSize: 10 }} width={42} />
                  <Tooltip contentStyle={{ backgroundColor: "#050505", border: "1px solid #1a1a1a", fontSize: "10px" }} itemStyle={{ color: "#fe5500" }} />
                  <Area type="monotone" dataKey={chartTab === "PRICE" ? "price" : "apy"} stroke="#fe5500" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-8 flex gap-8 border-b border-gray-900">{["MINT", "REDEEM", "CLAIM"].map((value) => <button key={value} onClick={() => setTab(value as "MINT" | "REDEEM" | "CLAIM")} className={`relative pb-4 text-[10px] font-extrabold tracking-[0.2em] transition-all ${tab === value ? "text-brand-orange" : "text-gray-600 hover:text-white"}`}>{value}{tab === value ? <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" /> : null}</button>)}</div>
            <div className="relative border border-gray-900 bg-gray-950/10 p-8">
              <Corners />
              <AnimatePresence mode="wait">
                {tab === "CLAIM" ? (
                  <motion.div key="claim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                    <div className="flex justify-between"><h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">Complete Withdrawal Claim</h3><span className="text-[11px] tracking-[0.18em] text-brand-orange">{parsedPending?.canClaim ? "READY" : "PENDING"}</span></div>
                    <div className="border border-brand-orange/10 bg-brand-orange/5 p-8 text-center"><div className="mb-4 text-[10px] font-extrabold uppercase text-gray-600">Claimable</div><div className="flex items-center justify-center gap-3"><span className="text-5xl font-serif">{outputEstimate}</span><span className="text-lg text-brand-orange">{assetLabel}</span></div><div className="mt-4 text-[10px] font-extrabold uppercase text-gray-600">{parsedPending?.success ? (parsedPending.canClaim ? "Available now" : formatWithdrawableDate(parsedPending.withdrawableFromTs)) : "No pending withdrawal"}</div></div>
                    <p className="text-sm leading-relaxed text-gray-400">{actionHelpText.CLAIM}</p>
                    <MetaGrid rows={[["Manager Fee", parsedVault?.fees.managerPerformance ?? "--"], ["Fee Earned", parsedFee?.feeEarnedFormatted ?? "--"], ["Withdrawal Wait", parsedVault?.withdrawalWaitingPeriod ?? "--"], ["Vault", vault ? shortAddress(vault) : "--"]]} />
                    <button onClick={() => publicKey && runTx(() => buildWithdrawTx(vault, publicKey.toBase58()), "Claim")} disabled={!connected || !parsedPending?.canClaim || txState === "building" || txState === "sending"} className="w-full bg-brand-orange py-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{txState === "building" ? "Preparing Claim" : txState === "sending" ? "Sending Claim" : "Complete Claim"}</button>
                  </motion.div>
                ) : (
                  <motion.div key="trade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="mb-8 flex items-center justify-between"><h3 className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">{tab === "MINT" ? "Mint Amount" : "Redeem Request Amount"}</h3><span className="text-[11px] font-bold tracking-widest text-brand-orange">Price: {marketPrice != null ? `$${marketPrice.toFixed(4)}` : "--"} / K1</span></div>
                    <p className="mb-6 text-sm leading-relaxed text-gray-400">{actionHelpText[tab]}</p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border border-gray-900 bg-gray-950 p-6"><div className="flex flex-1 flex-col"><span className="mb-2 text-[10px] font-extrabold uppercase text-gray-600">Pay</span><input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-2xl font-serif outline-none" /></div><div className="flex items-center gap-4"><button onClick={() => setAmount(tab === "MINT" ? "100" : parsedBalance?.formatted ?? "")} className="border border-gray-800 px-2 py-1 text-[10px] font-extrabold uppercase transition-colors hover:border-brand-orange">MAX</button><span className="text-lg">{tab === "MINT" ? assetLabel : "K1"}</span></div></div>
                      <div className="flex items-center justify-between border border-dashed border-gray-900 bg-gray-950/50 p-6"><div className="flex flex-col"><span className="mb-2 text-[10px] font-extrabold uppercase text-gray-600">Receive (Estimated)</span><div className="text-2xl font-serif text-gray-300">{outputEstimate}</div></div><span className="text-lg text-gray-400">{tab === "MINT" ? "K1" : assetLabel}</span></div>
                    </div>
                    <button onClick={() => publicKey && runTx(() => tab === "MINT" ? buildDepositTx(vault, amount, publicKey.toBase58()) : buildRequestWithdrawTx(vault, toBaseUnits(amount, LP_DECIMALS), publicKey.toBase58(), true), tab === "MINT" ? "Mint" : "Redeem request")} disabled={!connected || !vault || !amount || Number(amount) <= 0 || txState === "building" || txState === "sending"} className="mt-12 w-full bg-brand-orange py-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{txState === "building" ? "Preparing Transaction" : txState === "sending" ? "Sending Transaction" : tab === "MINT" ? "Submit Mint" : "Submit Redeem Request"}</button>
                  </motion.div>
                )}
              </AnimatePresence>
              {txMessage ? <div className={`mt-6 border px-4 py-3 text-sm ${txState === "error" ? "border-red-900/60 bg-red-950/20 text-red-200" : "border-brand-orange/30 bg-brand-orange/5 text-gray-200"}`}>{txMessage}</div> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className={`${metricClass} p-8`}><div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-gray-700" /><h3 className="mb-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-600">Vault Configuration</h3><MetaGrid rows={[["Vault Name", parsedVault?.name ?? "Loading..."], ["Asset", assetLabel], ["Admin Fee", parsedVault?.fees.adminPerformance ?? "--"], ["Manager Fee", parsedVault?.fees.managerPerformance ?? "--"], ["Redemption Fee", parsedVault?.fees.redemption ?? "--"], ["Issuance Fee", parsedVault?.fees.issuance ?? "--"]]} /></div>
          <div className={`${metricClass} p-8`}><div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-gray-700" /><h3 className="mb-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-600">Vault Addresses</h3><MetaGrid rows={[["Vault", vault || "--"], ["Admin", parsedVault?.admin ?? "--"], ["Manager", parsedVault?.manager ?? "--"], ["Wallet", walletAddress ? shortAddress(walletAddress) : "--"], ["Pending Claim", parsedPending?.success && parsedPending.amountRaw > 0 ? `${parsedPending.amountFormatted} ${assetLabel}` : "--"]]} mono /></div>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={metricClass}><div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-gray-700" /><h3 className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-gray-600">{label}</h3><div className={`text-2xl font-serif ${accent ? "text-brand-orange" : ""}`}>{value}</div></div>;
}

function MetaGrid({ rows, mono = false }: { rows: Array<[string, string]>; mono?: boolean }) {
  return <div className="space-y-4 text-sm">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4"><span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-600">{label}</span><span className={`max-w-[65%] break-all text-right text-gray-200 ${mono ? "text-[10px]" : ""}`}>{value}</span></div>)}</div>;
}

function Corners() {
  return <><div className="absolute left-0 top-0 h-4 w-4 border-l border-t border-gray-600" /><div className="absolute right-0 top-0 h-4 w-4 border-r border-t border-gray-600" /><div className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-gray-600" /><div className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-gray-600" /></>;
}
