import { useState } from "react";
import { useCreateAuction } from "../hooks/useSealBid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAuctionModal({ isOpen, onClose }: CreateAuctionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState("24");

  const { create, isPending, error, technicalError } = useCreateAuction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !durationHours) return;

    try {
      const durationSeconds = BigInt(Math.floor(Number(durationHours) * 3600));
      await create(title, description, durationSeconds);
      onClose();
    } catch (err) {
      console.error("Failed to create auction:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel p-8 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff66]/10 rounded-bl-full pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight">Deploy Market</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-500 uppercase mb-2">
                  Market Designation
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#00ff66] focus:border-[#00ff66]"
                  placeholder="e.g. Rare Artifact #42"
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-500 uppercase mb-2">
                  Parameters & Specs
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#00ff66] focus:border-[#00ff66] resize-none"
                  placeholder="Detailed specifications for bidders..."
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-gray-500 uppercase mb-2">
                  Exposure Window (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="block w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#00ff66] focus:border-[#00ff66]"
                />
              </div>

              {technicalError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
                  <span className="font-bold uppercase tracking-wider mb-2 block border-b border-red-500/30 pb-2">RPC Execution Reverted</span>
                  {technicalError}
                </div>
              )}
              {error && !technicalError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 font-mono overflow-x-auto whitespace-pre-wrap">
                  {error.message || String(error)}
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-white/10 text-white font-mono text-sm uppercase tracking-wider rounded hover:bg-white/5 transition-colors"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-3 bg-[#00ff66] text-black font-mono font-bold text-sm uppercase tracking-wider rounded hover:bg-[#00d4ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Deploying..." : "Execute"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
