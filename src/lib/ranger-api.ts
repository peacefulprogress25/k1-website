/**
 * Ranger Earn API — build deposit/withdraw transactions.
 * Base URL: https://api.voltr.xyz
 * Docs: https://docs.ranger.finance/developers/endpoints/vault
 */

const API_BASE =
  process.env.NEXT_PUBLIC_RANGER_API_BASE || "https://api.voltr.xyz";

/** USDC and most stables use 6 decimals */
const DEFAULT_ASSET_DECIMALS = 6;

export interface DepositResponse {
  success: boolean;
  transaction?: string; // base58 serialized versioned transaction
}

export interface WithdrawResponse {
  success: boolean;
  transaction?: string;
}

function toLamports(amount: string, decimals: number = DEFAULT_ASSET_DECIMALS): string {
  const [whole, frac = ""] = amount.split(".");
  const padded = whole + frac.slice(0, decimals).padEnd(decimals, "0");
  return padded.replace(/^0+/, "") || "0";
}

/**
 * Build deposit transaction. Amount is in human units (e.g. "100" USDC).
 * Returns serialized tx for client to sign and send.
 */
export async function buildDepositTx(
  vaultPubkey: string,
  amount: string,
  userPubkey: string,
  decimals: number = DEFAULT_ASSET_DECIMALS
): Promise<DepositResponse> {
  const lamportAmount = toLamports(amount, decimals);
  const res = await fetch(
    `${API_BASE}/vault/${vaultPubkey}/deposit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey,
        lamportAmount,
      }),
    }
  );
  return res.json();
}

/**
 * Build request-withdrawal (step 1 of two-step withdraw). Amount in LP tokens or asset — use isAmountInLp.
 */
export async function buildRequestWithdrawTx(
  vaultPubkey: string,
  lamportAmount: string,
  userPubkey: string,
  isAmountInLp: boolean = true
): Promise<WithdrawResponse> {
  const res = await fetch(
    `${API_BASE}/vault/${vaultPubkey}/request-withdrawal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPubkey,
        lamportAmount,
        isAmountInLp,
      }),
    }
  );
  return res.json();
}

/**
 * Build claim-withdrawal (step 2 — complete withdrawal). Returns serialized tx.
 */
export async function buildWithdrawTx(
  vaultPubkey: string,
  userPubkey: string
): Promise<WithdrawResponse> {
  const res = await fetch(
    `${API_BASE}/vault/${vaultPubkey}/withdraw`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userPubkey }),
    }
  );
  return res.json();
}

export type VaultInfoResult =
  | { status: "ok"; data: unknown }
  | { status: "not_found" }
  | { status: "error" };

/**
 * Fetch vault info (TVL, capacity, etc.) from API if available.
 * Returns not_found for 404 (vault not indexed or doesn't exist); deposit/withdraw may still work on-chain.
 */
export async function fetchVaultInfo(vaultPubkey: string): Promise<VaultInfoResult> {
  try {
    const res = await fetch(`${API_BASE}/vault/${vaultPubkey}`);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

export type UserDataResult =
  | { status: "ok"; data: unknown }
  | { status: "not_found" }
  | { status: "error" };

async function fetchUserEndpoint(
  path: string
): Promise<UserDataResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

export function fetchUserVaultBalance(
  vaultPubkey: string,
  userPubkey: string
): Promise<UserDataResult> {
  return fetchUserEndpoint(
    `/vault/${vaultPubkey}/user/${userPubkey}/balance`
  );
}

export function fetchUserPendingWithdrawal(
  vaultPubkey: string,
  userPubkey: string
): Promise<UserDataResult> {
  return fetchUserEndpoint(
    `/vault/${vaultPubkey}/user/${userPubkey}/pending-withdrawal`
  );
}

export function fetchUserVaultActions(
  vaultPubkey: string,
  userPubkey: string
): Promise<UserDataResult> {
  return fetchUserEndpoint(
    `/vault/${vaultPubkey}/user/${userPubkey}/actions`
  );
}

// ——— Vault operations (GET vault, fee-earned, share-price, simulate) ———

export type VaultDataResult =
  | { status: "ok"; data: unknown }
  | { status: "not_found" }
  | { status: "error" };

async function fetchVaultGet(path: string, params?: Record<string, string | number>): Promise<VaultDataResult> {
  try {
    const url = new URL(path, API_BASE);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      });
    }
    const res = await fetch(url.toString());
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return { status: "ok", data };
  } catch {
    return { status: "error" };
  }
}

/** GET /vault/{pubkey} — vault information (when indexed). */
export function fetchVaultByPubkey(vaultPubkey: string): Promise<VaultDataResult> {
  return fetchVaultGet(`/vault/${vaultPubkey}`);
}

/** GET /vault/{pubkey}/fee-earned?startTs=&endTs= */
export function fetchVaultFeeEarned(
  vaultPubkey: string,
  options?: { startTs?: number; endTs?: number }
): Promise<VaultDataResult> {
  const params: Record<string, number> = {};
  if (options?.startTs != null) params.startTs = options.startTs;
  if (options?.endTs != null) params.endTs = options.endTs;
  return fetchVaultGet(`/vault/${vaultPubkey}/fee-earned`, params);
}

/** GET /vault/{pubkey}/share-price?ts= */
export function fetchVaultSharePrice(
  vaultPubkey: string,
  ts?: number
): Promise<VaultDataResult> {
  return fetchVaultGet(`/vault/${vaultPubkey}/share-price`, ts != null ? { ts } : undefined);
}

/** GET /vault/{pubkey}/simulate-withdraw — simulate LP -> Asset (query params may vary by API). */
export function fetchVaultSimulateWithdraw(
  vaultPubkey: string,
  options?: { amount?: string; lamportAmount?: string; ts?: number }
): Promise<VaultDataResult> {
  const params: Record<string, string | number> = {};
  if (options?.amount != null) params.amount = options.amount;
  if (options?.lamportAmount != null) params.lamportAmount = options.lamportAmount;
  if (options?.ts != null) params.ts = options.ts;
  return fetchVaultGet(`/vault/${vaultPubkey}/simulate-withdraw`, Object.keys(params).length ? params : undefined);
}

/** GET /vault/{pubkey}/simulate-deposit — simulate Asset -> LP. */
export function fetchVaultSimulateDeposit(
  vaultPubkey: string,
  options?: { amount?: string; lamportAmount?: string; ts?: number }
): Promise<VaultDataResult> {
  const params: Record<string, string | number> = {};
  if (options?.amount != null) params.amount = options.amount;
  if (options?.lamportAmount != null) params.lamportAmount = options.lamportAmount;
  if (options?.ts != null) params.ts = options.ts;
  return fetchVaultGet(`/vault/${vaultPubkey}/simulate-deposit`, Object.keys(params).length ? params : undefined);
}

// ——— Vaults aggregate (GET /vaults/tvl, /vaults/interest-earned) ———

/** GET /vaults/tvl — total TVL across all vaults. */
export function fetchVaultsTvl(): Promise<VaultDataResult> {
  return fetchVaultGet("/vaults/tvl");
}

/** GET /vaults/interest-earned — total interest earned across all vaults. */
export function fetchVaultsInterestEarned(): Promise<VaultDataResult> {
  return fetchVaultGet("/vaults/interest-earned");
}
