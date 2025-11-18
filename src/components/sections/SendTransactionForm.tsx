import type { Network, TransactionDraft, WalletAccount } from '../../types'

type SendTransactionFormProps = {
  draft: TransactionDraft
  onChange: (draft: TransactionDraft) => void
  onSubmit: () => void
  network: Network
  address?: WalletAccount['address']
  isSubmitting?: boolean
  error?: string
  gasFee: string
  nativeBalance?: string | null
}

export function SendTransactionForm({
  draft,
  onChange,
  onSubmit,
  network,
  address,
  isSubmitting,
  error,
  gasFee,
  nativeBalance,
}: SendTransactionFormProps) {
  // Tính số tiền có thể gửi tối đa (số dư, vì số dư đã là tổng có thể gửi)
  const calculateMaxSendable = () => {
    if (!nativeBalance) return null
    const balance = parseFloat(nativeBalance)
    if (isNaN(balance)) return null
    return balance > 0 ? balance.toFixed(6) : '0'
  }

  // Tính số tiền thực tế người nhận sẽ nhận (tổng - phí gas)
  const calculateActualReceive = () => {
    if (!draft.amount) return null
    const total = parseFloat(draft.amount)
    const gas = parseFloat(gasFee)
    if (isNaN(total) || isNaN(gas)) return null
    const actual = total - gas
    return actual > 0 ? actual.toFixed(6) : '0'
  }

  const maxSendable = calculateMaxSendable()
  const actualReceive = calculateActualReceive()

  const handleUseMax = () => {
    if (maxSendable && parseFloat(maxSendable) > 0) {
      onChange({ ...draft, amount: maxSendable })
    }
  }
  return (
    <form
      className="glass-panel flex flex-col gap-4 p-6 h-full"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <p className="section-title">Gửi giao dịch</p>
      <div className="text-xs text-slate">
        <p>Từ ví</p>
        <p className="font-mono text-sm text-white">{address}</p>
      </div>
      <label className="space-y-2 text-sm">
        <span className="text-slate">Đến</span>
        <input
          type="text"
          placeholder="0x..."
          value={draft.to}
          onChange={(event) => onChange({ ...draft, to: event.target.value })}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-slate"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate">Số lượng</span>
            {maxSendable && parseFloat(maxSendable) > 0 && (
              <button
                type="button"
                onClick={handleUseMax}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Gửi tối đa: {maxSendable} {network.badge}
              </button>
            )}
          </div>
          <input
            type="number"
            placeholder="0.05"
            value={draft.amount}
            min="0"
            step="0.0001"
            onChange={(event) => onChange({ ...draft, amount: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-slate"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="text-slate">Ghi chú</span>
          <input
            type="text"
            placeholder="Testnet gas experiment"
            value={draft.note}
            onChange={(event) => onChange({ ...draft, note: event.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-slate"
          />
        </label>
      </div>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate">
        <div className="flex justify-between">
          <span>Số tiền gửi (tổng):</span>
          <span className="text-white">{draft.amount || '0'} {network.badge}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Phí gas (sẽ trừ từ số tiền gửi):</span>
          <span className="text-orange-300">~{gasFee} {network.badge}</span>
        </div>
        {actualReceive && parseFloat(actualReceive) > 0 && (
          <div className="flex justify-between text-xs border-t border-white/10 pt-2 mt-1">
            <span className="text-cyan-300">Người nhận sẽ nhận:</span>
            <span className="text-cyan-300 font-semibold">{actualReceive} {network.badge}</span>
          </div>
        )}
        {nativeBalance && (
          <div className="flex justify-between text-xs opacity-75">
            <span>Số dư hiện tại:</span>
            <span className="text-white">{parseFloat(nativeBalance).toFixed(6)} {network.badge}</span>
          </div>
        )}
        {maxSendable && parseFloat(maxSendable) > 0 && (
          <div className="flex justify-between text-xs opacity-75">
            <span>Có thể gửi tối đa:</span>
            <span className="text-cyan-300">{maxSendable} {network.badge}</span>
          </div>
        )}
        {address && (
          <div className="flex justify-between text-xs opacity-75 border-t border-white/10 pt-2 mt-1">
            <span>Lưu ý:</span>
            <span className="text-yellow-200">Phí gas được tính trong số tiền gửi</span>
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-pink-300">{error}</p> : null}
      <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
        ⚠️ Giao dịch sẽ được gửi thật lên {network.name} testnet
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-glow disabled:opacity-60"
      >
        {isSubmitting ? 'Đang gửi...' : 'Gửi giao dịch'}
      </button>
    </form>
  )
}

