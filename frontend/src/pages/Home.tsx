import { useState } from "react";
import { useAuctionCount, useAuction } from "../hooks/useSealBid";
import { AuctionCard } from "../components/AuctionCard";
import { CreateAuctionModal } from "../components/CreateAuctionModal";
import { CustomConnectButton } from "../components/CustomConnectButton";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheckIcon, CubeTransparentIcon, ChartBarIcon, LockClosedIcon, DocumentChartBarIcon, PresentationChartLineIcon, BoltIcon } from "@heroicons/react/24/outline";

function SingleAuction({ auctionId }: { auctionId: bigint }) {
  const { data, isLoading } = useAuction(auctionId);
  if (isLoading) {
    return <div className="h-48 rounded-xl glass-panel animate-pulse opacity-50" />;
  }
  if (!data) return null;
  const auction = data; // useAuction already formats it to AuctionData

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
    >
      <AuctionCard auction={auction} />
    </motion.div>
  );
}

function AuctionList({ count }: { count: bigint }) {
  const ids = Array.from(
    { length: Number(count) },
    (_, i) => BigInt(count) - BigInt(i),
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {ids.map((id) => (
        <SingleAuction key={id.toString()} auctionId={id} />
      ))}
    </div>
  );
}

export function Home() {
  const { data: auctionCount, isLoading } = useAuctionCount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-[#00ff66] selection:text-black">
      <div className="scene-wrap fixed inset-0 pointer-events-none -z-10">
        <div className="aurora-orb aurora-orb-a" />
        <div className="aurora-orb aurora-orb-b" />
        <div className="perspective-grid" />
      </div>

      {/* Modern Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-panel border-b border-white/5 h-16 flex items-center px-6">
        <div className="max-w-7xl w-full mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LockClosedIcon className="w-6 h-6 text-[#00ff66]" />
            <span className="font-bold text-white tracking-widest uppercase title-glow hidden sm:block">SealBid</span>
          </div>
          <div className="flex items-center gap-4">
             <CustomConnectButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.header 
        style={{ y: heroY, opacity: heroOpacity }}
        className="pt-40 pb-20 px-4 sm:px-6 relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center space-y-8 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00ff66]/30 bg-[#00ff66]/10 text-[#00ff66] text-xs font-mono tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,255,102,0.2)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
            Zero-Knowledge Infrastructure
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl font-bold text-white tracking-tighter title-glow leading-[1.1]"
          >
            Confidential Markets <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff66] to-[#00d4ff]">
              Fully Homomorphic
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg text-gray-400 font-mono mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Eliminate front-running and bid-sniping. SealBid leverages Fully Homomorphic Encryption (FHE) to guarantee cryptographic privacy for all auction participants before, during, and after execution.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-mono font-bold text-black bg-[#00ff66] rounded hover:bg-[#00d4ff] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all duration-300 w-full sm:w-auto overflow-hidden"
            >
              <span className="relative flex items-center gap-2 uppercase tracking-wider text-sm">
                Deploy Auction System
                <BoltIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </span>
            </button>
            <a href="#markets" className="px-8 py-4 font-mono font-bold text-white glass-panel border border-white/10 rounded hover:bg-white/10 transition-all duration-300 w-full sm:w-auto text-sm uppercase tracking-wider text-center">
              View Analytics Feed
            </a>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <main className="relative z-10 space-y-32 pb-32">
        {/* Core Features Grid */}
        <section className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="glass-panel p-8 rounded-xl border border-white/5 hover:border-[#00ff66]/30 transition-colors group"
              >
                <div className="w-12 h-12 bg-[#00ff66]/10 rounded-lg flex items-center justify-center mb-6 border border-[#00ff66]/20 group-hover:scale-110 transition-transform">
                  <LockClosedIcon className="w-6 h-6 text-[#00ff66]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Absolute Privacy</h3>
                <p className="text-gray-400 font-mono text-sm leading-relaxed">
                  Bids are encrypted locally. The highest value is calculated entirely on encrypted data inside the contract structure. Identifiable information remains permanently severed.
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1 }}
                className="glass-panel p-8 rounded-xl border border-white/5 hover:border-[#00d4ff]/30 transition-colors group"
              >
                <div className="w-12 h-12 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center mb-6 border border-[#00d4ff]/20 group-hover:scale-110 transition-transform">
                  <ShieldCheckIcon className="w-6 h-6 text-[#00d4ff]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Trustless Execution</h3>
                <p className="text-gray-400 font-mono text-sm leading-relaxed">
                  No privileged roles. No backdoors. The contract operator has zero insight into user submissions, guaranteeing a symmetric playing field across varying capital sizes.
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.2 }}
                className="glass-panel p-8 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors group"
              >
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <CubeTransparentIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Symmetric Outcomes</h3>
                <p className="text-gray-400 font-mono text-sm leading-relaxed">
                  Upon auction expiration, only the winning value correlates state mutation. All subordinate inputs stay mathematically sealed forever inside network storage.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Global Statistics */}
        <section className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto glass-panel border border-white/5 rounded-2xl relative overflow-hidden">
             <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff66]/50 to-transparent" />
             <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/10">
                <div className="p-8 text-center sm:text-left">
                  <DocumentChartBarIcon className="w-8 h-8 text-gray-500 mb-4 mx-auto sm:mx-0" />
                  <div className="text-3xl font-bold text-white mb-1"><span className="text-[#00ff66]">100</span>%</div>
                  <div className="text-xs uppercase tracking-widest font-mono text-gray-400">On-Chain Encryption</div>
                </div>
                <div className="p-8 text-center sm:text-left">
                  <ChartBarIcon className="w-8 h-8 text-gray-500 mb-4 mx-auto sm:mx-0" />
                  <div className="text-3xl font-bold text-white mb-1">{isLoading ? "--" : (Number(auctionCount || 0))}</div>
                  <div className="text-xs uppercase tracking-widest font-mono text-gray-400">Total Markets</div>
                </div>
                <div className="p-8 text-center sm:text-left">
                  <PresentationChartLineIcon className="w-8 h-8 text-gray-500 mb-4 mx-auto sm:mx-0" />
                  <div className="text-3xl font-bold text-white mb-1"><span className="text-[#00d4ff]">256</span>-bit</div>
                  <div className="text-xs uppercase tracking-widest font-mono text-gray-400">Security Layer</div>
                </div>
                <div className="p-8 text-center sm:text-left flex flex-col items-center sm:items-start justify-center">
                   <div className="px-4 py-2 border border-white/10 rounded-full font-mono text-xs text-white/50 w-full text-center">
                     Powered By tfhe.rs
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Live Markets Section */}
        <section id="markets" className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
              <div>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
                >
                  <span className="w-2 h-8 bg-[#00ff66] rounded-sm" />
                  Network Data Feed
                </motion.h2>
                <p className="text-gray-500 font-mono text-sm mt-2">
                  Transparent history of all completely confidential settlements.
                </p>
              </div>
              <div className="text-sm font-mono text-gray-400 px-4 py-2 rounded-full border border-white/10 bg-white/5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                {isLoading ? "Syncing Blocks..." : `${Number(auctionCount || 0)} Contracts Indexed`}
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded-xl glass-panel animate-pulse opacity-20 border border-white/5" />
                ))}
              </div>
            ) : !auctionCount || auctionCount === 0n ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 glass-panel rounded-2xl border border-white/5 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00ff66]/5" />
                <CubeTransparentIcon className="w-16 h-16 text-gray-700 mx-auto mb-6 relative z-10" />
                <h3 className="text-2xl font-bold text-white mb-2 relative z-10">No Active Contracts</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto relative z-10 font-mono text-sm">
                  The network is currently idle. Deploy a new auction parameters contract to establish the first confidential market.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-[#00ff66] hover:text-[#00d4ff] hover:bg-[#00ff66]/10 px-8 py-3 rounded border border-[#00ff66]/30 font-bold font-mono text-sm uppercase tracking-wider transition-all relative z-10"
                >
                  [ Initialize System ]
                </button>
              </motion.div>
            ) : (
              <AuctionList count={auctionCount as bigint} />
            )}
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-white/5 bg-black relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-gray-600">
          <div>
            &copy; 2024 SealBid Ecosystem
          </div>
          <div className="flex gap-4">
            <span className="hover:text-[#00ff66] transition-colors cursor-pointer">Protocol Logs</span>
            <span className="hover:text-[#00ff66] transition-colors cursor-pointer">Source Transparency</span>
          </div>
        </div>
      </footer>

      <CreateAuctionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
