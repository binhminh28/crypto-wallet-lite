import { Wallet } from 'ethers'
import type { WalletSecrets } from '../../types'
import { WalletError, ValidationError } from '../../lib/errors'
import { PRIVATE_KEY, SEED_PHRASE } from '../../config/constants'

export function createNewWallet(): WalletSecrets {
  try {
    const wallet = Wallet.createRandom()
    const seedPhrase = wallet.mnemonic?.phrase || undefined

    const walletSecrets: WalletSecrets = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase,
    }

    return walletSecrets
  } catch (error) {
    throw new WalletError(
      `Không thể tạo ví mới: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

export function importWalletFromPrivateKey(
  privateKey: string,
  label?: string
): WalletSecrets {
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

    const walletSecrets: WalletSecrets = {
      address: wallet.address,
      privateKey: normalizedPrivateKey,
    }

    return walletSecrets
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
): WalletSecrets {
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

    const walletSecrets: WalletSecrets = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      seedPhrase: normalizedSeedPhrase,
    }

    return walletSecrets
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
