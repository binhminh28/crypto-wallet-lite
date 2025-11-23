import { useEffect, useState } from 'react'
import type { Network, TransactionDraft, WalletAccount } from '../types'
import {
  deleteWallet as deleteWalletFromDB,
  getAllWallets,
  updateWallet as updateWalletInDB,
} from '../services/wallet/storage'
import {
  createAndSaveWallet,
  importAndSaveWallet,
  importAndSaveWalletFromSeedPhrase,
} from '../services/wallet/wallet'

type WalletManagerOptions = {
  initialWallets: WalletAccount[]
  initialNetwork: Network
}

export function useWalletManager({ initialWallets, initialNetwork }: WalletManagerOptions) {
  const [wallets, setWallets] = useState<WalletAccount[]>(initialWallets)
  const [activeWalletId, setActiveWalletId] = useState(initialWallets[0]?.id ?? '')
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(initialNetwork)
  const [draft, setDraft] = useState<TransactionDraft>({ to: '', amount: '', note: '' })
  const [loading, setLoading] = useState(true)
  const activeWallet = wallets.find((wallet) => wallet.id === activeWalletId) ?? wallets[0]

  useEffect(() => {
    let cancelled = false
    
    async function loadWallets() {
      try {
        const savedWallets = await getAllWallets()
        if (!cancelled) {
          if (savedWallets.length > 0) {
            setWallets(savedWallets)
            setActiveWalletId(savedWallets[0].id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Failed to load wallets from IndexedDB:', error)
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    loadWallets()
    
    return () => {
      cancelled = true
    }
  }, [])

  const createWallet = async (label?: string) => {
    const wallet = await createAndSaveWallet(label || `Ví mới ${wallets.length + 1}`)
    setWallets((prev) => [wallet, ...prev])
    setActiveWalletId(wallet.id)
    return wallet
  }

  const importWallet = async (input: { label?: string; privateKey?: string; seedPhrase?: string }) => {
    if (input.seedPhrase) {
      const wallet = await importAndSaveWalletFromSeedPhrase(input.seedPhrase, input.label)
      setWallets((prev) => [wallet, ...prev])
      setActiveWalletId(wallet.id)
      return wallet
    } else if (input.privateKey) {
      const wallet = await importAndSaveWallet(input.privateKey, input.label)
      setWallets((prev) => [wallet, ...prev])
      setActiveWalletId(wallet.id)
      return wallet
    } else {
      throw new Error('Phải cung cấp private key hoặc seed phrase')
    }
  }

  const deleteWallet = async (id: string) => {
    await deleteWalletFromDB(id)
    setWallets((prev) => {
      const filtered = prev.filter((w) => w.id !== id)
      if (activeWalletId === id && filtered.length > 0) {
        setActiveWalletId(filtered[0].id)
      }
      return filtered
    })
  }

  const updateWallet = async (wallet: WalletAccount) => {
    await updateWalletInDB(wallet)
    setWallets((prev) => prev.map((w) => (w.id === wallet.id ? wallet : w)))
  }

  const refreshWallets = async () => {
    const savedWallets = await getAllWallets()
    setWallets(savedWallets)
    if (savedWallets.length > 0 && !savedWallets.find((w) => w.id === activeWalletId)) {
      setActiveWalletId(savedWallets[0].id)
    }
  }

  const resetDraft = () => setDraft({ to: '', amount: '', note: '' })

  return {
    wallets,
    activeWallet,
    selectedNetwork,
    draft,
    loading,
    setDraft,
    setSelectedNetwork,
    switchWallet: setActiveWalletId,
    createWallet,
    importWallet,
    deleteWallet,
    updateWallet,
    refreshWallets,
    resetDraft,
  }
}

