type HeroSectionProps = {
  totalUsd: number
}

export function HeroSection({ totalUsd }: HeroSectionProps) {
  return (
    <header className="glass-panel relative overflow-hidden p-8">
      <div className="absolute inset-y-0 right-0 m-8 hidden w-64 animate-float rounded-3xl bg-gradient-to-br from-cyan-400/40 to-emerald-400/30 blur-3xl lg:block" />
      <div className="space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Testnet Playground</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Crypto wallet
            </h1>
            <p className="text-lg text-slate">
              Tạo ví, claim faucet, mô phỏng giao dịch.
            </p>
            <div className="flex flex-wrap gap-3">
              {['Tạo/Import ví', 'Theo dõi token', 'Gửi giao dịch', 'Faucet helper'].map((pill) => (
                <span key={pill} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate">
                  {pill}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 px-6 py-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Portfolio</p>
            <p className="text-4xl font-semibold text-white">${totalUsd.toLocaleString()}</p>
            <p className="text-sm text-slate">Giá trị giả lập trên mạng testnet</p>
          </div>
        </div>
      </div>
    </header>
  )
}

