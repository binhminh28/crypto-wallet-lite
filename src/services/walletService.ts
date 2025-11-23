import { Wallet } from 'ethers'
import type { WalletAccount } from '../types'
import { saveWallet } from './walletStorage'

export function createNewWallet(label?: string): WalletAccount {
  try {
    const wallet = Wallet.createRandom()
    
    const seedPhrase = wallet.mnemonic?.phrase || undefined
    
    const walletAccount: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Ví mới ${Date.now()}`,
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase: seedPhrase,
      createdAt: new Date().toISOString(),
    }
    
    return walletAccount
  } catch (error) {
    throw new Error(`Không thể tạo ví mới: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function importWalletFromPrivateKey(privateKey: string, label?: string): WalletAccount {
  if (!privateKey || privateKey.trim() === '') {
    throw new Error('Private key không được để trống')
  }
  
  let normalizedPrivateKey = privateKey.trim()
  if (!normalizedPrivateKey.startsWith('0x')) {
    normalizedPrivateKey = '0x' + normalizedPrivateKey
  }
  
  if (normalizedPrivateKey.length !== 66) {
    throw new Error('Private key không hợp lệ. Phải có độ dài 64 ký tự hex (66 với 0x prefix)')
  }
  
  try {
    const wallet = new Wallet(normalizedPrivateKey)
    
    const walletAccount: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Imported wallet ${Date.now()}`,
      address: wallet.address,
      privateKey: normalizedPrivateKey,
      createdAt: new Date().toISOString(),
    }
    
    return walletAccount
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid private key') || error.message.includes('invalid length')) {
        throw new Error('Private key không hợp lệ. Vui lòng kiểm tra lại.')
      }
      throw new Error(`Không thể import ví: ${error.message}`)
    }
    throw new Error('Không thể import ví: Lỗi không xác định')
  }
}

export function validatePrivateKey(privateKey: string): boolean {
  if (!privateKey || privateKey.trim() === '') {
    return false
  }
  
  let normalized = privateKey.trim()
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized
  }
  
  if (normalized.length !== 66) {
    return false
  }
  
  const hexRegex = /^0x[0-9a-fA-F]{64}$/
  if (!hexRegex.test(normalized)) {
    return false
  }
  
  try {
    new Wallet(normalized)
    return true
  } catch {
    return false
  }
}

export async function createAndSaveWallet(label?: string): Promise<WalletAccount> {
  const wallet = createNewWallet(label)
  await saveWallet(wallet)
  return wallet
}

export function importWalletFromSeedPhrase(seedPhrase: string, label?: string): WalletAccount {
  if (!seedPhrase || seedPhrase.trim() === '') {
    throw new Error('Seed phrase không được để trống')
  }
  
  const normalizedSeedPhrase = seedPhrase.trim().replace(/\s+/g, ' ')
  
  const words = normalizedSeedPhrase.split(' ')
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Seed phrase không hợp lệ. Phải có 12 hoặc 24 từ')
  }
  
  try {
    const wallet = Wallet.fromPhrase(normalizedSeedPhrase)
    
    const walletAccount: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Imported wallet ${Date.now()}`,
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase: normalizedSeedPhrase,
      createdAt: new Date().toISOString(),
    }
    
    return walletAccount
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('invalid mnemonic') || error.message.includes('invalid phrase')) {
        throw new Error('Seed phrase không hợp lệ. Vui lòng kiểm tra lại.')
      }
      throw new Error(`Không thể import ví: ${error.message}`)
    }
    throw new Error('Không thể import ví: Lỗi không xác định')
  }
}

export function validateSeedPhrase(seedPhrase: string): boolean {
  if (!seedPhrase || seedPhrase.trim() === '') {
    return false
  }
  
  const normalized = seedPhrase.trim().replace(/\s+/g, ' ')
  const words = normalized.split(' ')
  
  if (words.length !== 12 && words.length !== 24) {
    return false
  }
  
  try {
    Wallet.fromPhrase(normalized)
    return true
  } catch {
    return false
  }
}

export async function importAndSaveWallet(privateKey: string, label?: string): Promise<WalletAccount> {
  const wallet = importWalletFromPrivateKey(privateKey, label)
  await saveWallet(wallet)
  return wallet
}

export async function importAndSaveWalletFromSeedPhrase(seedPhrase: string, label?: string): Promise<WalletAccount> {
  const wallet = importWalletFromSeedPhrase(seedPhrase, label)
  await saveWallet(wallet)
  return wallet
}

