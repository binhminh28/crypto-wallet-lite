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

export type ActivityStatus = 'sent' | 'received' | 'learn' | 'faucet'

export type Activity = {
  id: string
  title: string
  detail: string
  timestamp: string
  status: ActivityStatus
}

export type Lesson = {
  id: string
  title: string
  caption: string
  duration: string
  status: 'locked' | 'in-progress' | 'done'
}

export type FaucetTip = {
  id: string
  network: string
  url: string
  note: string
}

export type Web3Snippet = {
  id: string
  title: string
  code: string
}

export type WalletAccount = {
  id: string
  label: string
  address: string
  privateKey: string
  createdAt: string
}

export type TransactionDraft = {
  to: string
  amount: string
  note: string
}

