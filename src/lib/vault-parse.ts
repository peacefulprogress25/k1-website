/**
 * Parse vault API response into display-friendly shape.
 */

const ASSET_DECIMALS = 6; // USDC and most stables

function bytesToString(arr: number[]): string {
  if (!Array.isArray(arr)) return "";
  return arr
    .map((c) => (c > 0 ? String.fromCharCode(c) : ""))
    .join("")
    .replace(/\0+$/, "")
    .trim();
}

function hexToDecimal(hex: string): number {
  if (typeof hex !== "string") return 0;
  const s = hex.replace(/^0+/, "") || "0";
  return parseInt(s, 16) || 0;
}

function formatWaitingPeriod(seconds: number): string {
  if (seconds <= 0) return "Instant";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function basisPointsToPercent(bps: number): string {
  if (typeof bps !== "number") return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

export interface ParsedVault {
  name: string;
  description: string;
  address: string;
  assetTotalValue: string;
  assetTotalValueRaw: string;
  currentPrice: number | null;
  currentPriceFormatted: string;
  assetMint: string;
  assetLabel: string;
  lpMint: string;
  admin: string;
  manager: string;
  fees: {
    managerPerformance: string;
    adminPerformance: string;
    redemption: string;
    issuance: string;
  };
  withdrawalWaitingPeriod: string;
  withdrawalWaitingPeriodSeconds: number;
}

const KNOWN_MINTS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
};

export function parseVaultResponse(data: unknown): ParsedVault | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const raw = d.raw as Record<string, unknown> | undefined;
  const assetTotalValueRaw = (d.assetTotalValue as string) ?? (raw?.asset as Record<string, unknown>)?.totalValue as string ?? "0";
  const totalValueNum = parseInt(String(assetTotalValueRaw), 10) || 0;
  const totalValueFormatted = (totalValueNum / 10 ** ASSET_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  const currentPriceValue = d.currentPrice != null ? Number(d.currentPrice) : null;
  const currentPrice =
    currentPriceValue != null && Number.isFinite(currentPriceValue) && currentPriceValue > 0
      ? currentPriceValue
      : null;
  const currentPriceFormatted =
    currentPrice != null
      ? currentPrice.toLocaleString(undefined, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        })
      : "—";

  const assetMint = (d.assetMint as string) ?? "";
  const assetLabel = KNOWN_MINTS[assetMint] ?? `${assetMint.slice(0, 4)}…${assetMint.slice(-4)}`;

  let name = "";
  let description = "";
  let lpMint = "";
  let fees = {
    managerPerformance: "—",
    adminPerformance: "—",
    redemption: "—",
    issuance: "—",
  };
  let withdrawalWaitingPeriodSeconds = 0;

  if (raw && typeof raw === "object") {
    name = bytesToString((raw.name as number[]) ?? []);
    description = bytesToString((raw.description as number[]) ?? []);
    const lp = raw.lp as Record<string, unknown> | undefined;
    lpMint = (lp?.mint as string) ?? "";
    const feeConfig = raw.feeConfiguration as Record<string, unknown> | undefined;
    if (feeConfig) {
      fees = {
        managerPerformance: basisPointsToPercent((feeConfig.managerPerformanceFee as number) ?? 0),
        adminPerformance: basisPointsToPercent((feeConfig.adminPerformanceFee as number) ?? 0),
        redemption: basisPointsToPercent((feeConfig.redemptionFee as number) ?? 0),
        issuance: basisPointsToPercent((feeConfig.issuanceFee as number) ?? 0),
      };
    }
    const vaultConfig = raw.vaultConfiguration as Record<string, unknown> | undefined;
    if (vaultConfig?.withdrawalWaitingPeriod) {
      withdrawalWaitingPeriodSeconds = hexToDecimal(String(vaultConfig.withdrawalWaitingPeriod));
    }
  }

  return {
    name: name || "Unnamed Vault",
    description,
    address: (d.address as string) ?? "",
    assetTotalValue: totalValueFormatted,
    assetTotalValueRaw,
    currentPrice,
    currentPriceFormatted,
    assetMint,
    assetLabel,
    lpMint,
    admin: (d.admin as string) ?? "",
    manager: (d.manager as string) ?? "",
    fees,
    withdrawalWaitingPeriod: formatWaitingPeriod(withdrawalWaitingPeriodSeconds),
    withdrawalWaitingPeriodSeconds,
  };
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length < head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

// ——— Vault API (share-price, fee-earned) ———

const LP_DECIMALS = 6;

export interface ParsedSharePrice {
  sharePrice: number | null;
  sharePriceFormatted: string;
  totalValue: number | null;
  totalValueFormatted: string;
}

export function parseSharePriceResponse(data: unknown): ParsedSharePrice | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const inner = (d.data as Record<string, unknown>) ?? d;
  const sp = inner.sharePrice;
  const tv = inner.totalValue;
  const sharePriceNum = sp != null && sp !== null ? Number(sp) : null;
  const totalValueNum = tv != null && tv !== null ? Number(tv) : null;
  // Share price: if large (likely raw/lamports), divide by 10^6; else treat as decimal
  const sharePriceDisplay =
    sharePriceNum != null && !Number.isNaN(sharePriceNum)
      ? sharePriceNum >= 10 ** LP_DECIMALS
        ? (sharePriceNum / 10 ** LP_DECIMALS).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
        : sharePriceNum.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
      : "—";
  const totalValueDisplay =
    totalValueNum != null && !Number.isNaN(totalValueNum)
      ? totalValueNum >= 10 ** LP_DECIMALS
        ? (totalValueNum / 10 ** LP_DECIMALS).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 0 })
        : totalValueNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 0 })
      : "—";
  return {
    sharePrice: sharePriceNum != null && !Number.isNaN(sharePriceNum) ? sharePriceNum : null,
    sharePriceFormatted: sharePriceDisplay,
    totalValue: totalValueNum != null && !Number.isNaN(totalValueNum) ? totalValueNum : null,
    totalValueFormatted: totalValueDisplay,
  };
}

export interface ParsedFeeEarned {
  feeEarnedInLp: number;
  feeEarnedFormatted: string;
}

export function parseFeeEarnedResponse(data: unknown): ParsedFeeEarned | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const inner = (d.data as Record<string, unknown>) ?? d;
  const raw = Number(inner.feeEarnedInLp ?? 0) || 0;
  return {
    feeEarnedInLp: raw,
    feeEarnedFormatted: (raw / 10 ** LP_DECIMALS).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
  };
}

// ——— Vaults aggregate (TVL, interest-earned) ———

function extractNumberFromResponse(data: unknown, keys: string[]): number | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  // If data is a number (e.g. { data: 12345 }), use it
  if (typeof d.data === "number" && !Number.isNaN(d.data)) return d.data;
  const inner = (typeof d.data === "object" && d.data !== null ? d.data : d) as Record<string, unknown>;
  for (const k of keys) {
    const v = inner[k];
    if (v != null && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export interface ParsedTvl {
  raw: number | null;
  formatted: string;
}

export function parseTvlResponse(data: unknown): ParsedTvl | null {
  if (!data || typeof data !== "object") return null;
  const raw = extractNumberFromResponse(data, ["tvl", "totalTvl", "totalValue", "totalTvlInUsd", "tvlInUsd", "value", "data"]);
  if (raw == null) return { raw: null, formatted: "—" };
  const isSmallUnits = raw >= 10 ** LP_DECIMALS;
  const formatted = isSmallUnits
    ? (raw / 10 ** LP_DECIMALS).toLocaleString(undefined, { maximumFractionDigits: 0 })
    : raw.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return { raw, formatted };
}

export interface ParsedInterestEarned {
  raw: number | null;
  formatted: string;
}

export function parseInterestEarnedResponse(data: unknown): ParsedInterestEarned | null {
  if (!data || typeof data !== "object") return null;
  const raw = extractNumberFromResponse(data, ["interestEarned", "totalInterestEarned", "interest", "totalInterest", "value", "data"]);
  if (raw == null) return { raw: null, formatted: "—" };
  const isSmallUnits = raw >= 10 ** LP_DECIMALS;
  const formatted = isSmallUnits
    ? (raw / 10 ** LP_DECIMALS).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : raw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return { raw, formatted };
}

// ——— User position (Ranger user API responses) ———

const USER_ASSET_DECIMALS = 6;

export interface ParsedUserBalance {
  raw: number;
  formatted: string;
  success: boolean;
}

export function parseUserBalance(data: unknown): ParsedUserBalance | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const success = d.success === true;
  const inner = d.data as Record<string, unknown> | undefined;
  const raw = Number(inner?.userAssetAmount ?? 0) || 0;
  const formatted = (raw / 10 ** USER_ASSET_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return { raw, formatted, success };
}

export interface ParsedPendingWithdrawal {
  amountRaw: number;
  amountFormatted: string;
  withdrawableFromTs: number;
  withdrawableAt: Date;
  canClaim: boolean;
  success: boolean;
}

export function parsePendingWithdrawal(data: unknown): ParsedPendingWithdrawal | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const success = d.success === true;
  const inner = d.data as Record<string, unknown> | undefined;
  const amountRaw = Number(inner?.amountAtPresent ?? 0) || 0;
  const withdrawableFromTs = Number(inner?.withdrawableFromTs ?? 0) || 0;
  const withdrawableAt = new Date(withdrawableFromTs * 1000);
  const canClaim = withdrawableFromTs > 0 && Date.now() >= withdrawableAt.getTime();
  const amountFormatted = (amountRaw / 10 ** USER_ASSET_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return {
    amountRaw,
    amountFormatted,
    withdrawableFromTs,
    withdrawableAt,
    canClaim,
    success,
  };
}

export function formatWithdrawableDate(ts: number): string {
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff <= 0) return "Available now";
  if (diff < 60_000) return "In under a minute";
  if (diff < 3600_000) return `In ${Math.ceil(diff / 60_000)} min`;
  if (diff < 86400_000) return `In ${Math.ceil(diff / 3600_000)} hours`;
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export interface ParsedAction {
  type: string;
  amount: string;
  label: string;
  time?: string;
}

export function parseUserActions(data: unknown): ParsedAction[] {
  if (!Array.isArray(data)) return [];
  return data.slice(0, 10).map((item: unknown) => {
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const type = String(o.type ?? o.action ?? "—");
    const amount = typeof o.amount === "number"
      ? (o.amount / 10 ** USER_ASSET_DECIMALS).toFixed(2)
      : String(o.amount ?? "—");
    const time = o.timestamp != null
      ? new Date(Number(o.timestamp) * 1000).toLocaleString(undefined, { dateStyle: "short" })
      : undefined;
    let label = type;
    if (type?.toLowerCase() === "deposit") label = "Deposit";
    else if (type?.toLowerCase() === "withdraw") label = "Withdraw";
    else if (type?.toLowerCase() === "request_withdraw") label = "Request withdraw";
    return { type, amount, label, time };
  });
}
