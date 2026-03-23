import { useNavigate } from 'react-router-dom'
import type { AuctionData } from '../hooks/useSealBid'

interface AuctionCardProps {
  auction: AuctionData
}

function timeLeft(endTime: bigint): string {
  const diff = Number(endTime) - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Ended'
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`
  return `${h}h ${m}m left`
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const navigate = useNavigate()
  const ended = auction.finalized || Number(auction.endTime) < Date.now() / 1000
  const hasWinner = auction.winner !== '0x0000000000000000000000000000000000000000'

  return (
    <button
      onClick={() => navigate(`/auction/${auction.id.toString()}`)}
      className="w-full text-left rounded-xl glass-panel p-6 shadow-sm hover:shadow-lg transition-all border border-white/10 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff66]/5 rounded-bl-full group-hover:scale-110 transition-transform duration-500" />
      
      <div className="flex items-start justify-between gap-4 mb-6 relative">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl text-white truncate mb-2">{auction.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 font-mono">{auction.description}</p>
        </div>
        <span
          className={[
            'shrink-0 rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border',
            hasWinner
              ? 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/30'
              : ended
              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
              : 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30',
          ].join(' ')}
        >
          {hasWinner ? 'Settled' : ended ? 'Pending' : 'Live'}
        </span>
      </div>

      <div className="flex items-end justify-between border-t border-white/10 pt-4 relative">
        <div className="space-y-1">
          <div className="text-xs text-gray-500 uppercase font-mono tracking-wider">Sealed Bids</div>
          <div className="text-lg font-bold text-white">{auction.bidCount.toString()}</div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs text-gray-500 uppercase font-mono tracking-wider">Status</div>
          <div className="text-sm font-medium text-gray-300">
            {ended ? (hasWinner ? 'Winner claimed' : 'Awaiting finalization') : timeLeft(auction.endTime)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-500 font-mono">
        <span className="w-1.5 h-1.5 rounded-sm bg-[#00ff66] animate-pulse" />
        <span>FHE EXECUTED</span>
      </div>
    </button>
  )
}
