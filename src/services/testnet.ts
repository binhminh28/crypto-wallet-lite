import { JsonRpcProvider, formatEther, getAddress, parseEther, Wallet } from 'ethers'
import type { Network, Token, TransactionDraft } from '../types'

const providerCache = new Map<string, JsonRpcProvider>()

function getProvider(network: Network): JsonRpcProvider {
  if (!providerCache.has(network.rpc)) {
    const provider = new JsonRpcProvider(
      network.rpc, 
      {
        chainId: Number(network.chainId),
        name: network.name
      }, 
      { 
        staticNetwork: true, // Ngăn ethers tự động query network ID (giảm request)
        batchMaxCount: 1 // Tắt batch để tránh lỗi RPC public
      }
    )
    providerCache.set(network.rpc, provider)
  }
  return providerCache.get(network.rpc)!
}

export async function getTokenHoldings(_network: Network, walletAddress?: string): Promise<Token[]> {
  if (!walletAddress) return []
  return []
}

export async function estimateGasFee(network: Network): Promise<string> {
  try {
    const provider = getProvider(network)
    const feeData = await provider.getFeeData()
    
    if (feeData.gasPrice) {
      return formatEther(feeData.gasPrice)
    }
    return '0.000021'
  } catch (error) {
    console.error('Error fetching gas fee:', error)
    return '0.000021'
  }
}

export async function getWalletNativeBalance(network: Network, address?: string): Promise<string> {
  if (!address) return '0'
  
  if (!address.startsWith('0x') || address.length !== 42) {
    console.error('Invalid address format:', address)
    return '0'
  }
  
  try {
    let normalizedAddress: string
    try {
      normalizedAddress = getAddress(address)
    } catch {
      normalizedAddress = address.toLowerCase()
    }
    
    const provider = getProvider(network)
    const balance = await provider.getBalance(normalizedAddress)
    return formatEther(balance)

  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return '0'
  }
}

export async function getNetworkPulse(network: Network) {
  try {
    const provider = getProvider(network)
    const blockNumber = await provider.getBlockNumber()
    const feeData = await provider.getFeeData()
    
    return {
      blockNumber,
      gasPrice: feeData.gasPrice ? formatEther(feeData.gasPrice) : '0.000000021',
      baseFee: feeData.maxFeePerGas ? formatEther(feeData.maxFeePerGas) : '0.000000021',
    }
  } catch (error) {
    return {
      blockNumber: 0,
      gasPrice: '0.000000021',
      baseFee: '0.000000021',
    }
  }
}

export async function sendNativeTransaction({
  network,
  draft,
  privateKey,
}: {
  network: Network
  draft: TransactionDraft
  privateKey: string
}) {
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
    
    // Lấy nonce và gas price
    const nonce = await provider.getTransactionCount(wallet.address, 'pending')
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || parseEther('0.00000005')
    
    // Hardcode gasLimit = 21000 cho native transfer (không cần estimateGas)
    const gasLimit = 21000n
    
    // Kiểm tra số dư
    const totalCost = amountInWei + (gasLimit * gasPrice)
    const balance = await provider.getBalance(wallet.address)
    
    if (balance < totalCost) {
      const missing = formatEther(totalCost - balance)
      throw new Error(`Số dư không đủ trả phí gas. Thiếu khoảng ${missing} ${network.badge}`)
    }
    
    const txRequest = {
      to: draft.to,
      value: amountInWei,
      gasLimit: gasLimit,
      gasPrice: gasPrice, 
      nonce: nonce,
      chainId: Number(network.chainId), 
      type: 0 
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
        throw new Error('RPC đang bận (429). Vui lòng đợi 30s rồi thử lại.')
      }
      if (msg.includes('insufficient funds')) {
        throw new Error('Số dư không đủ để thực hiện giao dịch.')
      }
      throw new Error(error.message)
    }
    throw new Error('Lỗi không xác định khi gửi giao dịch')
  }
}

export async function getTransactionHistory(network: Network, address: string, limit = 50) {
  if (!address) return []

  try {
    const baseUrl = 'https://api.etherscan.io/v2/api'
    
    if (!network.chainId) return []

    const params = new URLSearchParams({
      chainid: network.chainId.toString(),
      module: 'account',
      action: 'txlist',
      address: address,
      startblock: '0',
      endblock: '99999999',
      page: '1',
      offset: limit.toString(),
      sort: 'desc',
    })

    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY
    if (apiKey) params.append('apikey', apiKey)

    const response = await fetch(`${baseUrl}?${params.toString()}`)
    const data = await response.json()

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return []
    }

    const normalizedAddress = address.toLowerCase()

    return data.result
      .filter((tx: any) => tx.hash && tx.blockNumber && tx.timeStamp)
      .map((tx: any) => {
        const txFrom = tx.from?.toLowerCase() || ''
        const txTo = tx.to?.toLowerCase() || ''
        
        // Xác định status: nếu from = address hiện tại thì là sent, nếu to = address hiện tại thì là received
        const status = txFrom === normalizedAddress 
          ? ('sent' as const) 
          : txTo === normalizedAddress 
            ? ('received' as const)
            : ('sent' as const) // Fallback (không nên xảy ra)
        
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          timestamp: parseInt(tx.timeStamp) * 1000,
          blockNumber: parseInt(tx.blockNumber),
          status,
        }
      })
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return []
  }
}