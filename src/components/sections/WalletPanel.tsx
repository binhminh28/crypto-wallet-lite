import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Network, WalletAccount } from '../../types'
import { copyToClipboard, shortAddress } from '../../utils/format'

type WalletPanelProps = {
  wallets: WalletAccount[]
  activeWallet?: WalletAccount
  onSwitch: (walletId: string) => void
  onCreate: (label?: string) => Promise<WalletAccount>
  onImport: (input: { label?: string; privateKey: string }) => Promise<WalletAccount>
  onDelete: (id: string) => Promise<void>
  onUpdate: (wallet: WalletAccount) => Promise<void>
  nativeBalance?: string | null
  networkBadge: string
  network: Network
  loading?: boolean
}

export function WalletPanel({
  wallets,
  activeWallet,
  onSwitch,
  onCreate,
  onImport,
  onDelete,
  onUpdate,
  nativeBalance,
  networkBadge,
  network,
  loading,
}: WalletPanelProps) {
  const [importKey, setImportKey] = useState('')
  const [label, setLabel] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleImport = async () => {
    if (!importKey) return
    try {
      await onImport({ label, privateKey: importKey })
      setImportKey('')
      setLabel('')
      setShowImport(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Import thất bại')
    }
  }

  const handleCreate = async () => {
    try {
      await onCreate()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Tạo ví thất bại')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa ví này?')) return
    try {
      await onDelete(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Xóa ví thất bại')
    }
  }

  const handleStartEdit = (wallet: WalletAccount) => {
    setEditingWallet(wallet)
    setEditLabel(wallet.label)
  }

  const handleSaveEdit = async () => {
    if (!editingWallet) return
    try {
      await onUpdate({ ...editingWallet, label: editLabel })
      setEditingWallet(null)
      setEditLabel('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Cập nhật thất bại')
    }
  }

  const handleCancelEdit = () => {
    setEditingWallet(null)
    setEditLabel('')
  }

  const handleCopyAddress = async () => {
    if (!activeWallet?.address) return
    const success = await copyToClipboard(activeWallet.address)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  return (
    <div className="glass-panel p-6">
      <p className="section-title">Ví của bạn</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Đang dùng</p>
          <p className="mt-1 text-lg font-semibold text-white">{activeWallet?.label}</p>
          {activeWallet && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-slate font-mono">{shortAddress(activeWallet.address)}</p>
              <button
                onClick={handleCopyAddress}
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                title="Copy địa chỉ"
              >
                {copySuccess ? '✓' : '📋'}
              </button>
              <a
                href={`${network.explorer}/address/${activeWallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                title="Xem trên Explorer"
              >
                🔗
              </a>
              <button
                onClick={() => setShowQR(!showQR)}
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white transition"
                title="Hiển thị QR Code"
              >
                📱
              </button>
            </div>
          )}
          {showQR && activeWallet && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center gap-3">
              <QRCodeSVG value={activeWallet.address} size={150} />
              <p className="text-xs font-mono text-slate break-all text-center">{activeWallet.address}</p>
              <button
                onClick={handleCopyAddress}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate hover:text-white transition"
              >
                {copySuccess ? '✓ Đã copy!' : '📋 Copy địa chỉ'}
              </button>
            </div>
          )}
          <p className="text-sm text-slate mt-2">
            Số dư: <span className="text-white">{formatBalance(nativeBalance)}</span> {networkBadge}
          </p>
        </div>
        <div className="grid gap-3 text-sm">
          <button
            className="rounded-2xl border border-white/5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-3 font-semibold text-white transition hover:opacity-90"
            onClick={handleCreate}
            disabled={loading}
          >
            + Tạo ví mới
          </button>
          <button
            className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate transition hover:text-white hover:border-white/20"
            onClick={() => setShowImport(!showImport)}
          >
            {showImport ? '✕ Đóng' : '⬆ Import ví'}
          </button>
          {showImport && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate mb-2">Import private key</p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Tên ví (tuỳ chọn)"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-slate"
                />
                <input
                  type="password"
                  placeholder="0x..."
                  value={importKey}
                  onChange={(event) => setImportKey(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-slate"
                />
                <button
                  type="button"
                  disabled={!importKey}
                  onClick={handleImport}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-slate transition hover:text-white disabled:opacity-40"
                >
                  Import
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm text-slate">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-slate">Ví đã lưu ({wallets.length})</p>
          </div>
          {loading ? (
            <div className="text-center py-4 text-slate">Đang tải...</div>
          ) : wallets.length === 0 ? (
            <div className="text-center py-4 text-slate">Chưa có ví nào</div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`rounded-2xl border p-3 transition ${
                    wallet.id === activeWallet?.id
                      ? 'border-cyan-400/60 bg-cyan-500/10'
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  {editingWallet?.id === wallet.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 rounded-xl bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-semibold text-slate hover:bg-white/20"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onSwitch(wallet.id)}
                          className="flex-1 text-left"
                        >
                          <p className={`font-semibold ${wallet.id === activeWallet?.id ? 'text-white' : 'text-slate'}`}>
                            {wallet.label}
                          </p>
                          <p className="text-xs text-slate mt-0.5">{shortAddress(wallet.address)}</p>
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEdit(wallet)}
                            className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate hover:bg-white/10 hover:text-white"
                            title="Chỉnh sửa tên"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(wallet.id)}
                            className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                            title="Xóa ví"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatBalance(value?: string | null) {
  if (!value) return '0'
  const num = Number(value)
  if (Number.isNaN(num)) return value
  if (num === 0) return '0'
  if (num < 0.0001) return '<0.0001'
  return num.toFixed(4)
}

