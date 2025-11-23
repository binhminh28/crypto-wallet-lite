export type Network = {
  id: string
  name: string
  chainId: string
  rpc: string
  explorer: string
  badge: string
}

export type Token = {
  symbol: string
  name: string
  balance: number
}

export type ActivityStatus = 'sent' | 'received'

export type Activity = {
  id: string
  title: string
  detail: string
  timestamp: string
  status: ActivityStatus
}

export type WalletAccount = {
  id: string
  label: string
  address: string
  privateKey: string
  seedPhrase?: string
  createdAt: string
}

export type TransactionDraft = {
  to: string
  amount: string
  note: string
}

