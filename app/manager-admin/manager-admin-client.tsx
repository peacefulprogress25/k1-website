"use client";

import { useEffect, useState } from "react";

type TrustfulConfig = {
  depositStrategyAmount: string;
  withdrawStrategyAmount: string;
  positionValueAfterDeposit: string;
  positionValueAfterWithdraw: string;
};

type ActionKey =
  | "manager-deposit-arbitrary"
  | "manager-withdraw-arbitrary"
  | "query-pending-redemptions"
  | "admin-update-manager";

type ActionState = {
  type: "idle" | "success" | "error";
  message: string;
  output: string;
};

const EMPTY_STATE: ActionState = {
  type: "idle",
  message: "",
  output: "",
};

const DEFAULT_CONFIG: TrustfulConfig = {
  depositStrategyAmount: "",
  withdrawStrategyAmount: "",
  positionValueAfterDeposit: "",
  positionValueAfterWithdraw: "",
};

const ASSET_SYMBOL = "USDC";
const ASSET_DECIMALS = 6;

const actionMeta: Record<
  ActionKey,
  { title: string; description: string; tone: string; confirmText: string }
> = {
  "manager-deposit-arbitrary": {
    title: "Manager Deposit Arbitrary",
    description:
      "Saves the current trustful config values and runs the manager deposit flow.",
    tone: "border-emerald-400/30 bg-emerald-500/10",
    confirmText:
      "Run manager deposit with the currently entered trustful config values?",
  },
  "manager-withdraw-arbitrary": {
    title: "Manager Withdraw Arbitrary",
    description:
      "Saves the current trustful config values and runs the manager withdraw flow.",
    tone: "border-amber-400/30 bg-amber-500/10",
    confirmText:
      "Run manager withdraw with the currently entered trustful config values?",
  },
  "query-pending-redemptions": {
    title: "Query Pending Redemptions",
    description:
      "Fetches the current pending redemption summary and per-user breakdown.",
    tone: "border-sky-400/30 bg-sky-500/10",
    confirmText: "Query pending redemptions now?",
  },
  "admin-update-manager": {
    title: "Update Manager Address",
    description:
      "Updates the vault manager on-chain through a dedicated admin script.",
    tone: "border-rose-400/30 bg-rose-500/10",
    confirmText:
      "Update the vault manager address? Double-check the destination wallet before continuing.",
  },
};

const fieldMeta = [
  {
    key: "depositStrategyAmount",
    label: "Deposit Strategy Amount",
    hint: "Amount of base asset to deposit, in smallest units.",
  },
  {
    key: "withdrawStrategyAmount",
    label: "Withdraw Strategy Amount",
    hint: "Amount of base asset to withdraw, in smallest units.",
  },
  {
    key: "positionValueAfterDeposit",
    label: "Position Value After Deposit",
    hint: "Expected strategy position value after deposit.",
  },
  {
    key: "positionValueAfterWithdraw",
    label: "Position Value After Withdraw",
    hint: "Expected strategy position value after withdrawal.",
  },
] as const;

const sectionCardClass =
  "rounded-[28px] border border-white/10 bg-black/35 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const formatDisplayAmount = (rawValue: string) => {
  const sanitized = rawValue.replace(/^0+(?=\d)/, "") || "0";
  const padded = sanitized.padStart(ASSET_DECIMALS + 1, "0");
  const whole = padded.slice(0, -ASSET_DECIMALS) || "0";
  const fraction = padded.slice(-ASSET_DECIMALS).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
};

const toRawAmount = (displayValue: string) => {
  const trimmed = displayValue.trim();

  if (!trimmed) {
    return "";
  }

  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) {
    throw new Error(
      `Amounts must be numeric and can have up to ${ASSET_DECIMALS} decimal places.`
    );
  }

  const [wholePart, fractionalPart = ""] = trimmed.split(".");
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fractionalPart
    .padEnd(ASSET_DECIMALS, "0")
    .slice(0, ASSET_DECIMALS);

  const combined = `${normalizedWhole}${normalizedFraction}`.replace(
    /^0+(?=\d)/,
    ""
  );

  return combined || "0";
};

export function ManagerAdminClient() {
  const [config, setConfig] = useState<TrustfulConfig>(DEFAULT_CONFIG);
  const [managerAddress, setManagerAddress] = useState("");
  const [allowlistText, setAllowlistText] = useState("");
  const [allowlistPath, setAllowlistPath] = useState("");
  const [state, setState] = useState<ActionState>(EMPTY_STATE);
  const [isPending, setIsPending] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const summary = [
    {
      label: "Deposit",
      value: config.depositStrategyAmount || "Not set",
    },
    {
      label: "Withdraw",
      value: config.withdrawStrategyAmount || "Not set",
    },
    {
      label: "Post-deposit",
      value: config.positionValueAfterDeposit || "Not set",
    },
    {
      label: "Post-withdraw",
      value: config.positionValueAfterWithdraw || "Not set",
    },
  ];

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/manager-admin/config");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load trustful config.");
        }

        setConfig({
          depositStrategyAmount: formatDisplayAmount(
            data.config.depositStrategyAmount
          ),
          withdrawStrategyAmount: formatDisplayAmount(
            data.config.withdrawStrategyAmount
          ),
          positionValueAfterDeposit: formatDisplayAmount(
            data.config.positionValueAfterDeposit
          ),
          positionValueAfterWithdraw: formatDisplayAmount(
            data.config.positionValueAfterWithdraw
          ),
        });

        const allowlistResponse = await fetch("/api/manager-admin/allowlist");
        const allowlistData = await allowlistResponse.json();

        if (!allowlistResponse.ok) {
          throw new Error(allowlistData.error ?? "Failed to load allowlist.");
        }

        setAllowlistText(allowlistData.walletText);
        setAllowlistPath(allowlistData.filePath);
      } catch (error) {
        setState({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load trustful config.",
          output: "",
        });
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, []);

  const updateField = (key: keyof TrustfulConfig, value: string) => {
    setConfig((current) => ({
      ...current,
      [key]: value.replace(/[^\d.]/g, ""),
    }));
  };

  const getRawConfig = () => ({
    depositStrategyAmount: toRawAmount(config.depositStrategyAmount),
    withdrawStrategyAmount: toRawAmount(config.withdrawStrategyAmount),
    positionValueAfterDeposit: toRawAmount(config.positionValueAfterDeposit),
    positionValueAfterWithdraw: toRawAmount(config.positionValueAfterWithdraw),
  });

  const saveConfig = () => {
    void (async () => {
      setIsPending(true);
      setState({
        type: "idle",
        message: "Saving trustful config...",
        output: "",
      });

      try {
        const response = await fetch("/api/manager-admin/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ config: getRawConfig() }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to save trustful config.");
        }

        setConfig({
          depositStrategyAmount: formatDisplayAmount(
            data.config.depositStrategyAmount
          ),
          withdrawStrategyAmount: formatDisplayAmount(
            data.config.withdrawStrategyAmount
          ),
          positionValueAfterDeposit: formatDisplayAmount(
            data.config.positionValueAfterDeposit
          ),
          positionValueAfterWithdraw: formatDisplayAmount(
            data.config.positionValueAfterWithdraw
          ),
        });
        setState({
          type: "success",
          message: data.message,
          output: "",
        });
      } catch (error) {
        setState({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save trustful config.",
          output: "",
        });
      } finally {
        setIsPending(false);
      }
    })();
  };

  const saveAllowlist = () => {
    void (async () => {
      setIsPending(true);
      setState({
        type: "idle",
        message: "Saving wallet allowlist...",
        output: "",
      });

      try {
        const response = await fetch("/api/manager-admin/allowlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wallets: allowlistText }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to save allowlist.");
        }

        setAllowlistText(data.walletText);
        setAllowlistPath(data.filePath);
        setState({
          type: "success",
          message: data.message,
          output: `${data.wallets.length} wallet(s) allowlisted.`,
        });
      } catch (error) {
        setState({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to save allowlist.",
          output: "",
        });
      } finally {
        setIsPending(false);
      }
    })();
  };

  const runAction = (action: ActionKey) => {
    if (!window.confirm(actionMeta[action].confirmText)) {
      return;
    }

    void (async () => {
      setIsPending(true);
      setState({
        type: "idle",
        message: `Running ${actionMeta[action].title}...`,
        output: "",
      });

      try {
        const response = await fetch("/api/manager-admin/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            config: getRawConfig(),
            managerAddress,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Action failed.");
        }

        const output = [data.stdout, data.stderr].filter(Boolean).join("\n\n");

        setState({
          type: "success",
          message: data.message,
          output,
        });
      } catch (error) {
        setState({
          type: "error",
          message: error instanceof Error ? error.message : "Action failed.",
          output: "",
        });
      } finally {
        setIsPending(false);
      }
    })();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#18353a_0%,#081014_45%,#040506_100%)] px-6 py-10 text-stone-100 md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 text-xs uppercase tracking-[0.35em] text-emerald-200/70">
                Manager Console
              </p>
              <h1 className="max-w-2xl font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-4xl leading-tight text-stone-50 md:text-6xl">
                Trustful vault controls for the manager and admin flows you
                actually use.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
                This page edits the live values in
                <span className="mx-2 rounded bg-white/10 px-2 py-1 font-mono text-xs text-stone-100">
                  trustful-scripts/config/trustful.ts
                </span>
                and can run the important trustful scripts directly from the app.
                Inputs are shown in normal {ASSET_SYMBOL} amounts and converted
                to raw units automatically.
              </p>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px]">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.25em] text-stone-400">
                    {item.label}
                  </div>
                  <div className="mt-2 break-all font-mono text-sm text-stone-100">
                    {item.value} {ASSET_SYMBOL}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className={sectionCardClass}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-2xl text-stone-50">
                  Trustful Config
                </h2>
                <p className="mt-2 text-sm text-stone-400">
                  Edit the four manager-critical values in normal{" "}
                  {ASSET_SYMBOL} amounts. The page converts them to raw
                  10^{ASSET_DECIMALS} units before saving or running a script.
                </p>
              </div>
              <button
                type="button"
                onClick={saveConfig}
                disabled={isPending || isLoadingConfig}
                className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Config
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fieldMeta.map((field) => (
                <label
                  key={field.key}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="text-sm font-medium text-stone-100">
                    {field.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-stone-400">
                    {field.hint}
                  </span>
                  <input
                    value={config[field.key]}
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.0"
                    disabled={isLoadingConfig}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-emerald-300/40"
                  />
                  <span className="mt-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    {ASSET_SYMBOL} display amount
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className={sectionCardClass}>
            <h2 className="font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-2xl text-stone-50">
              Admin Update
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              The manager-address change now uses a dedicated admin script, so
              you do not need to repurpose the generic config updater by hand.
            </p>

            <label className="mt-6 block rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-medium text-stone-100">
                New Manager Address
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-400">
                Valid Solana public key. This updates the vault&apos;s manager
                field on-chain.
              </span>
              <input
                value={managerAddress}
                onChange={(event) => setManagerAddress(event.target.value)}
                placeholder="Enter manager public key"
                className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-rose-300/40"
              />
            </label>

            <button
              type="button"
              onClick={() => runAction("admin-update-manager")}
              disabled={isPending}
              className="mt-4 w-full rounded-full border border-rose-300/30 bg-rose-300/10 px-5 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update Manager Address
            </button>
          </section>
        </div>

        <section className={sectionCardClass}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-2xl text-stone-50">
                2EFUo6sMPdc4nH4GfPExpgQJEk1dicYz2gNdDaJFvvRs
              </h2>
              <p className="mt-2 text-sm text-stone-400">
                Paste one Solana wallet per line. These wallets are allowed to
                use the frontend mint flow. Non-whitelisted wallets will see
                your custom contact message.
              </p>
              {allowlistPath ? (
                <p className="mt-2 font-mono text-xs text-stone-500">
                  Saved to {allowlistPath}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveAllowlist}
              disabled={isPending || isLoadingConfig}
              className="rounded-full border border-sky-300/30 bg-sky-300/10 px-5 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Allowlist
            </button>
          </div>

          <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="text-sm font-medium text-stone-100">
              Whitelisted Wallet Addresses
            </span>
            <span className="mt-1 block text-xs leading-5 text-stone-400">
              One valid Solana wallet per line. Duplicate entries are removed
              automatically when saved.
            </span>
            <textarea
              value={allowlistText}
              onChange={(event) => setAllowlistText(event.target.value)}
              placeholder="Enter one Solana wallet address per line"
              disabled={isLoadingConfig}
              rows={8}
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-sky-300/40"
            />
          </label>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {(
            [
              "manager-deposit-arbitrary",
              "manager-withdraw-arbitrary",
              "query-pending-redemptions",
            ] as const
          ).map((action) => (
            <article
              key={action}
              className={`${sectionCardClass} ${actionMeta[action].tone}`}
            >
              <h3 className="text-xl font-medium text-stone-50">
                {actionMeta[action].title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                {actionMeta[action].description}
              </p>
              <button
                type="button"
                onClick={() => runAction(action)}
                disabled={isPending}
                className="mt-6 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm text-stone-50 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Run Action
              </button>
            </article>
          ))}
        </section>

        <section className={sectionCardClass}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-[Iowan_Old_Style,Palatino_Linotype,Book_Antiqua,Georgia,serif] text-2xl text-stone-50">
              Console Output
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                state.type === "success"
                  ? "bg-emerald-300/15 text-emerald-100"
                  : state.type === "error"
                    ? "bg-rose-300/15 text-rose-100"
                    : "bg-white/10 text-stone-300"
              }`}
            >
              {isPending ? "Running" : state.type}
            </span>
          </div>

          <p className="mt-3 text-sm text-stone-300">
            {isLoadingConfig
              ? "Loading current trustful configuration..."
              : state.message || "No action has been run yet."}
          </p>

          <pre className="mt-5 min-h-52 overflow-x-auto rounded-2xl border border-white/10 bg-[#031116] p-4 font-mono text-xs leading-6 text-emerald-100/90">
            {state.output ||
              "Script output will appear here after you save config or run an action."}
          </pre>
        </section>
      </div>
    </main>
  );
}
