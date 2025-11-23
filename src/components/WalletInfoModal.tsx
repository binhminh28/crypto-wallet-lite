import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { WalletAccount } from '../types'
import { copyToClipboard } from '../utils/format'

type WalletInfoModalProps = {
  wallet: WalletAccount
  onClose: () => void
}

export function WalletInfoModal({ wallet, onClose }: WalletInfoModalProps) {
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showSeedPhrase, setShowSeedPhrase] = useState(false)
  const [copySuccess, setCopySuccess] = useState<{ [key: string]: boolean }>({})

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopySuccess((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopySuccess((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    }
  }

  const maskText = (text: string) => {
    if (text.includes(' ')) {
      const wordCount = text.trim().split(/\s+/).length
      return `••• ${wordCount} từ •••`
    } else {
      return '•'.repeat(Math.min(text.length, 20))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-panel max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Thông tin ví mới</h2>
          <button
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm text-slate hover:bg-white/20 hover:text-white transition"
          >
            ✕ Đóng
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-300 mb-1">Cảnh báo bảo mật</p>
              <p className="text-sm text-red-200/80">
                Vui lòng lưu lại thông tin này ở nơi an toàn. Nếu bạn mất private key hoặc seed phrase, 
                bạn sẽ không thể khôi phục ví và mất quyền truy cập vào tài sản của mình. 
                <strong className="text-red-300"> Không bao giờ chia sẻ thông tin này với bất kỳ ai.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate mb-3">Địa chỉ ví</p>
          <div className="flex flex-col items-center gap-3">
            <QRCodeSVG value={wallet.address} size={200} />
            <div className="w-full flex items-center gap-2">
              <p className="flex-1 text-sm font-mono text-white break-all text-center">
                {wallet.address}
              </p>
              <button
                onClick={() => handleCopy(wallet.address, 'address')}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs text-slate hover:bg-white/20 hover:text-white transition whitespace-nowrap"
                title="Copy địa chỉ"
              >
                {copySuccess.address ? '✓ Đã copy' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate">Private Key</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate hover:bg-white/20 hover:text-white transition"
              >
                {showPrivateKey ? '👁️ Ẩn' : '👁️‍🗨️ Hiện'}
              </button>
              <button
                onClick={() => handleCopy(wallet.privateKey, 'privateKey')}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate hover:bg-white/20 hover:text-white transition"
                title="Copy private key"
              >
                {copySuccess.privateKey ? '✓ Đã copy' : '📋 Copy'}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-sm font-mono text-white break-all">
              {showPrivateKey ? wallet.privateKey : maskText(wallet.privateKey)}
            </p>
          </div>
        </div>

        {wallet.seedPhrase && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate">Seed Phrase</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate hover:bg-white/20 hover:text-white transition"
                >
                  {showSeedPhrase ? '👁️ Ẩn' : '👁️‍🗨️ Hiện'}
                </button>
                <button
                  onClick={() => handleCopy(wallet.seedPhrase!, 'seedPhrase')}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs text-slate hover:bg-white/20 hover:text-white transition"
                  title="Copy seed phrase"
                >
                  {copySuccess.seedPhrase ? '✓ Đã copy' : '📋 Copy'}
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-sm font-mono text-white break-words">
                {showSeedPhrase ? wallet.seedPhrase : maskText(wallet.seedPhrase)}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            Đã lưu thông tin
          </button>
        </div>
      </div>
    </div>
  )
}

