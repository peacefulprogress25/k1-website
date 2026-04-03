"use client";

import { useRouter } from "next/navigation";
import { motion, useScroll, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Twitter, BookOpen, Sun, Wind, Atom, Droplet, Fuel, Grid3X3, User, Brain, Bot, Users, ShoppingBag, TrendingUp, ShieldCheck, Landmark, Building2, Send, Globe, BarChart3, Cpu, Battery } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer 
} from "recharts";
import { K1Logo } from "@/components/K1Logo";
import { fetchVaultsTvl } from "@/lib/ranger-api";
import { parseTvlResponse, parseVaultResponse } from "@/lib/vault-parse";

const VAULT_PUBKEYS = (process.env.NEXT_PUBLIC_VAULT_PUBKEYS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const SECTIONS = [
  {
    id: 0,
    prefix: "Money that",
    suffix: "creates energy.",
    subheading: "Energy that creates yield",
    description: "K1 is a stablecoin that mobilizes global capital into energy infra. Making energy collateral for a new reserve currency.",
    graphic: "sphere",
  },
  {
    id: 1,
    prefix: "Money that",
    suffix: "earns superior yield.",
    subheading: "Reliable, Uncorrelated, Scalable",
    description: "Outperform 95% of yield-bearing stablecoins simply by holding K1. Your balance auto-compounds effortlessly, no staking required.",
    graphic: "chart",
  },
  {
    id: 2,
    prefix: "Money that",
    suffix: "fuels the energy supercycle.",
    subheading: "A $3 Trillion+ annual opportunity",
    description: "Catalysts like AI, EVs, energy security, and net-zero have triggered an unprecedented energy supercycle. While traditional markets move at a glacial pace, K1 empowers anyone, anywhere in the world, to fuel this supercycle with a single transaction",
    graphic: "geometric",
  },
  {
    id: 3,
    prefix: "Money that",
    suffix: "stores productive energy.",
    subheading: "A structural hedge against fiat debasement.",
    description: "Fiat systems continuously dilute your claim on energy from money, K1 is designed to grow it. Backed by assets that are continuously creating, distributing or storing energy, each token creates more energy over time.",
    graphic: "battery",
  },
  {
    id: 4,
    prefix: "Money for",
    suffix: "humans, agents & robots.",
    subheading: "Currency for the post scarcity economy.",
    description: "As intelligence & labor become too cheap to meter, energy will be the only currency that matters. For agents, robots to operate and for humans to earn yield from",
    graphic: "abundance",
  },
  {
    id: 5,
    prefix: "",
    suffix: "FAQs",
    subheading: "",
    description: "",
    graphic: "faq",
  },
];

const FAQ_DATA = [
  {
    question: "What is K1?",
    answer: "K1 is money backed by energy. It translates physical power generation into a highly composable, yield-bearing on-chain asset, powering the new economy for both humans and autonomous agents."
  },
  {
    question: "How do I earn with K1?",
    answer: "Simply hold it. K1 auto-compounds yield directly in your wallet with zero extra steps or friction."
  },
  {
    question: "How do you handle redemptions?",
    answer: "K1 maintains an 80% treasury buffer in highly liquid, yield-bearing assets. While the remaining 20% is deployed into hard energy infrastructure to drive long-term value, this massive liquid majority ensures instant or near-instant (1 to 3 day) redemptions under any market condition."
  },
  {
    question: "Is K1 composable in DeFi?",
    answer: "Yes. K1 is engineered to be a foundational money lego. It acts as pristine, yield-bearing collateral for lending markets and a fluid medium of exchange across the broader decentralized finance ecosystem."
  },
  {
    question: "What are the main risks?",
    answer: "All DeFi protocols carry inherent risks, including smart contract vulnerabilities, liquidity constraints, and counterparty/bad debt risks. K1 actively mitigates these through strict collateralization parameters, heavy auditing, and a treasury mandate that prioritizes principal protection above all else."
  },
  {
    question: "Where does the yield come from?",
    answer: "Yield is 100% organic. K1 generates returns from a diversified institutional portfolio - combining the cash flows of hard energy infrastructure with premium liquid strategies (T-Bills, Delta-Neutral positioning, Staking, and Reinsurance). There are zero algorithmic subsidies and zero inflationary token emissions."
  },
  {
    question: "Is K1 a stablecoin?",
    answer: "It is not hard pegged to $1 like fiat-pegged tokens (USDC or USDT) that constantly lose purchasing power to inflation, K1 is a yield-bearing asset designed to continuously grow in value. As the underlying treasury generates yield, the price of K1 steadily appreciates against the dollar."
  },
  {
    question: "Is K1 audited?",
    answer: "Yes. K1 is built on Ranger's Voltr architecture, which has undergone rigorous, extensive third-party security audits to ensure maximum protocol safety."
  }
];

function FAQAccordion({ items }: { items: typeof FAQ_DATA }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-full space-y-0 pointer-events-auto">
      {items.map((item, i) => (
        <div key={i} className="border-b border-white/10">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full py-4 flex items-center justify-between text-left group transition-all"
          >
            <span className={`text-lg transition-colors font-sans ${openIndex === i ? 'text-brand-orange' : 'text-gray-300 group-hover:text-white'}`}>
              {item.question}
            </span>
            <motion.div 
              animate={{ rotate: openIndex === i ? 45 : 0 }}
              className={`w-1.5 h-1.5 transition-colors ${openIndex === i ? 'bg-brand-orange' : 'bg-brand-orange/40 group-hover:bg-brand-orange'}`} 
            />
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className="pb-4 text-gray-500 text-sm leading-relaxed max-w-xl">
                  {item.answer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSectionRef = useRef(0);
  const snapTimeoutRef = useRef<number | null>(null);
  const isAutoSnappingRef = useRef(false);
  const wheelLockRef = useRef(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });

  const [activeSection, setActiveSection] = useState(0);
  const [globalTvl, setGlobalTvl] = useState<unknown | null>(null);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [vaultInfo, setVaultInfo] = useState<unknown | null>(null);

  const parsedTvl = parseTvlResponse(globalTvl);
  const parsedVault = parseVaultResponse(vaultInfo);
  const heroStats = [
    { label: "TVL", value: parsedTvl?.formatted && parsedTvl.formatted !== "—" ? `$${parsedTvl.formatted}` : "--" },
    { label: "APY", value: "12.11%" },
    { label: "HOLDERS", value: holderCount != null ? holderCount.toLocaleString() : "--" },
  ];

  useEffect(() => {
    fetchVaultsTvl()
      .then((response) => setGlobalTvl(response.status === "ok" ? response.data : null))
      .catch(() => setGlobalTvl(null));
  }, []);

  useEffect(() => {
    const firstVault = VAULT_PUBKEYS[0];
    if (!firstVault) return;

    fetch(`/api/vault/${firstVault}`)
      .then(async (response) => (response.ok ? await response.json() : null))
      .then(setVaultInfo)
      .catch(() => setVaultInfo(null));
  }, []);

  useEffect(() => {
    const mint =
      process.env.NEXT_PUBLIC_K1_TOKEN_MINT ||
      "CRgV3jPxmM8TbxEeVbfDCDsrRaFJkXeCUpK3QTgjWQfB";

    fetch(`/api/token/${mint}/holders`)
      .then(async (response) =>
        response.ok ? ((await response.json()) as { holders?: number }) : null
      )
      .then((data) =>
        setHolderCount(typeof data?.holders === "number" ? data.holders : null)
      )
      .catch(() => setHolderCount(null));
  }, []);

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  const scrollToSection = useCallback((index: number) => {
    if (typeof window === "undefined") return;

    const clampedIndex = Math.max(0, Math.min(index, SECTIONS.length - 1));
    const containerTop = containerRef.current?.offsetTop ?? 0;
    const targetTop = containerTop + clampedIndex * window.innerHeight;

    if (Math.abs(window.scrollY - targetTop) < 4) return;

    isAutoSnappingRef.current = true;
    window.scrollTo({ top: targetTop, behavior: "smooth" });

    window.clearTimeout(snapTimeoutRef.current ?? undefined);
    snapTimeoutRef.current = window.setTimeout(() => {
      isAutoSnappingRef.current = false;
    }, 650);
  }, []);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const section = Math.min(
        Math.floor(latest * SECTIONS.length),
        SECTIONS.length - 1
      );
      setActiveSection(section);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearSnapTimeout = () => {
      if (snapTimeoutRef.current != null) {
        window.clearTimeout(snapTimeoutRef.current);
        snapTimeoutRef.current = null;
      }
    };

    const scheduleSnapToNearest = () => {
      clearSnapTimeout();

      snapTimeoutRef.current = window.setTimeout(() => {
        if (isAutoSnappingRef.current) return;

        const containerTop = containerRef.current?.offsetTop ?? 0;
        const relativeScroll = window.scrollY - containerTop;
        const maxScroll = (SECTIONS.length - 1) * window.innerHeight;
        const clampedScroll = Math.max(0, Math.min(relativeScroll, maxScroll));
        const nearestSection = Math.round(clampedScroll / window.innerHeight);

        scrollToSection(nearestSection);
      }, 140);
    };

    const handleScroll = () => {
      if (!isAutoSnappingRef.current) {
        scheduleSnapToNearest();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 10 || isAutoSnappingRef.current || wheelLockRef.current) {
        return;
      }

      event.preventDefault();
      wheelLockRef.current = true;

      const direction = event.deltaY > 0 ? 1 : -1;
      scrollToSection(activeSectionRef.current + direction);

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 700);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      clearSnapTimeout();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [scrollToSection]);

  return (
    <div ref={containerRef} className="landing-page relative h-[600vh] bg-[#050505] text-white">
      {/* Fixed Background Grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="fixed inset-0 vertical-divider pointer-events-none" />

      {/* Fixed UI Frame */}
      <Header onMintClick={() => router.push("/mint")} />

      <Footer />
      <Sidebar activeIndex={activeSection} />

      {/* Content Layer */}
      <div className="fixed inset-0 flex items-center px-8 pt-6 md:px-14 lg:px-20 xl:px-24 pointer-events-none">
        {activeSection === 5 ? (
          <div className="mx-auto flex h-full w-full max-w-7xl flex-col items-center justify-start pt-16 md:pt-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex w-full flex-1 flex-col items-center"
              >
                <h1 className="mb-10 text-center font-serif text-3xl leading-[1.1] tracking-tight text-brand-orange md:text-[50px]">
                  FAQs
                </h1>
                <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-16">
                  <div className="w-full self-start">
                    <FAQAccordion items={FAQ_DATA.slice(0, 5)} />
                  </div>
                  <div className="w-full self-start">
                    <FAQAccordion items={FAQ_DATA.slice(5)} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14 xl:gap-16">
            
            {/* Left Column: Text Content */}
            <div className="z-10 flex h-full w-full items-center">
              <div className="w-full max-w-[460px]">
              <div className="flex h-[120px] flex-col justify-end pb-2 transition-all duration-500 md:h-[170px]">
                <h1 className="mb-0 font-serif text-3xl leading-[1.1] tracking-tight text-white transition-all duration-500 md:text-[50px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSection}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                      <span className="text-white block">{SECTIONS[activeSection].prefix}</span>
                      <span className="italic font-normal text-brand-orange block">
                        {SECTIONS[activeSection].suffix}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </h1>
              </div>
              
              <div className="mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {SECTIONS[activeSection].subheading && (
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mb-6 font-serif text-xl leading-snug text-gray-400 md:text-xl"
                      >
                        {SECTIONS[activeSection].subheading}
                      </motion.h2>
                    )}

                    <>
                      <p className="max-w-[384px] font-sans text-sm leading-relaxed text-gray-500 md:text-sm">
                        {SECTIONS[activeSection].description}
                      </p>
                      
                      {activeSection === 0 && (
                        <div className="mt-8 flex gap-8">
                          {(heroStats.map((stat) =>
                            stat.label === "TVL" && stat.value === "--" && parsedVault?.assetTotalValue
                              ? { ...stat, value: `$${parsedVault.assetTotalValue}` }
                              : stat
                          )).map((stat, i) => (
                            <div key={i} className="flex flex-col">
                              <span className="text-[9px] font-mono text-gray-600 tracking-widest uppercase">
                                {stat.label}
                              </span>
                              <span className="text-white font-serif text-xl mt-1">
                                {stat.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  </motion.div>
                </AnimatePresence>
              </div>
              </div>
            </div>

            {/* Right Column: Dynamic Graphics */}
            <div className="relative flex h-full w-full items-center justify-center transition-all duration-500">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.7, ease: "circOut" }}
                  className="flex h-full w-full items-center justify-center"
                >
                  <GraphicRenderer type={SECTIONS[activeSection].graphic} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Spacers */}
      {SECTIONS.map((_, i) => (
        <div key={i} className="h-screen" />
      ))}
    </div>
  );
}

function Header({ onMintClick }: { onMintClick: () => void }) {
  return (
    <header className="fixed top-0 left-0 w-full pt-4 px-10 flex justify-between items-center z-50">
      <div className="flex items-center">
        <div className="h-14 w-auto aspect-[1024/672]">
          <K1Logo className="w-full h-full text-brand-orange" />
        </div>
      </div>
      <div className="flex items-center gap-8">
        <button 
          onClick={onMintClick}
          className="bg-brand-orange text-black px-6 py-2.5 font-mono text-[10px] font-bold tracking-[0.1em] hover:bg-white transition-colors"
        >
          MINT K1
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 w-full p-8 flex justify-center items-center z-50">
      <div className="flex items-center gap-10">
        <a href="#" className="text-gray-600 hover:text-white transition-colors">
          <Twitter className="w-5 h-5" />
        </a>
        <a href="#" className="text-gray-600 hover:text-white transition-colors">
          <BookOpen className="w-5 h-5" />
        </a>
      </div>
    </footer>
  );
}

function Sidebar({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-50">
      {SECTIONS.map((_, i) => (
        <div
          key={i}
          className={`w-1 h-1 rounded-full transition-all duration-300 ${
            i === activeIndex ? "bg-brand-orange scale-[1.8]" : "bg-gray-800"
          }`}
        />
      ))}
    </div>
  );
}

function YieldComparisonAnimation() {
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setShowChart(prev => !prev);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const chartData = [
    { time: 0, value: 1.00 },
    { time: 1, value: 1.15 },
    { time: 2, value: 1.35 },
    { time: 3, value: 1.60 },
    { time: 4, value: 1.55 },
    { time: 5, value: 1.90 },
    { time: 6, value: 2.20 },
    { time: 7, value: 2.10 },
    { time: 8, value: 2.60 },
    { time: 9, value: 3.20 },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <AnimatePresence mode="wait">
        {!showChart ? (
          <motion.div
            key="comparison"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full max-w-md space-y-12"
          >
            <div className="space-y-8">
              <YieldBar label="T-BILLS" value="3%" width="25%" />
              <YieldBar label="DELTA NEUTRAL" value="6%" width="50%" />
              <YieldBar label="K1 ENERGY" value="12%" width="100%" isK1 />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full h-64 flex flex-col"
          >
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorK1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fe5500" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fe5500" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#fe5500" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorK1)" 
                  isAnimationActive={true}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="text-center mt-6 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              K1 Value Appreciation (Projected)
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function YieldBar({ label, value, width, isK1 = false }: { label: string, value: string, width: string, isK1?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className={`text-[10px] font-extrabold tracking-[0.2em] ${isK1 ? 'text-brand-orange' : 'text-gray-600'}`}>
          {label}
        </span>
        <span className={`text-2xl font-serif ${isK1 ? 'text-brand-orange' : 'text-gray-400'}`}>
          {value}
        </span>
      </div>
      <div className="h-[1px] w-full bg-gray-900 relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={`absolute top-0 left-0 h-full ${isK1 ? 'bg-brand-orange h-[2px]' : 'bg-gray-500'}`}
        />
      </div>
    </div>
  );
}

function EnergyReservoirAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient Glow - Background layer */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Inflowing Particles - Middle layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => {
          const angle = (i / 30) * Math.PI * 2;
          const radius = 300; // Slightly smaller radius to ensure they start visible
          const startX = Math.cos(angle) * radius;
          const startY = Math.sin(angle) * radius;
          
          return (
            <motion.div
              key={`particle-${i}`}
              initial={{ x: startX, y: startY, opacity: 0, scale: 0 }}
              animate={{ 
                x: 0, 
                y: 0, 
                opacity: [0, 1, 0],
                scale: [0.2, 1.2, 0.2]
              }}
              transition={{ 
                duration: 2.5 + Math.random() * 2, 
                repeat: Infinity, 
                delay: Math.random() * 5,
                ease: "circIn"
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-orange rounded-full shadow-[0_0_10px_#fe5500]"
            />
          );
        })}
      </div>

      {/* Central Core & Shockwaves - Top layer */}
      <div className="relative flex items-center justify-center">
        {/* Shockwaves */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`shockwave-${i}`}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 4, opacity: [0, 0.6, 0] }}
            transition={{ 
              duration: 3.5, 
              repeat: Infinity, 
              delay: i * 1.1,
              ease: "easeOut"
            }}
            className="absolute w-32 h-32 rounded-full border-2 border-brand-orange/40 pointer-events-none"
          />
        ))}

        {/* Core */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            boxShadow: [
              "0 0 30px rgba(254, 85, 0, 0.3)",
              "0 0 80px rgba(254, 85, 0, 0.7)",
              "0 0 30px rgba(254, 85, 0, 0.3)"
            ]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-brand-orange/20 border-2 border-brand-orange/50 flex items-center justify-center relative z-20"
        >
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-brand-orange/30 blur-2xl absolute" />
          <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-brand-orange shadow-[0_0_40px_#fe5500] relative z-10" />
          <Zap className="w-6 h-6 md:w-10 md:h-10 text-black relative z-20" />
        </motion.div>
      </div>
    </div>
  );
}

function AbundanceEconomyAnimation() {
  const nodes = [
    { id: 0, type: 'investor', icon: TrendingUp, label: 'Investor' },
    { id: 1, type: 'dao', icon: Users, label: 'DAO' },
    { id: 2, type: 'agent', icon: Brain, label: 'Agent' },
    { id: 3, type: 'robot', icon: Bot, label: 'Robot' },
    { id: 4, type: 'defi', icon: ShieldCheck, label: 'DeFi' },
    { id: 5, type: 'energy', icon: Zap, label: 'Energy' },
  ];

  const transactions = [
    { from: 0, to: 4, delay: 0 },    // Investor -> DeFi
    { from: 4, to: 0, delay: 3 },    // DeFi -> Investor (Yield)
    { from: 1, to: 2, delay: 1 },    // DAO -> Agent
    { from: 2, to: 5, delay: 4 },    // Agent -> Energy
    { from: 3, to: 5, delay: 2 },    // Robot -> Energy (Charging)
    { from: 5, to: 3, delay: 5 },    // Energy -> Robot (Power)
    { from: 2, to: 3, delay: 1.5 },  // Agent -> Robot (Task)
    { from: 0, to: 5, delay: 6 },    // Investor -> Energy (Infrastructure)
  ];

  const radius = 160;
  const angleStep = 360 / nodes.length;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width="500" height="500" viewBox="-250 -250 500 500" className="overflow-visible">
        {/* Background Network Web */}
        <g opacity="0.03">
          {nodes.map((node, i) => (
            nodes.slice(i + 1).map((other, j) => (
              <line
                key={`web-${i}-${j}`}
                x1={Math.cos((i * angleStep) * Math.PI / 180) * radius}
                y1={Math.sin((i * angleStep) * Math.PI / 180) * radius}
                x2={Math.cos(((i + j + 1) * angleStep) * Math.PI / 180) * radius}
                y2={Math.sin(((i + j + 1) * angleStep) * Math.PI / 180) * radius}
                stroke="#fe5500"
                strokeWidth="0.5"
              />
            ))
          ))}
        </g>

        {/* Transaction Flows */}
        {transactions.map((tx, i) => {
          const fromRad = (tx.from * angleStep) * Math.PI / 180;
          const toRad = (tx.to * angleStep) * Math.PI / 180;
          const x1 = Math.cos(fromRad) * radius;
          const y1 = Math.sin(fromRad) * radius;
          const x2 = Math.cos(toRad) * radius;
          const y2 = Math.sin(toRad) * radius;
          
          return (
            <g key={`tx-${i}`}>
              <motion.path
                d={`M ${x1} ${y1} Q 0 0 ${x2} ${y2}`}
                fill="none"
                stroke="rgba(254, 85, 0, 0.08)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {/* K1 Value Particle */}
              <motion.circle
                r="2.5"
                fill="#fe5500"
                animate={{
                  offsetDistance: ["0%", "100%"]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: tx.delay,
                  ease: "easeInOut",
                  repeatDelay: 3
                }}
                style={{ 
                  offsetPath: `path('M ${x1} ${y1} Q 0 0 ${x2} ${y2}')`,
                  filter: "drop-shadow(0 0 4px #fe5500)"
                }}
              />
            </g>
          );
        })}

        {/* Participant Nodes */}
        {nodes.map((node, i) => {
          const rad = (i * angleStep) * Math.PI / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const Icon = node.icon;
          
          return (
            <motion.g key={`node-${i}`} transform={`translate(${x}, ${y})`}>
              <motion.circle
                r="28"
                fill="rgba(254, 85, 0, 0.05)"
                stroke="rgba(254, 85, 0, 0.2)"
                strokeWidth="1"
                animate={{
                  borderColor: ["rgba(254, 85, 0, 0.2)", "rgba(254, 85, 0, 0.5)", "rgba(254, 85, 0, 0.2)"]
                }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
              />
              <foreignObject x="-10" y="-10" width="20" height="20">
                <Icon className="w-full h-full text-brand-orange opacity-70" />
              </foreignObject>
              <text
                y="42"
                textAnchor="middle"
                className="fill-gray-600 text-[8px] font-mono uppercase tracking-widest"
              >
                {node.label}
              </text>
              
              {/* Activity Pulse */}
              <motion.circle
                r="28"
                fill="transparent"
                stroke="#fe5500"
                strokeWidth="1"
                animate={{
                  scale: [1, 1.3],
                  opacity: [0.3, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeOut"
                }}
              />
            </motion.g>
          );
        })}

        {/* Central K1 Core */}
        <g>
          <motion.circle
            r="45"
            fill="rgba(254, 85, 0, 0.1)"
            stroke="#fe5500"
            strokeWidth="2"
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: ["0 0 20px rgba(254, 85, 0, 0.2)", "0 0 50px rgba(254, 85, 0, 0.5)", "0 0 20px rgba(254, 85, 0, 0.2)"]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <foreignObject x="-20" y="-20" width="40" height="40">
            <K1Logo className="w-full h-full text-brand-orange" />
          </foreignObject>
          
          {/* Radiating Settlement Waves */}
          {[...Array(2)].map((_, i) => (
            <motion.circle
              key={`wave-${i}`}
              r="45"
              fill="transparent"
              stroke="#fe5500"
              strokeWidth="1"
              animate={{
                scale: [1, 2],
                opacity: [0.4, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "easeOut"
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function ProductiveGridAnimation() {
  const centerNode = { x: 0, y: 0, type: 'k1' };
  const cornerNodes = [
    { angle: -150, type: 'solar', label: 'Solar' },
    { angle: -90, type: 'wind', label: 'Wind' },
    { angle: -30, type: 'nuclear', label: 'Nuclear' },
    { angle: 30, type: 'hydrogen', label: 'Hydrogen' },
    { angle: 90, type: 'oil', label: 'Oil' },
    { angle: 150, type: 'grid', label: 'Grid' },
  ];

  const radius = 140;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg width="450" height="450" viewBox="-225 -225 450 450" className="overflow-visible">
        {/* Connections and Pulses */}
        {cornerNodes.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const targetX = Math.cos(rad) * radius;
          const targetY = Math.sin(rad) * radius;
          
          return (
            <g key={`conn-${i}`}>
              <line
                x1={centerNode.x} y1={centerNode.y}
                x2={targetX} y2={targetY}
                stroke="rgba(254, 85, 0, 0.15)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              {/* Continuous Rhythmic Pulses from Center to Corners */}
              {[...Array(3)].map((_, j) => (
                <motion.circle
                  key={`pulse-${i}-${j}`}
                  r="3"
                  fill="#fe5500"
                  initial={{ opacity: 0 }}
                  animate={{
                    cx: [centerNode.x, targetX],
                    cy: [centerNode.y, targetY],
                    opacity: [0, 1, 1, 0],
                    scale: [0.5, 1.2, 1, 0.8]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: j * 1 + i * 0.2,
                    ease: "linear"
                  }}
                  style={{ filter: "drop-shadow(0 0 5px #fe5500)" }}
                />
              ))}
            </g>
          );
        })}

        {/* Corner Nodes */}
        {cornerNodes.map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const targetX = Math.cos(rad) * radius;
          const targetY = Math.sin(rad) * radius;

          return (
            <motion.g key={`node-${i}`} transform={`translate(${targetX}, ${targetY})`}>
              <motion.circle
                r="24"
                fill="rgba(254, 85, 0, 0.05)"
                stroke="rgba(254, 85, 0, 0.3)"
                strokeWidth="1"
                animate={{
                  scale: [1, 1.05, 1],
                  borderColor: ["rgba(254, 85, 0, 0.3)", "rgba(254, 85, 0, 0.6)", "rgba(254, 85, 0, 0.3)"]
                }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              />
              
              <g className="opacity-80">
                {node.type === 'solar' && <Sun className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
                {node.type === 'wind' && <Wind className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
                {node.type === 'nuclear' && <Atom className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
                {node.type === 'hydrogen' && <Droplet className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
                {node.type === 'oil' && <Fuel className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
                {node.type === 'grid' && <Grid3X3 className="w-6 h-6 -translate-x-3 -translate-y-3 text-brand-orange" />}
              </g>

              <text
                y="40"
                textAnchor="middle"
                className="fill-gray-500 text-[10px] font-mono uppercase tracking-widest"
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}

        {/* Center K1 Node */}
        <motion.g transform={`translate(${centerNode.x}, ${centerNode.y})`}>
          <motion.circle
            r="40"
            fill="rgba(254, 85, 0, 0.1)"
            stroke="#fe5500"
            strokeWidth="2"
            animate={{
              boxShadow: ["0 0 20px rgba(254, 85, 0, 0.2)", "0 0 50px rgba(254, 85, 0, 0.5)", "0 0 20px rgba(254, 85, 0, 0.2)"],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <foreignObject x="-20" y="-20" width="40" height="40">
            <K1Logo className="w-full h-full text-brand-orange" />
          </foreignObject>
          
          {/* Central Pulse Ring */}
          <motion.circle
            r="40"
            fill="transparent"
            stroke="#fe5500"
            strokeWidth="1"
            animate={{
              scale: [1, 1.5],
              opacity: [0.5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        </motion.g>
      </svg>
    </div>
  );
}

function FiatVsK1Animation() {
  return (
    <div className="w-full h-full flex items-center justify-center gap-12 md:gap-24 px-8">
      {/* Fiat Container */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-48 md:w-32 md:h-64 border-2 border-gray-800 rounded-xl bg-gray-900/30">
          {/* Level Wrapper (Overflow Hidden) */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            {/* Label */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <span className="text-gray-700 font-serif text-lg md:text-xl opacity-40 uppercase tracking-widest">Fiat</span>
            </div>
            
            {/* Leaking Level - Very slow cycle, jump back to start */}
            <motion.div 
              animate={{ height: ["50%", "10%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-0 left-0 w-full bg-gray-800/80"
            />
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-600 tracking-widest uppercase">Dilution</span>
      </div>

      {/* K1 Container */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-48 md:w-32 md:h-64 border-2 border-brand-orange/30 rounded-xl bg-brand-orange/5 shadow-[0_0_30px_rgba(254,85,0,0.05)]">
          {/* Level Wrapper (Overflow Hidden) */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            {/* Logo */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none p-6">
              <K1Logo className="w-full h-full text-brand-orange opacity-20" />
            </div>

            {/* Rising Level - Very slow cycle, jump back to start */}
            <motion.div 
              animate={{ height: ["50%", "90%"] }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-0 left-0 w-full bg-brand-orange/20"
            />
          </div>
        </div>
        <span className="text-[10px] font-mono text-brand-orange tracking-widest uppercase">Growth</span>
      </div>
    </div>
  );
}

function GraphicRenderer({ type }: { type: string }) {
  switch (type) {
    case "sphere":
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* The K1 Portal Engine */}
          <div className="relative z-20 w-40 h-40 md:w-56 md:h-56 flex items-center justify-center">
            <motion.div
              animate={{ 
                boxShadow: ["0 0 20px #fe5500", "0 0 60px #fe5500", "0 0 20px #fe5500"],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border-2 border-brand-orange/40 flex items-center justify-center"
            >
              <div className="w-[90%] h-[90%] rounded-full border border-brand-orange/10" />
              {/* Inner pulsing core */}
              <motion.div 
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-brand-orange/10 rounded-full blur-xl"
              />
            </motion.div>
            <div className="w-24 h-24 md:w-32 md:h-32 z-30 flex items-center justify-center">
              <K1Logo className="w-full h-full text-brand-orange drop-shadow-[0_0_15px_#fe5500]" />
            </div>
          </div>

          {/* Stage 1: $ -> Portal -> Energy (Investment Flow) */}
          <motion.div
            animate={{ 
              x: [-400, 0, 0, 400],
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1, 1, 1.2],
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              times: [0, 0.3, 0.7, 1],
              ease: "easeInOut",
              repeatDelay: 2
            }}
            className="absolute z-10"
          >
            <div className="relative flex items-center justify-center">
              {/* USDC Token (Visible during first half) */}
              <motion.div
                animate={{ 
                  opacity: [1, 1, 0, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.48, 0.52, 1], repeatDelay: 2 }}
                className="w-14 h-14 md:w-16 md:h-16 bg-blue-500/20 border-2 border-blue-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(96,165,250,0.6)]"
              >
                <span className="text-blue-400 font-bold text-2xl">$</span>
              </motion.div>

              {/* Energy/Zap (Visible during second half) */}
              <motion.div
                animate={{ 
                  opacity: [0, 0, 1, 1],
                }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.48, 0.52, 1], repeatDelay: 2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Zap className="w-12 h-12 md:w-16 md:h-16 text-brand-orange fill-brand-orange drop-shadow-[0_0_15px_#fe5500]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Stage 2: Energy -> Portal -> $ (Yield Flow) */}
          <motion.div
            animate={{ 
              x: [400, 0, 0, -400],
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1, 1, 1.2],
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              times: [0, 0.3, 0.7, 1],
              ease: "easeInOut",
              delay: 4, // Starts after the first flow is well underway
              repeatDelay: 2
            }}
            className="absolute z-10"
          >
            <div className="relative flex items-center justify-center">
              {/* Energy/Zap (Visible during first half of return) */}
              <motion.div
                animate={{ 
                  opacity: [1, 1, 0, 0],
                }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.48, 0.52, 1], delay: 4, repeatDelay: 2 }}
                className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center"
              >
                <Zap className="w-full h-full text-brand-orange fill-brand-orange drop-shadow-[0_0_15px_#fe5500]" />
              </motion.div>

              {/* USDC Token (Visible during second half of return) */}
              <motion.div
                animate={{ 
                  opacity: [0, 0, 1, 1],
                }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.48, 0.52, 1], delay: 4, repeatDelay: 2 }}
                className="absolute inset-0 w-14 h-14 md:w-16 md:h-16 bg-blue-500/20 border-2 border-blue-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(96,165,250,0.6)]"
              >
                <span className="text-blue-400 font-bold text-2xl">$</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Particle Effects */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  opacity: [0, 0.5, 0],
                  scale: [0, 1.5],
                  x: [0, (i % 2 === 0 ? 100 : -100)],
                  y: [0, (i < 3 ? 100 : -100)]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute top-1/2 left-1/2 w-1 h-1 bg-brand-orange rounded-full"
              />
            ))}
          </div>
        </div>
      );
    case "battery":
      return <FiatVsK1Animation />;
    case "grid":
      return (
        <div className="grid grid-cols-4 gap-4 p-8">
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="w-12 h-12 md:w-16 md:h-16 border border-brand-orange/20 flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-brand-orange/40" />
            </motion.div>
          ))}
        </div>
      );
    case "chart":
      return <YieldComparisonAnimation />;
    case "geometric":
      return <ProductiveGridAnimation />;
    case "abundance":
      return <AbundanceEconomyAnimation />;
    case "faq":
      return (
        <div className="relative w-full h-full pointer-events-auto transition-all duration-500">
          <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-4 p-12">
              {[...Array(64)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.05 }}
                  className="w-1 h-1 bg-brand-orange rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
