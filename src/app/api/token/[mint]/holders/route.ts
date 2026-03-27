import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

const PAGE_LIMIT = 1000;
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
    const owners = await fetchTokenAccountOwners(RPC_URL, mintPubkey);
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
