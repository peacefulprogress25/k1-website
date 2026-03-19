import type { ReactNode } from "react";
import Link from "next/link";

type SplitSectionProps = {
  id?: string;
  title: string;
  body?: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  kicker?: string;
  children?: ReactNode;
};

function Navigation() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-black/10 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex items-center justify-between px-6 py-4 lg:px-12">
        <a href="/" className="flex items-center gap-3">
          <img src="/k1-logo.png" alt="K1" className="h-8 w-auto" />
        </a>

        <div className="font-landing-body flex items-center gap-4 sm:gap-6">
          <Link
            href="/dashboard"
            className="rounded-full border border-[#d3661c] px-4 py-2 text-[1.125rem] font-medium text-[#d3661c] transition-colors hover:bg-[#d3661c] hover:text-white"
          >
            Mint
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="bg-white pt-0 lg:min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="flex min-h-[55vh] flex-col justify-center px-6 pb-10 pt-28 lg:min-h-screen lg:px-12 lg:py-0">
          <div className="mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
            <h1 className="text-hero mb-6 text-black">
              Stablecoin that funds energy
            </h1>

            <p className="font-landing-body mb-8 text-lg font-medium leading-relaxed text-black/60">
              Energy that provides yield
            </p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start lg:gap-6">
              <div className="flex items-baseline gap-2">
                <span className="font-landing-body text-sm font-medium text-black/60">Expected APY:</span>
                <span className="font-landing-body text-lg font-medium text-black">11%</span>
              </div>

              <div className="hidden h-4 w-px bg-black/15 sm:block" />

              <div className="flex items-baseline gap-2">
                <span className="font-landing-body text-sm font-medium text-black/60">TVL:</span>
                <span className="font-landing-body text-lg font-medium text-black">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-screen items-stretch justify-center lg:flex">
          <img
            src="https://i.ibb.co/pBggYVMr/Gemini-Generated-Image-om6iymom6iymom6i-1.webp"
            alt="K1 hero visual"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="h-60 sm:h-72 lg:hidden">
          <img
            src="https://i.ibb.co/pBggYVMr/Gemini-Generated-Image-om6iymom6iymom6i-1.webp"
            alt="K1 hero visual"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function SplitSection({
  id,
  title,
  body,
  imageSrc,
  imageAlt,
  reverse = false,
  kicker,
  children,
}: SplitSectionProps) {
  const textColumn = (
    <div className="flex min-h-[28rem] flex-col justify-center px-8 py-20 lg:min-h-screen lg:px-12 lg:py-0">
      <div className="mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
        {kicker ? (
          <p className="font-landing-body mb-8 text-sm font-medium uppercase tracking-[0.12em] text-black/45">{kicker}</p>
        ) : null}
        <h2 className="text-mega mb-6 text-black">
          {title}
        </h2>
        {body ? <p className="font-landing-body text-lg leading-relaxed text-black/60">{body}</p> : null}
        {children}
      </div>
    </div>
  );

  const imageColumn = (
    <>
      <div className="hidden min-h-screen items-center justify-center bg-neutral-100 lg:flex">
        <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
      </div>
      <div className="h-96 lg:hidden">
        <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
      </div>
    </>
  );

  return (
    <section id={id} className="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {reverse ? imageColumn : textColumn}
        {reverse ? textColumn : imageColumn}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <SplitSection
      id="how-it-works"
      kicker="How It Works"
      title=""
      imageSrc="https://i.ibb.co/0RGCVpqM/Gemini-Generated-Image-i9gbuei9gbuei9gb-1.webp"
      imageAlt="How K1 works"
    >
      <div className="font-landing-body space-y-6 text-left">
        <div>
          <h3 className="numbered-item mb-2 text-black">1. Get K1</h3>
          <p className="text-base leading-relaxed text-black/60">
            Swap USD for K1, a liquid and redeemable stablecoin funding energy infrastructure.
          </p>
        </div>
        <div>
          <h3 className="numbered-item mb-2 text-black">2. Earn with K1</h3>
          <p className="text-base leading-relaxed text-black/60">
            Simply hold K1 which increases in value as it accrues yield from energy.
          </p>
        </div>
        <div>
          <h3 className="numbered-item mb-2 text-black">3. Use K1</h3>
          <p className="text-base leading-relaxed text-black/60">
            Use K1 as a liquid yield bearing stablecoin across defi for trade, as collateral or for payments.
          </p>
        </div>
      </div>
    </SplitSection>
  );
}

function Ecosystem() {
  return (
    <SplitSection
      id="ecosystem"
      title="Liquidity engine for energy"
      imageSrc="https://i.ibb.co/3ys7cs5d/wmremove-transformed.webp"
      imageAlt="K1 ecosystem"
    >
      <div className="font-landing-body space-y-6 text-left">
        <div>
          <h3 className="numbered-item mb-2 text-black">1. Providers</h3>
          <p className="text-base leading-relaxed text-black/60">
            Mint K1 with USD and simply hold to earn yield.
          </p>
        </div>
        <div>
          <h3 className="numbered-item mb-2 text-black">2. Executors</h3>
          <p className="text-base leading-relaxed text-black/60">
            Build and operate energy generation, storage, and distribution systems.
          </p>
        </div>
        <div>
          <h3 className="numbered-item mb-2 text-black">3. Enablers</h3>
          <p className="text-base leading-relaxed text-black/60">
            Vet projects and bridge onchain capital with offchain execution.
          </p>
        </div>
      </div>
    </SplitSection>
  );
}

function Footer() {
  return (
    <footer className="font-landing-body border-t border-black/10 bg-white py-12">
      <div className="mx-auto px-6 lg:px-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-5">
            <a
              href="https://solarpunkdao.gitbook.io/k1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-black/60 transition-colors hover:text-black"
            >
              Docs
            </a>
            <a
              href="https://x.com/solarpunkdao"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 transition-opacity hover:opacity-100"
            >
              <img src="/x.svg" alt="X" className="h-5 w-5" />
            </a>
            <a
              href="https://t.me/+MWUrdlbcUbE4MzA1"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 transition-opacity hover:opacity-100"
            >
              <img src="/telegram.svg" alt="Telegram" className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-black/10 pt-6 text-xs text-black/45">
          Copyright 2026 K1 Protocol. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="landing-page landing-surface font-landing-body min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <SplitSection
          title="K1 earns yield by financing energy production, distribution, and storage."
          imageSrc="https://i.ibb.co/jPcpzp4P/Gemini-Generated-Image-nx7c29nx7c29nx7c.webp"
          imageAlt="K1 yield intro"
        />
        <HowItWorks />
        <SplitSection
          title="Modern civilization moves on energy."
          body="K1 will be its fulcrum."
          imageSrc="https://i.ibb.co/G4zbW3CZ/Gemini-Generated-Image-7tbw4w7tbw4w7tbw-1.webp"
          imageAlt="Modern civilization energy visual"
        />
        <Ecosystem />
        <SplitSection
          id="energy-finance"
          title="$3.5 trillion is invested annually across energy industries."
          body="0% of that happens onchain. K1 fixes this."
          imageSrc="https://i.ibb.co/prNLNtG6/Gemini-Generated-Image-5a2bld5a2bld5a2b.webp"
          imageAlt="Energy finance visual"
        />
        <SplitSection
          id="vision"
          title="Path to prosperity goes through energy abundance."
          body="Use K1 as your currency to make this a reality."
          imageSrc="https://i.ibb.co/DyHT8H1/Chat-GPT-Image-Jan-19-2026-04-13-23-PM-1.webp"
          imageAlt="K1 vision visual"
        />
      </main>
      <Footer />
    </div>
  );
}
