import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Wallet } from 'ethers'
import { ActivityFeed } from './components/sections/ActivityFeed'
import { TransactionDetailsModal } from './components/shared/TransactionDetailsModal'
import { HeroSection } from './components/sections/HeroSection'
import { NetworkSelector } from './components/sections/NetworkSelector'
import { PortfolioOverview } from './components/sections/PortfolioOverview'
import { SendTransactionForm } from './components/sections/SendTransactionForm'
import { WalletPanel } from './components/sections/WalletPanel'
import { CreatePasswordScreen } from './components/security/CreatePasswordScreen'
import { EnterPasswordScreen } from './components/security/EnterPasswordScreen'
import { defaultNetworks } from './config/networks'
import { useActivityFeed } from './hooks/useActivityFeed'
import { useBlockchainData } from './hooks/useBlockchainData'
import { useTokenHoldings } from './hooks/useTokenHoldings'
import { useTransactionHistory } from './hooks/useTransactionHistory'
import { useWalletManager } from './hooks/useWalletManager'
import { sendNativeTransaction } from './services/blockchain/transaction'
import { calculateTokenUsd } from './services/token/price'
import { getErrorMessage } from './lib/errors'
import { getAllWallets } from './services/wallet/storage'

function App() {
  const [sessionPassword, setSessionPassword] = useState<string | null>(null)
  const [sessionWallet, setSessionWallet] = useState<Wallet | null>(null)
  const [authStep, setAuthStep] = useState<'checking' | 'create' | 'enter' | 'unlocked'>('checking')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkWallets() {
      try {
        const wallets = await getAllWallets()
        if (!cancelled) {
          setAuthStep(wallets.length > 0 ? 'enter' : 'create')
        }
      } catch (error) {
        console.error('Failed to check wallets from IndexedDB:', error)
        if (!cancelled) {
          setAuthStep('create')
        }
      }
    }

    checkWallets()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      setSessionPassword(null)
      setSessionWallet(null)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleCreatePassword = (password: string) => {
    setSessionPassword(password)
    setAuthError(null)
    setAuthStep('unlocked')
  }

  const handleEnterPassword = useCallback(
    async (password: string) => {
      try {
        setAuthError(null)
        const wallets = await getAllWallets()
        if (wallets.length === 0) {
          setAuthStep('create')
          return
        }
        await Wallet.fromEncryptedJson(wallets[0].encryptedJson, password)
        setSessionPassword(password)
        setAuthStep('unlocked')
      } catch (error) {
        console.error('Password validation failed:', error)
        setAuthError('Password không đúng hoặc không decrypt được ví. Vui lòng thử lại.')
      }
    },
    []
  )

  const handleLock = () => {
    setSessionPassword(null)
    setSessionWallet(null)
    setAuthStep('enter')
  }

  const walletManager = useWalletManager({
    initialWallets: [],
    initialNetwork: defaultNetworks[0],
    sessionPassword,
  })
  const { activity, recordTransaction } = useActivityFeed({
    initialActivity: [],
  })
  
  const blockchainSnapshot = useBlockchainData(
    walletManager.selectedNetwork,
    walletManager.activeWallet?.address,
  )
  
  const { tokens: currentTokens, loading: tokensLoading } = useTokenHoldings(
    walletManager.selectedNetwork,
    walletManager.activeWallet?.address,
    blockchainSnapshot.nativeBalance,
  )
  
  const { activities: realActivities, loading: historyLoading, refresh: refreshHistory } = useTransactionHistory(
    walletManager.selectedNetwork,
    walletManager.activeWallet?.address,
    10,
  )
  
  const allActivities = useMemo(() => {
    return [...realActivities, ...activity]
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeB - timeA
      })
      .slice(0, 10)
  }, [realActivities, activity])

  const totalUsd = useMemo(() => {
    return currentTokens.reduce((sum, token) => {
      return sum + calculateTokenUsd(token, walletManager.selectedNetwork)
    }, 0)
  }, [currentTokens, walletManager.selectedNetwork])
  
  const gasFee = useMemo(() => {
    const price = parseFloat(blockchainSnapshot.gasPrice || '0.00000005')
    const limit = 21000 
    return (price * limit).toFixed(8) 
  }, [blockchainSnapshot.gasPrice])

  const [txError, setTxError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<typeof allActivities[0] | null>(null)
  const [transactionResult, setTransactionResult] = useState<{ hash: string; status: 'success' | 'failed' } | null>(null)
  
  const isSubmittingRef = useRef(false)
  const submissionIdRef = useRef<string | null>(null)

  const handleSubmitTx = useCallback(async () => {
    if (isSubmittingRef.current || isSubmitting) return
    
    const currentSubmissionId = `tx-${Date.now()}-${Math.random()}`
    submissionIdRef.current = currentSubmissionId
    
    try {
      isSubmittingRef.current = true
      setIsSubmitting(true)
      setTxError(null)
      setTransactionResult(null)
      
      if (submissionIdRef.current !== currentSubmissionId) return
      
      if (!walletManager.activeWallet) {
        setTxError('Chưa có ví nào được chọn')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }
      if (!sessionWallet) {
        setTxError('Bạn cần unlock ví bằng password và chọn ví để ký giao dịch')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }
      if (!walletManager.draft.to || !walletManager.draft.amount) {
        setTxError('Điền đủ địa chỉ nhận và số lượng nhé!')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }
      
      if (submissionIdRef.current !== currentSubmissionId) return
      
      const txResult = await sendNativeTransaction({
        network: walletManager.selectedNetwork,
        draft: walletManager.draft,
        privateKey: sessionWallet.privateKey,
      })
      
      if (submissionIdRef.current !== currentSubmissionId) return
      
      recordTransaction({
        from: walletManager.activeWallet!,
        draft: walletManager.draft,
        network: walletManager.selectedNetwork,
        txHash: txResult?.hash,
      })
      
      walletManager.resetDraft()
      
      if (txResult?.hash) {
        setTransactionResult({
          hash: txResult.hash,
          status: txResult.status,
        })
        setTimeout(() => refreshHistory(), 2000)
      }
    } catch (error) {
      if (submissionIdRef.current === currentSubmissionId) {
        setTxError(getErrorMessage(error))
      }
    } finally {
      if (submissionIdRef.current === currentSubmissionId) {
        setIsSubmitting(false)
        isSubmittingRef.current = false
        submissionIdRef.current = null
      }
    }
  }, [walletManager.activeWallet, walletManager.draft, walletManager.selectedNetwork, isSubmitting, recordTransaction, refreshHistory])

  const handleClearResult = () => {
    setTransactionResult(null)
    setTxError(null)
  }

  const handleSwitchWallet = useCallback(
    async (walletId: string) => {
      walletManager.switchWallet(walletId)

      if (!sessionPassword) {
        setSessionWallet(null)
        return
      }

      const target = walletManager.wallets.find((w) => w.id === walletId)
      if (!target) {
        setSessionWallet(null)
        return
      }

      try {
        const decrypted = await Wallet.fromEncryptedJson(target.encryptedJson, sessionPassword)
        setSessionWallet(decrypted)
      } catch (error) {
        console.error('Failed to decrypt wallet with current session password:', error)
        setTxError('Không thể giải mã ví với password hiện tại. Vui lòng thử lại.')
        setSessionWallet(null)
      }
    },
    [sessionPassword, walletManager.wallets, walletManager.switchWallet]
  )

  if (authStep === 'checking') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-night text-white">
        <div className="text-slate">Đang kiểm tra ví đã lưu...</div>
      </main>
    )
  }

  if (authStep === 'create') {
    return <CreatePasswordScreen onCreate={handleCreatePassword} />
  }

  if (authStep === 'enter') {
    return <EnterPasswordScreen onSubmit={handleEnterPassword} error={authError} />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow bg-[size:140px_140px] opacity-40" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLock}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate hover:text-white hover:border-white/30"
          >
            Khóa ví
          </button>
        </div>
        <HeroSection totalUsd={totalUsd} />

        <section className="grid gap-6 lg:grid-cols-2">
          <NetworkSelector
            networks={defaultNetworks}
            selected={walletManager.selectedNetwork}
            onSelect={walletManager.setSelectedNetwork}
          />
          <WalletPanel
            wallets={walletManager.wallets}
            activeWallet={walletManager.activeWallet}
            onSwitch={handleSwitchWallet}
            onCreate={walletManager.createWallet}
            onImport={walletManager.importWallet}
            onDelete={walletManager.deleteWallet}
            onUpdate={walletManager.updateWallet}
            nativeBalance={blockchainSnapshot.nativeBalance}
            networkBadge={walletManager.selectedNetwork.badge}
            network={walletManager.selectedNetwork}
            loading={walletManager.loading}
          />
        </section>

        <section>
          <PortfolioOverview
            tokens={currentTokens}
            network={walletManager.selectedNetwork}
            loading={tokensLoading}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2 lg:h-[600px]">
          <div className="h-full">
            <SendTransactionForm
              draft={walletManager.draft}
              onChange={walletManager.setDraft}
              onSubmit={handleSubmitTx}
              network={walletManager.selectedNetwork}
              address={walletManager.activeWallet?.address}
              isSubmitting={isSubmitting}
              error={txError ?? undefined}
              gasFee={gasFee}
              nativeBalance={blockchainSnapshot.nativeBalance}
              transactionResult={transactionResult}
              onClearResult={handleClearResult}
            />
          </div>
          <div className="h-full">
            <ActivityFeed
              activity={allActivities}
              network={walletManager.selectedNetwork}
              loading={historyLoading}
              onViewDetails={(activity) => setSelectedTransaction(activity)}
              onRefresh={refreshHistory}
            />
          </div>
        </section>
      </div>

      {selectedTransaction && (
        <TransactionDetailsModal
          activity={selectedTransaction}
          network={walletManager.selectedNetwork}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </main>
  )
}

export default App

