import { Wallet } from 'ethers'
import type { WalletAccount } from '../types'
import { saveWallet } from './walletStorage'

/**
 * Tạo ví mới sử dụng ethers.js
 * @param label - Tên nhãn cho ví (tùy chọn)
 * @returns WalletAccount object với address và privateKey
 */
export function createNewWallet(label?: string): WalletAccount {
  try {
    // Tạo wallet mới ngẫu nhiên bằng ethers.js
    const wallet = Wallet.createRandom()
    
    const walletAccount: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Ví mới ${Date.now()}`,
      address: wallet.address, // Địa chỉ đã có checksum đúng
      privateKey: wallet.privateKey, // Private key dạng hex với 0x prefix
      createdAt: new Date().toISOString(),
    }
    
    return walletAccount
  } catch (error) {
    throw new Error(`Không thể tạo ví mới: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Import ví từ private key sử dụng ethers.js
 * @param privateKey - Private key của ví (có thể có hoặc không có 0x prefix)
 * @param label - Tên nhãn cho ví (tùy chọn)
 * @returns WalletAccount object với address và privateKey
 */
export function importWalletFromPrivateKey(privateKey: string, label?: string): WalletAccount {
  if (!privateKey || privateKey.trim() === '') {
    throw new Error('Private key không được để trống')
  }
  
  // Chuẩn hóa private key (thêm 0x nếu chưa có)
  let normalizedPrivateKey = privateKey.trim()
  if (!normalizedPrivateKey.startsWith('0x')) {
    normalizedPrivateKey = '0x' + normalizedPrivateKey
  }
  
  // Validate độ dài private key (phải là 66 ký tự với 0x prefix = 64 hex chars)
  if (normalizedPrivateKey.length !== 66) {
    throw new Error('Private key không hợp lệ. Phải có độ dài 64 ký tự hex (66 với 0x prefix)')
  }
  
  try {
    // Tạo wallet từ private key bằng ethers.js
    // ethers.js sẽ tự động validate private key
    const wallet = new Wallet(normalizedPrivateKey)
    
    const walletAccount: WalletAccount = {
      id: crypto.randomUUID(),
      label: label || `Imported wallet ${Date.now()}`,
      address: wallet.address, // Địa chỉ đã có checksum đúng từ ethers.js
      privateKey: normalizedPrivateKey, // Lưu private key đã được chuẩn hóa
      createdAt: new Date().toISOString(),
    }
    
    return walletAccount
  } catch (error) {
    // Xử lý các lỗi từ ethers.js
    if (error instanceof Error) {
      if (error.message.includes('invalid private key') || error.message.includes('invalid length')) {
        throw new Error('Private key không hợp lệ. Vui lòng kiểm tra lại.')
      }
      throw new Error(`Không thể import ví: ${error.message}`)
    }
    throw new Error('Không thể import ví: Lỗi không xác định')
  }
}

/**
 * Validate private key format (không tạo wallet, chỉ kiểm tra)
 * @param privateKey - Private key cần validate
 * @returns true nếu hợp lệ, false nếu không hợp lệ
 */
export function validatePrivateKey(privateKey: string): boolean {
  if (!privateKey || privateKey.trim() === '') {
    return false
  }
  
  let normalized = privateKey.trim()
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized
  }
  
  // Kiểm tra độ dài
  if (normalized.length !== 66) {
    return false
  }
  
  // Kiểm tra format hex
  const hexRegex = /^0x[0-9a-fA-F]{64}$/
  if (!hexRegex.test(normalized)) {
    return false
  }
  
  // Thử tạo wallet để validate thực sự
  try {
    new Wallet(normalized)
    return true
  } catch {
    return false
  }
}

/**
 * Tạo ví mới và lưu vào IndexedDB
 * @param label - Tên nhãn cho ví (tùy chọn)
 * @returns WalletAccount đã được lưu
 */
export async function createAndSaveWallet(label?: string): Promise<WalletAccount> {
  const wallet = createNewWallet(label)
  await saveWallet(wallet)
  return wallet
}

/**
 * Import ví từ private key và lưu vào IndexedDB
 * @param privateKey - Private key của ví
 * @param label - Tên nhãn cho ví (tùy chọn)
 * @returns WalletAccount đã được lưu
 */
export async function importAndSaveWallet(privateKey: string, label?: string): Promise<WalletAccount> {
  const wallet = importWalletFromPrivateKey(privateKey, label)
  await saveWallet(wallet)
  return wallet
}

