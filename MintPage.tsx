import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, TrendingUp, Activity, Clock } from "lucide-react";
import { K1Logo } from "./K1Logo";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface MintPageProps {
  onClose: () => void;
}

export default function MintPage({ onClose }: MintPageProps) {
  const [activeTab, setActiveTab] = useState<"MINT" | "REDEEM" | "CLAIM">("MINT");
  const [mintAmount, setMintAmount] = useState("");
  
  // Mock data - to be connected to real functions later
  const data = {
    k1Balance: "2,480.00",
    usdcBalance: "12,500.42",
    tvl: "$142,804,912.00",
    managerFees: "0.02% / Epoch",
    claimableAccrual: "12.450",
    nextEpoch: "04:12:44",
    apy: "14.2%",
    lastClaim: "2024.11.02",
    lifetimeYield: "412.04 K1",
    points: "84,230",
    vaultTreasuryWallets: [
      "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      "0xAA7656EC7ab88b098defB751B7401B5f6d8976F",
      "0xBB7656EC7ab88b098defB751B7401B5f6d8976F"
    ],
    reserveAllocation: {
      liquid: 65,
      collateral: 25,
      reserve: 10
    },
    chartData: [
      { time: "Mar 01", price: 1.210, apy: 12.4 },
      { time: "Mar 05", price: 1.240, apy: 12.8 },
      { time: "Mar 10", price: 1.225, apy: 13.1 },
      { time: "Mar 15", price: 1.280, apy: 13.5 },
      { time: "Mar 20", price: 1.265, apy: 13.8 },
      { time: "Mar 25", price: 1.295, apy: 14.1 },
      { time: "Mar 30", price: 1.286, apy: 14.2 },
    ]
  };

  const [chartTab, setChartTab] = useState<"PRICE" | "APY">("PRICE");
  const [timeRange, setTimeRange] = useState("30D");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black overflow-y-auto font-mono text-white selection:bg-brand-orange selection:text-black"
    >
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative max-w-6xl mx-auto pt-2 pb-12 px-6 md:pt-4 md:pb-24 md:px-12">
        {/* Close Button Header */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={onClose}
            className="p-2 hover:text-brand-orange transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Section 1: Intro Header */}
        <div className="mb-6 -ml-2 md:-ml-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16">
              <K1Logo className="w-full h-full text-brand-orange" />
            </div>
          </div>
        </div>

        {/* Top Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="border border-gray-900 p-6 bg-gray-950/30 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
            <h3 className="text-[10px] text-gray-600 tracking-widest uppercase mb-4 font-sans font-extrabold">Total Value Locked</h3>
            <div className="text-2xl font-serif">{data.tvl}</div>
          </div>
          <div className="border border-gray-900 p-6 bg-gray-950/30 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
            <h3 className="text-[10px] text-gray-600 tracking-widest uppercase mb-4 font-sans font-extrabold">APY</h3>
            <div className="text-2xl font-serif text-green-500">{data.apy}</div>
          </div>
          <div className="border border-gray-900 p-6 bg-gray-950/30 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
            <h3 className="text-[10px] text-gray-600 tracking-widest uppercase mb-4 font-sans font-extrabold">K1 Balance</h3>
            <div className="text-2xl font-serif">{data.k1Balance}</div>
          </div>
          <div className="border border-gray-900 p-6 bg-gray-950/30 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
            <h3 className="text-[10px] text-gray-600 tracking-widest uppercase mb-4 font-sans font-extrabold">Points</h3>
            <div className="text-2xl font-serif text-brand-orange">{data.points}</div>
          </div>
        </div>

        {/* Main Interaction Section */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8 mb-8">
          {/* Chart Box */}
          <div className="lg:col-span-4 border border-gray-900 bg-gray-950/20 relative p-8">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-gray-600" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-600" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-600" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-600" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-xl font-serif mb-1">Market Overview</h2>
                <div className="flex gap-6 mt-4">
                  <button 
                    onClick={() => setChartTab("PRICE")}
                    className={`flex items-center gap-2 transition-colors ${chartTab === "PRICE" ? "text-brand-orange" : "text-gray-600 hover:text-white"}`}
                  >
                    <TrendingUp size={14} />
                  </button>
                  <button 
                    onClick={() => setChartTab("APY")}
                    className={`flex items-center gap-2 transition-colors ${chartTab === "APY" ? "text-brand-orange" : "text-gray-600 hover:text-white"}`}
                  >
                    <Activity size={14} />
                    <span className="text-green-500 text-[10px] tracking-[0.2em] font-sans font-extrabold">{data.apy}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 bg-gray-900/50 p-1 border border-gray-800">
                {["24H", "7D", "30D"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-[8px] tracking-widest uppercase transition-all ${
                      timeRange === range ? "bg-gray-800 text-white" : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fe5500" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fe5500" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#4b5563', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    hide={false} 
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#4b5563', fontSize: 10 }}
                    domain={chartTab === "PRICE" ? [1.2, 1.35] : [12, 15]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050505', border: '1px solid #1a1a1a', fontSize: '10px' }}
                    itemStyle={{ color: '#fe5500' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartTab === "PRICE" ? "price" : "apy"} 
                    stroke="#fe5500" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Interaction Box */}
          <div className="lg:col-span-3">
            <div className="flex gap-8 border-b border-gray-900 mb-8">
              {["MINT", "REDEEM", "CLAIM"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`pb-4 text-[10px] tracking-[0.2em] transition-all relative font-sans font-extrabold ${
                    activeTab === tab ? "text-brand-orange" : "text-gray-600 hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-orange" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="border border-gray-900 p-8 relative bg-gray-950/10">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-gray-600" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-gray-600" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-gray-600" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-gray-600" />

              <AnimatePresence mode="wait">
                {activeTab === "CLAIM" ? (
                  <motion.div
                    key="claim"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-[11px] text-gray-500 tracking-widest uppercase font-sans font-extrabold">Yield Distribution</h3>
                    </div>
                    
                    <div className="bg-brand-orange/5 border border-brand-orange/10 p-8 text-center mb-8">
                      <div className="text-[10px] text-gray-600 uppercase mb-4 font-sans font-extrabold">Claimable Accrual</div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-5xl font-serif">{data.claimableAccrual}</span>
                        <div className="w-8 h-8 flex items-center justify-center">
                          <K1Logo className="w-full h-full text-brand-orange" />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-600 mt-4 font-sans font-extrabold">≈ $12.45 USD</div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">Next Epoch</div>
                        <div className="text-sm">{data.nextEpoch}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">APY</div>
                        <div className="text-sm text-green-500">{data.apy}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">Last Claim</div>
                        <div className="text-[10px] text-gray-400">{data.lastClaim}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">Lifetime</div>
                        <div className="text-[10px] text-gray-400">{data.lifetimeYield}</div>
                      </div>
                    </div>

                    <button className="w-full bg-brand-orange text-black font-bold py-6 tracking-[0.2em] text-xs hover:bg-white transition-all uppercase">
                      Claim Yield
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mint-redeem"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-[11px] text-gray-500 tracking-widest uppercase font-sans font-extrabold">{activeTab} Amount</h3>
                      <span className="text-[11px] text-brand-orange tracking-widest font-bold">Price : $1.000 / K1</span>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gray-950 border border-gray-900 p-6 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">Pay</span>
                          <input 
                            type="text" 
                            value={mintAmount}
                            onChange={(e) => setMintAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-2xl font-serif outline-none w-full"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <button className="text-[10px] border border-gray-800 px-2 py-1 hover:border-brand-orange transition-colors font-sans font-extrabold">MAX</button>
                          <span className="text-lg">{activeTab === "MINT" ? "USDC" : "K1"}</span>
                        </div>
                      </div>

                      <div className="bg-gray-950/50 border border-dashed border-gray-900 p-6 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-600 uppercase mb-2 font-sans font-extrabold">Receive (Estimated)</span>
                          <div className="text-2xl font-serif text-gray-400">{mintAmount || "0.00"}</div>
                        </div>
                        <span className="text-lg text-gray-400">{activeTab === "MINT" ? "K1" : "USDC"}</span>
                      </div>
                    </div>

                    <button className="w-full bg-brand-orange text-black font-bold py-6 mt-12 tracking-[0.2em] text-xs hover:bg-white transition-all uppercase">
                      Initiate {activeTab === "MINT" ? "Minting" : "Redemption"} Process
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Section: Allocation and Additional Info */}
        <div className="space-y-12">
          {/* Reserve Allocation */}
          <div className="border border-gray-900 p-8">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-[11px] tracking-[0.2em] text-gray-500 uppercase font-sans font-extrabold">Vault Reserve Allocation</h2>
              <div className="flex gap-6 text-[10px] tracking-widest uppercase font-sans font-extrabold">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-orange" />
                  <span>Liquid ({data.reserveAllocation.liquid}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600" />
                  <span>Collateral ({data.reserveAllocation.collateral}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-800" />
                  <span>Reserve ({data.reserveAllocation.reserve}%)</span>
                </div>
              </div>
            </div>
            <div className="h-4 w-full bg-gray-900 flex">
              <div style={{ width: `${data.reserveAllocation.liquid}%` }} className="h-full bg-brand-orange" />
              <div style={{ width: `${data.reserveAllocation.collateral}%` }} className="h-full bg-gray-600" />
              <div style={{ width: `${data.reserveAllocation.reserve}%` }} className="h-full bg-gray-800" />
            </div>
          </div>

          {/* Bottom Metrics: Manager Fees and Wallets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-900 p-8 bg-gray-950/30 relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
              <h3 className="text-[11px] text-gray-600 tracking-widest uppercase mb-6 font-sans font-extrabold">Manager Fees</h3>
              <div className="text-2xl text-brand-orange font-serif">{data.managerFees}</div>
              <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-sans font-extrabold">Accrued per epoch based on TVL</p>
            </div>

            <div className="border border-gray-900 p-8 bg-gray-950/30 relative">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700" />
              <h3 className="text-[11px] text-gray-600 tracking-widest uppercase mb-6 font-sans font-extrabold">Vault Treasury Wallets</h3>
              <div className="space-y-3">
                {data.vaultTreasuryWallets.map((wallet, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <span className="text-[10px] text-gray-400 font-mono font-extrabold">{wallet}</span>
                    <button className="text-[10px] text-gray-600 hover:text-brand-orange transition-colors uppercase tracking-widest font-sans font-extrabold">Copy</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
