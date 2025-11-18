import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityFeed } from './components/sections/ActivityFeed'
import { TransactionDetailsModal } from './components/shared/TransactionDetailsModal'
import { HeroSection } from './components/sections/HeroSection'
import { NetworkSelector } from './components/sections/NetworkSelector'
import { PortfolioOverview } from './components/sections/PortfolioOverview'
import { SendTransactionForm } from './components/sections/SendTransactionForm'
import { WalletPanel } from './components/sections/WalletPanel'
import {
  defaultNetworks,
} from './data/mockData'
import { useActivityFeed } from './hooks/useActivityFeed'
import { useBlockchainData } from './hooks/useBlockchainData'
import { useTokenHoldings } from './hooks/useTokenHoldings'
import { useTransactionHistory } from './hooks/useTransactionHistory'
import { useWalletManager } from './hooks/useWalletManager'
import { sendNativeTransaction } from './services/testnet'
import { calculateTokenUsd } from './services/tokenPrice'

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
  
  // Merge real activities với recorded activities
  const allActivities = useMemo(() => {
    const merged = [...realActivities, ...activity]
    return merged.sort((a, b) => {
      // Sort by timestamp (newest first) - simplified
      return b.id.localeCompare(a.id)
    }).slice(0, 10)
  }, [realActivities, activity])

  // Tính total USD từ tất cả tokens (đã bao gồm native token)
  const totalUsd = useMemo(() => {
    return currentTokens.reduce((sum, token) => {
      return sum + calculateTokenUsd(token, walletManager.selectedNetwork)
    }, 0)
  }, [currentTokens, walletManager.selectedNetwork])
  
  // Sử dụng gasPrice từ blockchainSnapshot thay vì gọi estimateGasFee riêng
  // để tránh duplicate request
  const gasFee = blockchainSnapshot.gasPrice || '0.000021'

  const [txError, setTxError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<typeof allActivities[0] | null>(null)
  const [transactionResult, setTransactionResult] = useState<{ hash: string; status: 'success' | 'failed' } | null>(null)
  
  // Use ref để track đang submit và tránh double submission
  const isSubmittingRef = useRef(false)
  const submissionIdRef = useRef<string | null>(null)

  const handleSubmitTx = useCallback(async () => {
    // Kiểm tra nếu đang submit thì return ngay
    if (isSubmittingRef.current || isSubmitting) {
      console.log('[App] Already submitting, ignoring duplicate request')
      return
    }
    
    // Tạo unique ID cho submission này
    const currentSubmissionId = `tx-${Date.now()}-${Math.random()}`
    submissionIdRef.current = currentSubmissionId
    
    try {
      // Set flag ngay từ đầu - phải set trước khi bất kỳ async operation nào
      isSubmittingRef.current = true
      setIsSubmitting(true)
      setTxError(null)
      setTransactionResult(null)
      
      // Kiểm tra lại submission ID để đảm bảo không bị override bởi submission khác
      if (submissionIdRef.current !== currentSubmissionId) {
        console.log('[App] Submission ID mismatch, aborting')
        return
      }
      
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
      
      // Kiểm tra lại một lần nữa trước khi gửi transaction
      if (submissionIdRef.current !== currentSubmissionId) {
        console.log('[App] Submission ID mismatch before sending, aborting')
        return
      }
      
      console.log('[App] Starting transaction submission:', currentSubmissionId)
      
      // Luôn gửi thật trên testnet (không có simulation mode)
      const txResult = await sendNativeTransaction({
        network: walletManager.selectedNetwork,
        draft: walletManager.draft,
        privateKey: walletManager.activeWallet!.privateKey,
      })
      
      // Kiểm tra lại submission ID sau khi nhận response
      if (submissionIdRef.current !== currentSubmissionId) {
        console.log('[App] Submission ID mismatch after response, ignoring result')
        return
      }
      
      console.log('[App] Transaction sent successfully:', txResult)
      
      // Record transaction với transaction hash nếu có
      recordTransaction({
        from: walletManager.activeWallet!,
        draft: walletManager.draft,
        network: walletManager.selectedNetwork,
        txHash: txResult?.hash,
      })
      
      walletManager.resetDraft()
      
      // Hiển thị result (cả success và failed đều có hash)
      if (txResult?.hash) {
        setTransactionResult({
          hash: txResult.hash,
          status: txResult.status,
        })
        
        // Refresh transaction history sau khi gửi (cả success và failed)
        // Delay một chút để đảm bảo transaction đã được index trên explorer
        setTimeout(() => {
          refreshHistory()
        }, 2000)
      }
    } catch (error) {
      // Chỉ xử lý error nếu submission ID vẫn match
      if (submissionIdRef.current === currentSubmissionId) {
        const errorMessage = error instanceof Error ? error.message : 'Không gửi được giao dịch'
        setTxError(errorMessage)
      }
    } finally {
      // Chỉ reset nếu submission ID vẫn match
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

