import { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityFeed } from './components/sections/ActivityFeed'
import { TransactionDetailsModal } from './components/shared/TransactionDetailsModal'
import { HeroSection } from './components/sections/HeroSection'
import { NetworkSelector } from './components/sections/NetworkSelector'
import { PortfolioOverview } from './components/sections/PortfolioOverview'
import { SendTransactionForm } from './components/sections/SendTransactionForm'
import { WalletPanel } from './components/sections/WalletPanel'
import { defaultNetworks } from './config/networks'
import { useActivityFeed } from './hooks/useActivityFeed'
import { useBlockchainData } from './hooks/useBlockchainData'
import { useTokenHoldings } from './hooks/useTokenHoldings'
import { useTransactionHistory } from './hooks/useTransactionHistory'
import { useWalletManager } from './hooks/useWalletManager'
import { sendNativeTransaction } from './services/blockchain/transaction'
import { calculateTokenUsd } from './services/token/price'
import { getErrorMessage } from './lib/errors'

function App() {
  const walletManager = useWalletManager({
    initialWallets: [],
    initialNetwork: defaultNetworks[0],
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
  
  const gasFee = blockchainSnapshot.gasPrice || '0.000021'

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
      if (!walletManager.draft.to || !walletManager.draft.amount) {
        setTxError('Điền đủ địa chỉ nhận và số lượng nhé!')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }
      if (!walletManager.activeWallet?.privateKey) {
        setTxError('Ví này không có private key để ký giao dịch')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }
      
      if (submissionIdRef.current !== currentSubmissionId) return
      
      const txResult = await sendNativeTransaction({
        network: walletManager.selectedNetwork,
        draft: walletManager.draft,
        privateKey: walletManager.activeWallet!.privateKey,
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow bg-[size:140px_140px] opacity-40" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12">
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
            onSwitch={walletManager.switchWallet}
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

