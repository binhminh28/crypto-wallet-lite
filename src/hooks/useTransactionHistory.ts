import { useEffect, useState } from 'react'
import { formatEther } from 'ethers'
import type { Activity, Network } from '../types'
import { getTransactionHistory, type TransactionHistoryItem } from '../services/blockchain/explorer'
import { getErrorMessage } from '../lib/errors'
import { shorten } from '../utils/format'

export function useTransactionHistory(network: Network, walletAddress?: string, limit = 10) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    if (!walletAddress) {
      setActivities([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const history = await getTransactionHistory(network, walletAddress, limit)
      
      const activities: Activity[] = history.map((tx: TransactionHistoryItem) => {
        const valueInEth = formatEther(tx.value || '0')
        const value = parseFloat(valueInEth).toFixed(6)
        
        return {
          id: tx.hash,
          title: tx.status === 'sent'
            ? `Sent ${value} ${network.badge}`
            : `Received ${value} ${network.badge}`,
          detail: `${shorten(tx.from)} → ${shorten(tx.to)}`,
          timestamp: formatTimestamp(tx.timestamp),
          status: tx.status,
        }
      })
      
      setActivities(activities)
    } catch (err) {
      setError(getErrorMessage(err))
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [network.id, walletAddress, limit])

  const refresh = () => {
    fetchHistory()
  }

  return { activities, loading, error, refresh }
}

function formatTimestamp(timestamp: number) {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (hours < 24) return `${hours} giờ trước`
  return `${days} ngày trước`
}


