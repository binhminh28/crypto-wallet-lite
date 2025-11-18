import { JsonRpcProvider, formatEther, getAddress } from 'ethers'
import type { Network, Token, TransactionDraft } from '../types'

// Cache provider instances để tránh tạo lại và giảm số lượng request
const providerCache = new Map<string, JsonRpcProvider>()

function getProvider(rpcUrl: string): JsonRpcProvider {
  if (!providerCache.has(rpcUrl)) {
    // Tạo provider mới và disable auto-detect network để tránh thêm request
    const provider = new JsonRpcProvider(rpcUrl)
    providerCache.set(rpcUrl, provider)
  }
  return providerCache.get(rpcUrl)!
}

export async function getTokenHoldings(_network: Network, walletAddress?: string): Promise<Token[]> {
  if (!walletAddress) return []
  // Trả về empty array - sẽ được implement sau để fetch từ blockchain
  return []
}

export async function estimateGasFee(network: Network): Promise<string> {
  try {
    const provider = getProvider(network.rpc)
    const feeData = await provider.getFeeData()
    
    // Trả về gas price dưới dạng ETH (đã format)
    if (feeData.gasPrice) {
      return formatEther(feeData.gasPrice)
    }
    
    // Fallback về giá trị default nếu không lấy được
    return '0.000021'
  } catch (error) {
    console.error('Error fetching gas fee:', error)
    // Trả về giá trị default nếu có lỗi
    return '0.000021'
  }
}

export async function getWalletNativeBalance(network: Network, address?: string): Promise<string> {
  if (!address) return '0'
  
  // Validate địa chỉ cơ bản
  if (!address.startsWith('0x') || address.length !== 42) {
    console.error('Invalid address format:', address)
    return '0'
  }
  
  try {
    // Normalize địa chỉ để có checksum đúng trước khi query
    // getAddress() sẽ tự động sửa checksum nếu có thể
    let normalizedAddress: string
    try {
      normalizedAddress = getAddress(address)
    } catch {
      // Nếu getAddress fail, thử với lowercase
      normalizedAddress = address.toLowerCase()
    }
    
    // Sử dụng cached provider
    const provider = getProvider(network.rpc)
    
    // Lấy số dư từ blockchain (trả về BigInt trong wei)
    const balance = await provider.getBalance(normalizedAddress)
    
    // Chuyển đổi từ wei sang ETH (hoặc native token)
    const balanceInEther = formatEther(balance)
    
    return balanceInEther
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    
    // Nếu vẫn lỗi, thử lại với địa chỉ lowercase trực tiếp
    if (error instanceof Error && error.message.includes('bad address checksum')) {
      try {
        const lowerAddress = address.toLowerCase()
        const provider = getProvider(network.rpc)
        const balance = await provider.getBalance(lowerAddress)
        return formatEther(balance)
      } catch (retryError) {
        console.error('Error fetching wallet balance (retry failed):', retryError)
        return '0'
      }
    }
    
    // Trả về '0' nếu có lỗi
    return '0'
  }
}

export async function getNetworkPulse(network: Network) {
  try {
    const provider = getProvider(network.rpc)
    // Gọi song song để tối ưu
    const [blockNumber, feeData] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData(),
    ])
    
    return {
      blockNumber,
      gasPrice: feeData.gasPrice ? formatEther(feeData.gasPrice) : '0.000000021',
      baseFee: feeData.maxFeePerGas ? formatEther(feeData.maxFeePerGas) : '0.000000021',
    }
  } catch (error) {
    console.error('Error fetching network pulse:', error)
    // Trả về giá trị default nếu có lỗi
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
    const { Wallet } = await import('ethers')
    const provider = getProvider(network.rpc)
    const wallet = new Wallet(privateKey, provider)
    
    // Parse amount từ string sang BigInt (wei)
    const amountInWei = BigInt(Math.floor(parseFloat(draft.amount) * 1e18))
    
    // Gửi transaction
    const tx = await wallet.sendTransaction({
      to: draft.to,
      value: amountInWei,
    })
    
    // Đợi transaction được mine
    const receipt = await tx.wait()
    
    return {
      hash: tx.hash,
      from: wallet.address,
      to: draft.to,
      value: draft.amount,
      network: network.name,
      blockNumber: receipt?.blockNumber || 0,
      status: receipt?.status === 1 ? 'success' as const : 'failed' as const,
    }
  } catch (error) {
    console.error('Error sending transaction:', error)
    throw new Error(`Không thể gửi giao dịch: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


export async function getTransactionHistory(network: Network, address: string, limit = 50) {
  if (!address) return []

  try {
    // Etherscan API V2 - unified endpoint với chainid
    const baseUrl = 'https://api.etherscan.io/v2/api'
    
    // Sử dụng chainId từ network object
    if (!network.chainId) {
      console.warn(`No chain ID for network: ${network.id}`)
      return []
    }

    const params = new URLSearchParams({
      chainid: network.chainId,
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
    if (apiKey) {
      params.append('apikey', apiKey)
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`)
    const data = await response.json()

    if (data.status !== '1' || !Array.isArray(data.result)) {
      if (data.message === 'No transactions found') {
        return []
      }
      console.error('Explorer API error:', data.message || data.result)
      return []
    }

    const normalizedAddress = address.toLowerCase()

    return data.result
      .filter((tx: any) => tx.hash && tx.blockNumber && tx.timeStamp)
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: parseInt(tx.timeStamp) * 1000,
        blockNumber: parseInt(tx.blockNumber),
        status: tx.from.toLowerCase() === normalizedAddress ? ('sent' as const) : ('received' as const),
      }))
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return []
  }
}
