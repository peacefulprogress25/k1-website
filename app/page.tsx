import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO SECTION */}
      <section className="relative w-full h-screen">

        {/* TOP RIGHT ACTION */}
        <div className="absolute top-6 right-6 z-20">
          <Link
            href="/mint"
            className="inline-flex items-center rounded-full border border-white/60 bg-black/25 px-6 py-2 text-sm md:text-base font-medium tracking-wide text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
          >
            Mint
          </Link>
        </div>

        {/* BACKGROUND IMAGE */}
        <img
          src="https://i.ibb.co/ksqvFyww/image.png"
          alt="K1 energy future"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-black/40" />

        {/* CONTENT */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-2xl px-8 md:px-16 text-left">

            {/* MAIN TAGLINE */}
            <div className="text-3xl md:text-5xl font-normal tracking-tight mb-6 whitespace-normal md:whitespace-nowrap">
              Stablecoin that funds energy.
            </div>

            {/* SUB TAGLINE */}
            <p className="text-lg md:text-xl text-gray-200 mb-10">
              Financial substrate for a Kardashev I civilization.
            </p>

            {/* SOCIAL ICON LINKS */}
            <div className="flex items-center gap-6">
              <a
                href="https://t.me/+MWUrdlbcUbE4MzA1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/icons/telegram.svg"
                  alt="Telegram"
                  className="h-6 w-6 text-white opacity-80 hover:opacity-100 transition"
                />
              </a>

              <a
                href="https://x.com/solarpunkdao"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/icons/x.svg"
                  alt="X"
                  className="h-6 w-6 opacity-80 hover:opacity-100 transition"
                />
              </a>

              <a
                href="https://solarpunkdao.gitbook.io/k1/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/icons/gitbook.svg"
                  alt="GitHub"
                  className="h-6 w-6 opacity-80 hover:opacity-100 transition"
                />
              </a>
            </div>

          </div>
        </div>

      </section>

    </main>
  );
}
