import { PublicKey } from "@solana/web3.js";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT_DIR, "config", "wallet-allowlist.json");
const ENV_KEYS = [
  "WALLET_ALLOWLIST",
  "NEXT_PUBLIC_WALLET_ALLOWLIST",
] as const;

const splitWalletList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeWallet = (value: string) => new PublicKey(value.trim()).toBase58();

const normalizeWalletList = (wallets: string[]) => {
  const uniqueWallets = new Set<string>();

  for (const wallet of wallets) {
    uniqueWallets.add(normalizeWallet(wallet));
  }

  return Array.from(uniqueWallets).sort((a, b) => a.localeCompare(b));
};

const readWalletsFromEnv = () => {
  const wallets: string[] = [];

  for (const key of ENV_KEYS) {
    const rawValue = process.env[key];

    if (!rawValue) {
      continue;
    }

    wallets.push(...splitWalletList(rawValue));
  }

  return normalizeWalletList(wallets);
};

const ensureAllowlistDirectory = async () => {
  await fs.mkdir(path.dirname(ALLOWLIST_PATH), { recursive: true });
};

export const validateWalletAddress = (walletAddress: string) =>
  normalizeWallet(walletAddress);

export const readAllowlistedWallets = async () => {
  try {
    const source = await fs.readFile(ALLOWLIST_PATH, "utf8");
    const parsed = JSON.parse(source) as { wallets?: unknown };

    if (!Array.isArray(parsed.wallets)) {
      throw new Error("wallet-allowlist.json must contain a wallets array.");
    }

    return normalizeWalletList(
      parsed.wallets.map((wallet) => {
        if (typeof wallet !== "string") {
          throw new Error("Each allowlisted wallet must be a string.");
        }

        return wallet;
      })
    );
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return readWalletsFromEnv();
    }

    throw error;
  }
};

export const writeAllowlistedWallets = async (wallets: string[]) => {
  const normalizedWallets = normalizeWalletList(wallets);

  await ensureAllowlistDirectory();
  await fs.writeFile(
    ALLOWLIST_PATH,
    `${JSON.stringify({ wallets: normalizedWallets }, null, 2)}\n`,
    "utf8"
  );

  return normalizedWallets;
};

export const parseWalletListInput = (value: string) =>
  splitWalletList(value);

export const isWalletAllowlisted = async (walletAddress: string) => {
  const normalizedWallet = normalizeWallet(walletAddress);
  const wallets = await readAllowlistedWallets();
  return wallets.includes(normalizedWallet);
};

export const getAllowlistConfigError = async () => {
  try {
    await readAllowlistedWallets();
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Wallet allowlist configuration is invalid.";
  }
};

export const getAllowlistPath = () => ALLOWLIST_PATH;
