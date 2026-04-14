import { NextResponse } from "next/server";
import {
  getAllowlistConfigError,
  isWalletAllowlisted,
  readAllowlistedWallets,
  validateWalletAddress,
} from "@/lib/allowlist";

export const runtime = "nodejs";

type AllowlistRequestBody = {
  walletAddress?: string;
};

export async function GET() {
  const configError = await getAllowlistConfigError();

  if (configError) {
    return NextResponse.json(
      { error: configError, configured: false, walletCount: 0 },
      { status: 500 }
    );
  }

  return NextResponse.json({
    configured: true,
    walletCount: (await readAllowlistedWallets()).length,
  });
}

export async function POST(request: Request) {
  try {
    const configError = await getAllowlistConfigError();

    if (configError) {
      return NextResponse.json(
        { error: configError, configured: false },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AllowlistRequestBody;
    const walletAddress = body.walletAddress?.trim();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
    }

    const normalizedWallet = validateWalletAddress(walletAddress);

    return NextResponse.json({
      configured: true,
      normalizedWallet,
      allowed: isWalletAllowlisted(normalizedWallet),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to check allowlist.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
