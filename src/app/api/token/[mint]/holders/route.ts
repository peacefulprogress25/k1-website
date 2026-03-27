import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

const PAGE_LIMIT = 1000;
const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
type TokenAccountsResponse = {
  result?: {
    token_accounts?: Array<{
      owner?: string;
      amount?: number | string;
    }>;
    cursor?: string | null;
  };
  error?: {
    message?: string;
  };
};

async function fetchTokenAccountOwners(
  rpcUrl: string,
  mintPubkey: PublicKey
): Promise<string[]> {
  const owners: string[] = [];
  let cursor: string | null | undefined;

  do {
    const body = {
      jsonrpc: "2.0",
      id: "holders",
      method: "getTokenAccounts",
      params: {
        mint: mintPubkey.toBase58(),
        limit: PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
        options: {
          showZeroBalance: false,
        },
      },
    };

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`RPC request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as TokenAccountsResponse;
    if (payload.error) {
      throw new Error(payload.error.message || "RPC returned an error");
    }

    for (const account of payload.result?.token_accounts ?? []) {
      if (!account.owner) continue;
      const amount = account.amount;
      if (amount == null || BigInt(amount) <= BigInt(0)) continue;
      owners.push(account.owner);
    }

    cursor = payload.result?.cursor;
  } while (cursor);

  return owners;
}

function readStandardOwnerFromSlice(data: Buffer): string | null {
  if (data.length < 40) return null;
  try {
    return new PublicKey(data.subarray(0, 32)).toBase58();
  } catch {
    return null;
  }
}

function readStandardAmountFromSlice(data: Buffer): bigint {
  if (data.length < 40) return BigInt(0);
  return data.readBigUInt64LE(32);
}

async function fetchStandardRpcTokenOwners(
  rpcUrl: string,
  mintPubkey: PublicKey
): Promise<string[]> {
  const connection = new Connection(rpcUrl, "confirmed");
  const accounts = await connection.getProgramAccounts(SPL_TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } },
    ],
    dataSlice: {
      offset: 32,
      length: 40,
    },
  });

  const owners: string[] = [];
  for (const account of accounts) {
    const owner = readStandardOwnerFromSlice(account.account.data);
    const amount = readStandardAmountFromSlice(account.account.data);
    if (!owner || amount <= BigInt(0)) continue;
    owners.push(owner);
  }
  return owners;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ mint: string }> }
) {
  const { mint } = await context.params;

  let mintPubkey: PublicKey;
  try {
    mintPubkey = new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }

  try {
    const ownerSet = new Set<string>();
    let owners: string[] = [];

    try {
      owners = await fetchTokenAccountOwners(RPC_URL, mintPubkey);
    } catch (error) {
      console.warn("Helius token accounts lookup failed, falling back to standard RPC:", error);
      owners = await fetchStandardRpcTokenOwners(RPC_URL, mintPubkey);
    }

    owners.forEach((owner) => ownerSet.add(owner));

    return NextResponse.json(
      {
        mint: mintPubkey.toBase58(),
        holders: ownerSet.size,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Token holders lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to load token holders" },
      { status: 500 }
    );
  }
}
