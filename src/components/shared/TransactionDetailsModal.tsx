import { useEffect } from 'react'
import type { Activity, Network } from '../../types'
import { copyToClipboard } from '../../utils/format'

type TransactionDetailsModalProps = {
  activity: Activity | null
  network: Network
  onClose: () => void
}

export function TransactionDetailsModal({ activity, network, onClose }: TransactionDetailsModalProps) {
  useEffect(() => {
    if (activity) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [activity])

  if (!activity) return null

  const handleCopy = async (text: string) => {
    await copyToClipboard(text)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="section-title">Chi tiết giao dịch</p>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-slate hover:bg-white/10 hover:text-white transition"
          >
            ✕ Đóng
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate mb-2">Transaction Hash</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-white break-all">{activity.id}</p>
              <button
                onClick={() => handleCopy(activity.id)}
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                title="Copy"
              >
                📋
              </button>
              <a
                href={`${network.explorer}/tx/${activity.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                title="Xem trên Explorer"
              >
                🔗
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate mb-2">Trạng thái</p>
            <p className="text-sm font-semibold text-white">{activity.title}</p>
            <p className="text-sm text-slate mt-1">{activity.detail}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate mb-2">Thời gian</p>
            <p className="text-sm text-white">{activity.timestamp}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate mb-2">Mạng</p>
            <p className="text-sm text-white">{network.name}</p>
            <p className="text-xs text-slate mt-1">Chain ID: {network.chainId}</p>
          </div>

          <div className="flex gap-3">
            <a
              href={`${network.explorer}/tx/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
            >
              🔗 Xem trên Explorer
            </a>
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate transition hover:text-white hover:border-white/20"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

