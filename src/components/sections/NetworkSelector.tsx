import type { Network } from '../../types'

type NetworkSelectorProps = {
  networks: Network[]
  selected: Network
  onSelect: (network: Network) => void
}

export function NetworkSelector({ networks, selected, onSelect }: NetworkSelectorProps) {
  return (
    <div className="glass-panel p-6">
      <p className="section-title">Chọn testnet</p>
      <div className="mt-4 space-y-3">
        {networks.map((network) => {
          const isActive = selected.id === network.id
          return (
            <button
              key={network.id}
              onClick={() => onSelect(network)}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                isActive
                  ? 'border-cyan-400/60 bg-cyan-400/10 shadow-glow'
                  : 'border-white/5 bg-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{network.name}</p>
                  <p className="text-xs text-slate">Chain ID {network.chainId}</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-cyan-200">{network.badge}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate">
                <a href={network.rpc} className="rounded-full border border-white/10 px-3 py-1">
                  RPC
                </a>
                <a href={network.explorer} className="rounded-full border border-white/10 px-3 py-1">
                  Explorer
                </a>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

