import { useState } from 'react'

type CreatePasswordScreenProps = {
  onCreate: (password: string) => void
}

export function CreatePasswordScreen({ onCreate }: CreatePasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!password || password.length < 6) {
      setError('Password phải có ít nhất 6 ký tự')
      return
    }
    if (password !== confirmPassword) {
      setError('Password nhập lại không khớp')
      return
    }
    setError(null)
    onCreate(password)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-night text-white">
      <div className="glass-panel w-full max-w-md p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tạo Master Password</h1>
          <p className="mt-2 text-sm text-slate">
            Đây là mật khẩu dùng để mã hóa tất cả ví của bạn trên thiết bị này. Mật khẩu chỉ được giữ trong RAM
            và không được lưu trữ ở bất cứ đâu.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.25em] text-slate">Password</label>
            <input
              data-testid="create-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-slate"
              placeholder="Nhập password"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-[0.25em] text-slate">Nhập lại password</label>
            <input
              data-testid="confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-slate"
              placeholder="Nhập lại password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            data-testid="create-password-submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500/70 to-blue-500/70 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Tạo password và tiếp tục
          </button>
        </form>
      </div>
    </main>
  )
}


