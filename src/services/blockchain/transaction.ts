import { formatEther, getAddress, parseEther, Wallet } from 'ethers'
import type { Network, TransactionDraft } from '../../types'
import { RpcError, getErrorMessage } from '../../lib/errors'
import { TX_DEFAULTS } from '../../config/constants'
import { getProvider } from './rpc'

export interface TransactionResult {
  hash: string
  from: string
  to: string
  value: string
  network: string
  blockNumber: number
  status: 'success'
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
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || parseEther(TX_DEFAULTS.DEFAULT_GAS_PRICE)
    const gasLimit = TX_DEFAULTS.GAS_LIMIT

    const totalCost = amountInWei + (gasLimit * gasPrice)
    const balance = await provider.getBalance(wallet.address)

    if (balance < totalCost) {
      const missing = formatEther(totalCost - balance)
      throw new Error(`Số dư không đủ trả phí gas. Thiếu khoảng ${missing} ${network.badge}`)
    }

    const txRequest = {
      to: draft.to,
      value: amountInWei,
      gasLimit,
      gasPrice,
      nonce,
      chainId: Number(network.chainId),
      type: 0,
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

