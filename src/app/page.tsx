import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-12">
      <header className="mb-12 flex items-center justify-between border-b border-vault-border pb-6">
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Vault Manager
        </h1>
        <nav className="flex gap-4">
          <Link
            href="/dashboard"
            className="btn-primary"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl space-y-8">
        <div className="card">
          <h2 className="mb-2 text-xl font-semibold text-white">
            Multi-Strategy Yield Vault
          </h2>
          <p className="text-vault-muted">
            Four real-yield strategies on Ranger Finance: Funding arbitrage (Drift), stable lending (Kamino/Marginfi), LST staking (Jupiter), and Treasury carry. Target ≥10% APY for the Ranger Build-a-Bear Hackathon.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/dashboard" className="card block transition hover:border-vault-primary">
            <h3 className="font-semibold text-white">Dashboard</h3>
            <p className="mt-1 text-sm text-vault-muted">
              View TVL, strategy allocation, and APY. Deposit or withdraw.
            </p>
          </Link>
          <a
            href="https://docs.ranger.finance/vault-owners/strategies/setup-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="card block transition hover:border-vault-primary"
          >
            <h3 className="font-semibold text-white">Ranger Docs</h3>
            <p className="mt-1 text-sm text-vault-muted">
              Strategy setup, adaptors, and SDK reference.
            </p>
          </a>
        </div>

        <div className="card border-vault-primary/30 bg-vault-primary/5">
          <h3 className="font-semibold text-vault-primary">Hackathon</h3>
          <p className="mt-1 text-sm text-vault-muted">
            Ranger Build-a-Bear Hackathon — 1M USDC prizes. Backend + Blockchain track.
          </p>
          <a
            href="https://superteam.fun/earn/listing/ranger-build-a-bear-hackathon-main-track/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-vault-primary underline"
          >
            View listing →
          </a>
        </div>
      </section>
    </main>
  );
}
