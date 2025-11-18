import { useState } from 'react'
import type { Activity, Network, TransactionDraft, WalletAccount } from '../types'
import { shorten } from '../utils/format'

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
      id: txHash || crypto.randomUUID(),
      title: `Sent ${draft.amount} ${network.badge}`,
      detail: `${shorten(from.address)} → ${shorten(draft.to)} · ${draft.note || 'Không ghi chú'}`,
      timestamp: 'Vừa xong',
      status: 'sent',
    }
    setActivity((prev) => [entry, ...prev])
    return entry
  }

  return { activity, recordTransaction }
}

