import { apiClient } from '../../lib/api-client'
import { ApiError } from '../../lib/errors'
import { API_CONFIG, EXPLORER_API, PAGINATION } from '../../config/constants'
import type { Network } from '../../types'

export interface TransactionHistoryItem {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  blockNumber: number
  status: 'sent' | 'received'
}

interface EtherscanResponse {
  status: string
  message?: string
  result?: EtherscanTransaction[]
}

interface EtherscanTransaction {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  blockNumber: string
}

export async function getTransactionHistory(
  network: Network,
  address: string,
  limit: number = PAGINATION.DEFAULT_LIMIT
): Promise<TransactionHistoryItem[]> {
  if (!address) return []
  if (!network.chainId) return []

  try {
    const params = new URLSearchParams({
      chainid: network.chainId.toString(),
      module: 'account',
      action: 'txlist',
      address: address,
      startblock: EXPLORER_API.DEFAULT_START_BLOCK,
      endblock: EXPLORER_API.DEFAULT_END_BLOCK,
      page: PAGINATION.DEFAULT_PAGE.toString(),
      offset: limit.toString(),
      sort: EXPLORER_API.SORT_DESC,
    })

    const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY
    if (apiKey) {
      params.append('apikey', apiKey)
    }

    const response = await apiClient.get<EtherscanResponse>(
      `${API_CONFIG.ETHERSCAN_BASE_URL}?${params.toString()}`
    )

    const data = response.data

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return []
    }

    const normalizedAddress = address.toLowerCase()

    return data.result
      .filter((tx) => tx.hash && tx.blockNumber && tx.timeStamp)
      .map((tx) => {
        const txFrom = tx.from?.toLowerCase() || ''
        const txTo = tx.to?.toLowerCase() || ''

        const status: 'sent' | 'received' =
          txFrom === normalizedAddress
            ? 'sent'
            : txTo === normalizedAddress
              ? 'received'
              : 'sent'

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
    if (error instanceof ApiError) {
      console.error('Error fetching transaction history:', error)
      return []
    }
    throw error
  }
}

