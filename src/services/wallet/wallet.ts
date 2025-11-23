import { Wallet } from 'ethers'
import type { WalletAccount } from '../../types'
import { WalletError, ValidationError } from '../../lib/errors'
import { PRIVATE_KEY, SEED_PHRASE } from '../../config/constants'
import { saveWallet } from './storage'

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
    throw new WalletError(
      `Không thể tạo ví mới: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export function importWalletFromPrivateKey(
  privateKey: string,
  label?: string
): WalletAccount {
  if (!privateKey || privateKey.trim() === '') {
    throw new ValidationError('Private key không được để trống', 'privateKey')
  }

  let normalizedPrivateKey = privateKey.trim()
  if (!normalizedPrivateKey.startsWith(PRIVATE_KEY.PREFIX)) {
    normalizedPrivateKey = PRIVATE_KEY.PREFIX + normalizedPrivateKey
  }

  if (normalizedPrivateKey.length !== PRIVATE_KEY.LENGTH) {
    throw new ValidationError(
      'Private key không hợp lệ. Phải có độ dài 64 ký tự hex (66 với 0x prefix)',
      'privateKey'
    )
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
      if (
        error.message.includes('invalid private key') ||
        error.message.includes('invalid length')
      ) {
        throw new ValidationError('Private key không hợp lệ. Vui lòng kiểm tra lại.', 'privateKey')
      }
      throw new WalletError(`Không thể import ví: ${error.message}`)
    }
    throw new WalletError('Không thể import ví: Lỗi không xác định')
  }
}

export function importWalletFromSeedPhrase(
  seedPhrase: string,
  label?: string
): WalletAccount {
  if (!seedPhrase || seedPhrase.trim() === '') {
    throw new ValidationError('Seed phrase không được để trống', 'seedPhrase')
  }

  const normalizedSeedPhrase = seedPhrase.trim().replace(/\s+/g, ' ')
  const words = normalizedSeedPhrase.split(' ')

  if (!SEED_PHRASE.WORD_COUNT_OPTIONS.includes(words.length as 12 | 24)) {
    throw new ValidationError(
      'Seed phrase không hợp lệ. Phải có 12 hoặc 24 từ',
      'seedPhrase'
    )
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
      if (
        error.message.includes('invalid mnemonic') ||
        error.message.includes('invalid phrase')
      ) {
        throw new ValidationError('Seed phrase không hợp lệ. Vui lòng kiểm tra lại.', 'seedPhrase')
      }
      throw new WalletError(`Không thể import ví: ${error.message}`)
    }
    throw new WalletError('Không thể import ví: Lỗi không xác định')
  }
}

export function validatePrivateKey(privateKey: string): boolean {
  if (!privateKey || privateKey.trim() === '') {
    return false
  }

  let normalized = privateKey.trim()
  if (!normalized.startsWith(PRIVATE_KEY.PREFIX)) {
    normalized = PRIVATE_KEY.PREFIX + normalized
  }

  if (normalized.length !== PRIVATE_KEY.LENGTH) {
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

export function validateSeedPhrase(seedPhrase: string): boolean {
  if (!seedPhrase || seedPhrase.trim() === '') {
    return false
  }

  const normalized = seedPhrase.trim().replace(/\s+/g, ' ')
  const words = normalized.split(' ')

  if (!SEED_PHRASE.WORD_COUNT_OPTIONS.includes(words.length as 12 | 24)) {
    return false
  }

  try {
    Wallet.fromPhrase(normalized)
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

export async function importAndSaveWallet(
  privateKey: string,
  label?: string
): Promise<WalletAccount> {
  const wallet = importWalletFromPrivateKey(privateKey, label)
  await saveWallet(wallet)
  return wallet
}

export async function importAndSaveWalletFromSeedPhrase(
  seedPhrase: string,
  label?: string
): Promise<WalletAccount> {
  const wallet = importWalletFromSeedPhrase(seedPhrase, label)
  await saveWallet(wallet)
  return wallet
}

