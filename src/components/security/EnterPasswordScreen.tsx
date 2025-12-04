import { useState } from 'react'

type EnterPasswordScreenProps = {
  onSubmit: (password: string) => Promise<void> | void
  error?: string | null
}

export function EnterPasswordScreen({ onSubmit, error }: EnterPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!password) return
    try {
      setSubmitting(true)
      await onSubmit(password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-night text-white">
      <div className="glass-panel w-full max-w-md p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nhập Password</h1>
          <p className="mt-2 text-sm text-slate">
            Đã phát hiện ví được lưu trên thiết bị này. Vui lòng nhập password để giải mã và sử dụng ví.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.25em] text-slate">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-slate"
              placeholder="Nhập password"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!password || submitting}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500/70 to-blue-500/70 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Đang xác thực...' : 'Mở khóa ví'}
          </button>
        </form>
      </div>
    </main>
  )
}


