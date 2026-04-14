K1 Update - 20/1/2026

## Frontend wallet allowlist

The landing page now includes a lightweight off-chain allowlist gate for Solana
wallets. It is enforced by the frontend and API only, so it is useful for early
access control but does not replace on-chain permissioning.

The allowlist is managed directly in the manager console and saved to:

[config/wallet-allowlist.json](c:/Users/Utkarsh/k1-protocol/config/wallet-allowlist.json)

The homepage lets a user connect Phantom and try the frontend mint flow. If the
wallet is not approved, the app shows:

```text
Your Wallet is not whitelisted. Contact @utkarsh_k1c on X or TG to get whitelisted
```

If you prefer, the app can still bootstrap from `WALLET_ALLOWLIST` or
`NEXT_PUBLIC_WALLET_ALLOWLIST` when the JSON file does not exist yet.
