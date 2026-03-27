import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { VoltrClient } from "@voltr/vault-sdk";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.mainnet-beta.solana.com";
const ASSET_DECIMALS = 6;
const LP_DECIMALS = 9;

export async function GET(
  _req: Request,
  context: { params: Promise<{ vault: string }> }
) {
  const { vault } = await context.params;

  let vaultPubkey: PublicKey;
  try {
    vaultPubkey = new PublicKey(vault);
  } catch {
    return NextResponse.json(
      { error: "Invalid vault pubkey" },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(RPC_URL);
    const client = new VoltrClient(connection);
    const vaultData = await client.fetchVaultAccount(vaultPubkey);
    const currentAssetPerLp = await client.getCurrentAssetPerLpForVault(vaultPubkey);
    const currentPrice = currentAssetPerLp * 10 ** (LP_DECIMALS - ASSET_DECIMALS);

    return NextResponse.json(
      {
        address: vault,
        assetTotalValue: vaultData.asset.totalValue.toString(),
        currentAssetPerLp,
        currentPrice,
        assetMint: vaultData.asset.mint.toBase58(),
        admin: vaultData.admin.toBase58(),
        manager: vaultData.manager.toBase58(),
        raw: vaultData,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Vault overview SDK error:", e);
    return NextResponse.json(
      { error: "Failed to load vault via SDK" },
      { status: 500 }
    );
  }
}
