"use client";

import { useEffect, useState } from "react";

const NOT_WHITELISTED_MESSAGE =
  "Your Wallet is not whitelisted. Contact @utkarsh_k1c on X or TG to get whitelisted";

type WalletProvider = {
  isPhantom?: boolean;
  connect: () => Promise<{
    publicKey: {
      toBase58: () => string;
    };
  }>;
};

type CheckState =
  | {
      kind: "idle";
      message: string;
    }
  | {
      kind: "success";
      message: string;
      allowed?: boolean;
    }
  | {
      kind: "error";
      message: string;
    };

declare global {
  interface Window {
    solana?: WalletProvider;
  }
}

const initialState: CheckState = {
  kind: "idle",
  message: "Connect a wallet to check whether it can use the frontend mint flow.",
};

export function AllowlistChecker() {
  const [walletAddress, setWalletAddress] = useState("");
  const [state, setState] = useState<CheckState>(initialState);
  const [isChecking, setIsChecking] = useState(false);
  const [walletCount, setWalletCount] = useState<number | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/allowlist");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load allowlist status.");
        }

        setWalletCount(data.walletCount);
      } catch (error) {
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load allowlist status.",
        });
      }
    };

    void loadStatus();
  }, []);

  const connectWallet = () => {
    void (async () => {
      const provider = window.solana;

      if (!provider?.isPhantom) {
        setState({
          kind: "error",
          message: "Phantom wallet was not detected in this browser.",
        });
        return;
      }

      try {
        const result = await provider.connect();
        const nextWallet = result.publicKey.toBase58();

        setWalletAddress(nextWallet);
        setState({
          kind: "success",
          message: "Wallet connected. You can now try the mint access check.",
        });
      } catch (error) {
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Wallet connection was cancelled.",
        });
      }
    })();
  };

  const tryMint = () => {
    void (async () => {
      if (!walletAddress) {
        setState({
          kind: "error",
          message: "Connect your wallet first before trying to mint.",
        });
        return;
      }

      setIsChecking(true);
      setState({
        kind: "idle",
        message: "Checking wallet access for mint...",
      });

      try {
        const response = await fetch("/api/allowlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to check allowlist.");
        }

        if (!data.allowed) {
          setState({
            kind: "error",
            message: NOT_WHITELISTED_MESSAGE,
          });
          return;
        }

        setState({
          kind: "success",
          allowed: true,
          message:
            "Wallet is whitelisted. The frontend can now continue into the mint flow.",
        });
      } catch (error) {
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to check allowlist.",
        });
      } finally {
        setIsChecking(false);
      }
    })();
  };

  return (
    <section className="mt-10 max-w-2xl rounded-[28px] border border-white/10 bg-black/45 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-200/70">
          Wallet Access
        </p>
        <h2 className="font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-2xl text-stone-50 md:text-3xl">
          Connect first, then gate mint access by allowlist.
        </h2>
        <p className="text-sm leading-6 text-stone-300 md:text-base">
          The whitelist is managed in the manager console. Only approved wallets
          can continue through the frontend mint flow.
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
          {walletCount === null
            ? "Loading allowlist status..."
            : `${walletCount} wallet${walletCount === 1 ? "" : "s"} currently approved`}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.25em] text-stone-400">
          Connected Wallet
        </div>
        <div className="mt-2 break-all font-mono text-sm text-stone-100">
          {walletAddress || "No wallet connected"}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={connectWallet}
          className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-white/15"
        >
          Connect Phantom
        </button>
        <button
          type="button"
          onClick={tryMint}
          disabled={isChecking}
          className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? "Checking..." : "Try Mint"}
        </button>
      </div>

      <div
        className={`mt-5 rounded-2xl border px-4 py-4 text-sm leading-6 ${
          state.kind === "success"
            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"
            : state.kind === "error"
              ? "border-rose-300/30 bg-rose-300/10 text-rose-50"
              : "border-white/10 bg-white/5 text-stone-300"
        }`}
      >
        {state.message}
      </div>
    </section>
  );
}
