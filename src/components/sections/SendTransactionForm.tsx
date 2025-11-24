import { FaTimesCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import type { Network, TransactionDraft, WalletAccount } from '../../types'
import React, { useEffect, useRef } from 'react'

type TransactionResult = {
  hash: string
  status: 'success' | 'failed'
} | null

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
  transactionResult?: TransactionResult
  onClearResult?: () => void
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
  transactionResult,
  onClearResult,
}: SendTransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  
  const calculateMaxSendable = () => {
    if (!nativeBalance) return null
    const balance = parseFloat(nativeBalance)
    if (isNaN(balance)) return null
    return balance > 0 ? balance.toFixed(6) : '0'
  }

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

  useEffect(() => {
    if (!isSubmitting && formRef.current) {
      formRef.current.style.pointerEvents = 'auto'
    }
  }, [isSubmitting])

  const handleUseMax = () => {
    if (maxSendable && parseFloat(maxSendable) > 0) {
      onChange({ ...draft, amount: maxSendable })
    }
  }
  
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (isSubmitting) return false
    
    if (formRef.current) {
      formRef.current.style.pointerEvents = 'none'
    }
    
    onSubmit()
    
    return false
  }

  return (
    <form
      ref={formRef}
      className="glass-panel flex flex-col gap-4 p-6 h-full"
      onSubmit={handleFormSubmit}
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
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0"><FaTimesCircle /></span>
            <span className="flex-1">{error}</span>
          </div>
        </div>
      ) : null}
      
      {transactionResult && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          transactionResult.status === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-red-500/30 bg-red-500/10 text-red-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">{transactionResult.status === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}</span>
            <div className="flex-1">
              <p className="font-semibold mb-1">
                {transactionResult.status === 'success' 
                  ? 'Giao dịch đã được gửi thành công!' 
                  : 'Giao dịch thất bại'}
              </p>
              {transactionResult.hash && (
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`${network.explorer}/tx/${transactionResult.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline hover:opacity-80 break-all"
                  >
                    Xem trên {network.name === 'Sepolia' ? 'Etherscan' : 'Explorer'}
                  </a>
                  <button
                    type="button"
                    onClick={onClearResult}
                    className="text-xs underline hover:opacity-80"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!error && !transactionResult && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200 flex items-center gap-2">
          <span className="flex-shrink-0"><FaExclamationTriangle /></span>
          <span>Giao dịch sẽ được gửi thật lên {network.name} testnet</span>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        onClick={(e) => {
          if (isSubmitting) {
            e.preventDefault()
            e.stopPropagation()
            return false
          }
        }}
        className="rounded-2xl bg-gradient-to-r from-orange-400 to-red-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Đang gửi...' : 'Gửi giao dịch'}
      </button>
    </form>
  )
}

