import { useEffect, useState } from 'react'
import type { Network, TransactionDraft, WalletAccount, WalletSecrets } from '../types'
import {
  deleteWallet as deleteWalletFromDB,
  getAllWallets,
  updateWallet as updateWalletInDB,
} from '../services/wallet/storage'
import { PRIVATE_KEY } from '../config/constants'
import { Wallet } from 'ethers'
import { saveWallet } from '../services/wallet/storage'

type WalletManagerOptions = {
  initialWallets: WalletAccount[]
  initialNetwork: Network
  sessionPassword: string | null
}

export function useWalletManager({ initialWallets, initialNetwork, sessionPassword }: WalletManagerOptions) {
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

  const createWallet = async (label?: string): Promise<WalletSecrets> => {
    if (!sessionPassword) {
      throw new Error('Bạn cần nhập password trước khi tạo ví')
    }

    const wallet = Wallet.createRandom()
    const encryptedJson = await wallet.encrypt(sessionPassword)

    const walletRecord: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Ví mới ${wallets.length + 1}`,
      address: wallet.address,
      encryptedJson,
      createdAt: new Date().toISOString(),
    }

    await saveWallet(walletRecord)
    setWallets((prev) => [walletRecord, ...prev])
    setActiveWalletId(walletRecord.id)

    const seedPhrase = wallet.mnemonic?.phrase || undefined
    const secrets: WalletSecrets = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase,
    }

    return secrets
  }

  const importWallet = async (input: { label?: string; privateKey?: string; seedPhrase?: string }): Promise<WalletSecrets> => {
    if (!sessionPassword) {
      throw new Error('Bạn cần nhập password trước khi import ví')
    }

    let wallet: Wallet
    let seedPhrase: string | undefined

    if (input.seedPhrase) {
      const normalizedSeedPhrase = input.seedPhrase.trim().replace(/\s+/g, ' ')
      wallet = Wallet.fromPhrase(normalizedSeedPhrase)
      seedPhrase = normalizedSeedPhrase
    } else if (input.privateKey) {
      let normalizedPrivateKey = input.privateKey.trim()
      if (!normalizedPrivateKey.startsWith(PRIVATE_KEY.PREFIX)) {
        normalizedPrivateKey = PRIVATE_KEY.PREFIX + normalizedPrivateKey
      }
      wallet = new Wallet(normalizedPrivateKey)
    } else {
      throw new Error('Phải cung cấp private key hoặc seed phrase')
    }

    const encryptedJson = await wallet.encrypt(sessionPassword)

    const walletRecord: WalletAccount = {
      id: crypto.randomUUID(),
      label: input.label || `Imported wallet ${Date.now()}`,
      address: wallet.address,
      encryptedJson,
      createdAt: new Date().toISOString(),
    }

    await saveWallet(walletRecord)
    setWallets((prev) => [walletRecord, ...prev])
    setActiveWalletId(walletRecord.id)

    const secrets: WalletSecrets = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase,
    }

    return secrets
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

