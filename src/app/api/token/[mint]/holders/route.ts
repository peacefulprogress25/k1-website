import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

const TOKEN_PROGRAM_IDS = [
  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
];

function readHolderOwner(account: unknown): string | null {
  if (!account || typeof account !== "object") return null;
  const parsedAccount = account as {
    account?: {
      data?: {
        program?: string;
        parsed?: {
          type?: string;
          info?: {
            owner?: string;
            tokenAmount?: {
              amount?: string;
            };
          };
        };
      };
    };
  };

  const parsed = parsedAccount.account?.data?.parsed;
  if (parsedAccount.account?.data?.program !== "spl-token") return null;
  if (parsed?.type !== "account") return null;

  const amount = parsed.info?.tokenAmount?.amount;
  const owner = parsed.info?.owner;
  if (!owner || !amount) return null;
  if (BigInt(amount) <= BigInt(0)) return null;

  return owner;
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
    const connection = new Connection(RPC_URL, "confirmed");
    const ownerSet = new Set<string>();

    for (const programId of TOKEN_PROGRAM_IDS) {
      const accounts = await connection.getParsedProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 0, bytes: mintPubkey.toBase58() } }],
      });

      for (const account of accounts) {
        const owner = readHolderOwner(account);
        if (owner) ownerSet.add(owner);
      }
    }

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
