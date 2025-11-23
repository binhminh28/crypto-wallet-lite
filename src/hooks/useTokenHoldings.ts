import { useEffect, useState, useMemo } from 'react'
import type { Network, Token } from '../types'
import { getErrorMessage } from '../lib/errors'

async function getTokenHoldings(_network: Network, _walletAddress?: string): Promise<Token[]> {
  return []
}

export function useTokenHoldings(network: Network, walletAddress?: string, nativeBalance?: string | null) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!walletAddress) {
      setTokens([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchTokens() {
      setLoading(true)
      setError(null)
      try {
        const result = await getTokenHoldings(network, walletAddress)
        if (!cancelled) {
          setTokens(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err))
          setTokens([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchTokens()

    return () => {
      cancelled = true
    }
  }, [network.id, walletAddress])

  const tokensWithNative = useMemo(() => {
    const result = [...tokens]
    
    if (nativeBalance && nativeBalance !== '0' && walletAddress) {
      const balanceNum = parseFloat(nativeBalance)
      if (!isNaN(balanceNum) && balanceNum > 0) {
        const nativeToken: Token = {
          symbol: network.badge,
          name: network.name === 'Ethereum Sepolia' ? 'Ether' : 
                network.name === 'Polygon Amoy' ? 'Polygon' : 
                network.name === 'Base Sepolia' ? 'Ether' : 'Native Token',
          balance: balanceNum,
        }
        result.unshift(nativeToken)
      }
    }
    
    return result
  }, [tokens, nativeBalance, network, walletAddress])

  return { tokens: tokensWithNative, loading, error }
}


