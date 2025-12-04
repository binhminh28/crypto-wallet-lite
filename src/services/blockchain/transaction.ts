import { formatEther, getAddress, parseEther, Wallet } from 'ethers'
import type { Network, TransactionDraft } from '../../types'
import { RpcError, getErrorMessage } from '../../lib/errors'
import { TX_DEFAULTS } from '../../config/constants'
import { getProvider } from './rpc'
import {
  estimateOptimalGas,
  TransactionType,
  compareGasCosts,
  formatGasEstimate,
  type GasEstimate,
} from './gas-optimizer'

export interface TransactionResult {
  hash: string
  from: string
  to: string
  value: string
  network: string
  blockNumber: number
  status: 'success'
  gasUsed?: GasEstimate
}

export async function sendNativeTransaction({
  network,
  draft,
  privateKey,
}: {
  network: Network
  draft: TransactionDraft
  privateKey: string
}): Promise<TransactionResult> {
  if (!draft.to || !draft.amount) {
    throw new Error('Thiếu địa chỉ nhận hoặc số lượng')
  }

  try {
    const provider = getProvider(network)
    const wallet = new Wallet(privateKey, provider)

    try {
      getAddress(draft.to)
    } catch {
      throw new Error('Địa chỉ nhận không hợp lệ')
    }

    const amountInWei = parseEther(draft.amount)
    const nonce = await provider.getTransactionCount(wallet.address, 'pending')

    // === TỐI ƯU HÓA GAS ===
    // Sử dụng gas optimizer để ước tính phí tối ưu
    const gasEstimate = await estimateOptimalGas(
      network,
      wallet.address,
      draft.to,
      amountInWei,
      { speed: 'standard' } // Có thể thay đổi thành 'slow' hoặc 'fast'
    )

    // Kiểm tra số dư có đủ không (bao gồm cả phí gas)
    const totalCost = amountInWei + gasEstimate.estimatedCost
    const balance = await provider.getBalance(wallet.address)

    if (balance < totalCost) {
      const missing = formatEther(totalCost - balance)
      throw new Error(`Số dư không đủ trả phí gas. Thiếu khoảng ${missing} ${network.badge}`)
    }

    // Xây dựng giao dịch dựa trên loại transaction
    let txRequest: any

    if (gasEstimate.type === TransactionType.EIP1559) {
      // EIP-1559: Sử dụng maxFeePerGas và maxPriorityFeePerGas
      txRequest = {
        to: draft.to,
        value: amountInWei,
        gasLimit: gasEstimate.gasLimit,
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
        nonce,
        chainId: Number(network.chainId),
        type: TransactionType.EIP1559,
      }
    } else {
      // Legacy: Sử dụng gasPrice đơn giản
      txRequest = {
        to: draft.to,
        value: amountInWei,
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice,
        nonce,
        chainId: Number(network.chainId),
        type: TransactionType.LEGACY,
      }
    }

    const tx = await wallet.sendTransaction(txRequest)

    return {
      hash: tx.hash,
      from: wallet.address,
      to: draft.to,
      value: draft.amount,
      network: network.name,
      blockNumber: 0,
      status: 'success' as const,
      gasUsed: gasEstimate,
    }
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('429') || msg.includes('too many requests')) {
        throw new RpcError('RPC đang bận (429). Vui lòng đợi 30s rồi thử lại.', 429)
      }
      if (msg.includes('insufficient funds')) {
        throw new RpcError('Số dư không đủ để thực hiện giao dịch.', 'INSUFFICIENT_FUNDS')
      }
      throw new RpcError(getErrorMessage(error))
    }
    throw new RpcError('Lỗi không xác định khi gửi giao dịch')
  }
}

/**
 * Xem trước ước tính phí gas cho giao dịch
 * Hữu ích để hiển thị cho người dùng trước khi gửi
 */
export async function previewTransactionGas({
  network,
  from,
  draft,
}: {
  network: Network
  from: string
  draft: TransactionDraft
}): Promise<{
  slow: ReturnType<typeof formatGasEstimate>
  standard: ReturnType<typeof formatGasEstimate>
  fast: ReturnType<typeof formatGasEstimate>
}> {
  if (!draft.to || !draft.amount) {
    throw new Error('Thiếu địa chỉ nhận hoặc số lượng')
  }

  try {
    getAddress(draft.to)
  } catch {
    throw new Error('Địa chỉ nhận không hợp lệ')
  }

  const amountInWei = parseEther(draft.amount)
  const estimates = await compareGasCosts(network, from, draft.to, amountInWei)

  return {
    slow: formatGasEstimate(estimates.slow),
    standard: formatGasEstimate(estimates.standard),
    fast: formatGasEstimate(estimates.fast),
  }
}


