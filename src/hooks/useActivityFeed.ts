import { useState } from 'react'
import type { Activity, Network, TransactionDraft, WalletAccount } from '../types'
import { relativeTimeFromNow } from '../utils/format'

type ActivityFeedOptions = {
  initialActivity: Activity[]
}

export function useActivityFeed({ initialActivity }: ActivityFeedOptions) {
  const [activity, setActivity] = useState<Activity[]>(initialActivity)

  const recordTransaction = ({
    from,
    draft,
    network,
    txHash,
  }: {
    from: WalletAccount
    draft: TransactionDraft
    network: Network
    txHash?: string
  }) => {
    if (!draft.to || !draft.amount) {
      throw new Error('Thiếu địa chỉ nhận hoặc số lượng')
    }

    const entry: Activity = {
      id: txHash || crypto.randomUUID(), // Dùng txHash nếu có (real transaction)
      title: `Sent ${draft.amount} ${network.badge}`,
      detail: `${shorten(from.address)} → ${shorten(draft.to)} · ${draft.note || 'Không ghi chú'}`,
      timestamp: 'Vừa xong',
      status: 'sent',
    }
    setActivity((prev) => [entry, ...prev])
    return entry
  }

  const recordFaucetClaim = (networkName: string, amount: string) => {
    const entry: Activity = {
      id: crypto.randomUUID(),
      title: `Claim faucet ${amount}`,
      detail: `${networkName} faucet helper`,
      timestamp: 'Vừa xong',
      status: 'faucet',
    }
    setActivity((prev) => [entry, ...prev])
    return entry
  }

  const refreshTimestamps = () => {
    setActivity((prev) =>
      prev.map((entry) => {
        if (entry.timestamp === 'Vừa xong') return entry
        return { ...entry, timestamp: relativeTimeFromNow(new Date()) }
      }),
    )
  }

  return { activity, recordTransaction, recordFaucetClaim, refreshTimestamps }
}

function shorten(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

