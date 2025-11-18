import { useMemo } from 'react'
import type { Network, Token } from '../../types'
import { calculateTokenUsd, getTokenColor } from '../../services/tokenPrice'

type PortfolioOverviewProps = {
  tokens: Token[]
  network: Network
  loading?: boolean
}

export function PortfolioOverview({ tokens, network, loading }: PortfolioOverviewProps) {
  // Tính total USD từ tất cả tokens
  const totalUsd = useMemo(() => {
    return tokens.reduce((sum, token) => {
      const usd = calculateTokenUsd(token, network)
      return sum + usd
    }, 0)
  }, [tokens, network])

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="section-title">Tài sản testnet</p>
        <span className="rounded-full bg-white/5 px-4 py-1 text-xs text-slate">Đang ở {network.name}</span>
      </div>
      {loading ? (
        <div className="mt-4 text-center text-slate">Đang tải token balances...</div>
      ) : tokens.length === 0 ? (
        <div className="mt-4 text-center text-slate">Chưa có token nào</div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {tokens.map((token) => {
            const usd = calculateTokenUsd(token, network)
            const color = getTokenColor(token, network)
            
            return (
              <article
                key={token.symbol}
                className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/40"
              >
                <p className="text-sm text-slate">{token.name}</p>
                <p className="text-2xl font-semibold text-white">{token.balance.toFixed(4)}</p>
                <p className="text-sm text-slate">${usd.toLocaleString()}</p>
                <div className={`mt-4 h-2 rounded-full bg-gradient-to-r ${color}`} />
              </article>
            )
          })}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
        <span className="text-sm uppercase tracking-[0.3em] text-slate">Total</span>
        <span className="text-3xl font-semibold text-white">${totalUsd.toLocaleString()}</span>
      </div>
    </div>
  )
}

