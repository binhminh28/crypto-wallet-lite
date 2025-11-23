import type { Network, Token } from '../types'

export function getTokenPrice(token: Token, network: Network): number {
  if (token.symbol === network.badge) {
    const priceMap: Record<string, number> = {
      'eth-sepolia': 3000,
      'poly-amoy': 0.5,
      'base-sepolia': 3000,
    }
    return priceMap[network.id] || 0
  }
  
  return 0
}

export function calculateTokenUsd(token: Token, network: Network): number {
  if (!token.balance || token.balance <= 0) return 0
  
  const price = getTokenPrice(token, network)
  return token.balance * price
}

export function getTokenColor(token: Token, network: Network): string {
  if (token.symbol === network.badge) {
    const colorMap: Record<string, string> = {
      'eth-sepolia': 'from-cyan-300 to-blue-500',
      'poly-amoy': 'from-purple-300 to-indigo-500',
      'base-sepolia': 'from-sky-300 to-blue-500',
    }
    return colorMap[network.id] || 'from-cyan-300 to-blue-500'
  }
  
  return 'from-gray-300 to-gray-500'
}

