import { NextResponse } from "next/server";
import {
  getAllowlistPath,
  parseWalletListInput,
  readAllowlistedWallets,
  writeAllowlistedWallets,
} from "@/lib/allowlist";

export const runtime = "nodejs";

type AllowlistRequestBody = {
  wallets?: string;
};

export async function GET() {
  try {
    const wallets = await readAllowlistedWallets();

    return NextResponse.json({
      wallets,
      walletText: wallets.join("\n"),
      filePath: getAllowlistPath(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read allowlist.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AllowlistRequestBody;
    const wallets = await writeAllowlistedWallets(
      parseWalletListInput(body.wallets ?? "")
    );

    return NextResponse.json({
      message: "Wallet allowlist updated.",
      wallets,
      walletText: wallets.join("\n"),
      filePath: getAllowlistPath(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update allowlist.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
