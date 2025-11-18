import { useState, useEffect, useCallback } from 'react'
import type { Network } from '../types'
import { getWalletNativeBalance, getNetworkPulse } from '../services/testnet'

type BlockchainSnapshot = {
  blockNumber: number | null
  gasPrice: string | null
  baseFee: string | null
  nativeBalance: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  refresh: () => void
}

export function useBlockchainData(network: Network, address?: string): BlockchainSnapshot {
  const [blockNumber, setBlockNumber] = useState<number | null>(null)
  const [gasPrice, setGasPrice] = useState<string | null>(null)
  const [baseFee, setBaseFee] = useState<string | null>(null)
  const [nativeBalance, setNativeBalance] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchData = useCallback(async () => {
    if (!address) {
      setNativeBalance('0')
      setStatus('ready')
      return
    }

    setStatus('loading')
    setError(undefined)

    try {
      const [balance, pulse] = await Promise.all([
        getWalletNativeBalance(network, address),
        getNetworkPulse(network),
      ])
      
      setNativeBalance(balance)
      setBlockNumber(pulse.blockNumber)
      setGasPrice(pulse.gasPrice)
      setBaseFee(pulse.baseFee)
      setStatus('ready')
    } catch (err) {
      console.error('Error fetching blockchain data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
      setNativeBalance('0')
    }
  }, [network.id, network.rpc, address])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    blockNumber,
    gasPrice,
    baseFee,
    nativeBalance,
    status,
    error,
    refresh: fetchData,
  }
}

