import type { Activity, Network } from '../../types'

type ActivityFeedProps = {
  activity: Activity[]
  network: Network
  loading?: boolean
  onViewDetails?: (activity: Activity) => void
  onRefresh?: () => void
}

const statusMap: Record<Activity['status'], { label: string; color: string }> = {
  sent: { label: 'Sent', color: 'text-pink-300' },
  received: { label: 'Received', color: 'text-emerald-300' },
  learn: { label: 'Learning', color: 'text-cyan-200' },
  faucet: { label: 'Faucet', color: 'text-blue-200' },
}

export function ActivityFeed({ activity, network, loading, onViewDetails, onRefresh }: ActivityFeedProps) {
  const isTransactionHash = (id: string) => id.startsWith('0x') && id.length === 66

  return (
    <div className="glass-panel flex flex-col h-full p-6 max-w-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="section-title">Nhật ký hoạt động</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate hover:bg-white/10 hover:text-white transition disabled:opacity-50"
            title="Làm mới (tiết kiệm API calls - chỉ refresh khi cần)"
          >
            {loading ? '⏳' : '🔄'}
          </button>
        )}
      </div>
      {loading ? (
        <div className="mt-4 text-center text-slate">Đang tải lịch sử giao dịch...</div>
      ) : activity.length === 0 ? (
        <div className="mt-4 text-center text-slate">Chưa có giao dịch nào</div>
      ) : (
        <div className="mt-4 space-y-4 overflow-y-auto flex-1">
          {activity.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate">
                <span className={statusMap[item.status].color}>{statusMap[item.status].label}</span>
                <span>{item.timestamp}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white">{item.title}</p>
                  <p className="text-sm text-slate">{item.detail}</p>
                </div>
                {isTransactionHash(item.id) && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onViewDetails?.(item)}
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                    >
                      📄 Chi tiết
                    </button>
                    <a
                      href={`${network.explorer}/tx/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                    >
                      🔗 Explorer
                    </a>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

