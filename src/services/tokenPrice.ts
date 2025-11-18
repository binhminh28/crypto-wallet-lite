import type { Network, Token } from '../types'

/**
 * Lấy giá USD của token theo symbol hoặc network
 * Trên testnet, giá trị này chỉ mang tính chất tham khảo/giả lập
 */
export function getTokenPrice(token: Token, network: Network): number {
  // Giá mock cho testnet (giá trị tham khảo)
  // Trong production, có thể fetch từ API như CoinGecko, CoinMarketCap, etc.
  
  // Nếu là native token (symbol trùng với network badge)
  if (token.symbol === network.badge) {
    const priceMap: Record<string, number> = {
      'eth-sepolia': 3000, // ETH price (USD)
      'poly-amoy': 0.5, // POL price (USD)
      'base-sepolia': 3000, // Base Sepolia dùng ETH, giá tương tự ETH
    }
    return priceMap[network.id] || 0
  }
  
  // Có thể mở rộng để lấy giá của các token khác (USDC, USDT, etc.)
  // Hiện tại trả về 0 cho các token khác
  return 0
}

/**
 * Tính giá trị USD của token
 */
export function calculateTokenUsd(token: Token, network: Network): number {
  if (!token.balance || token.balance <= 0) return 0
  
  const price = getTokenPrice(token, network)
  return token.balance * price
}

/**
 * Lấy màu gradient cho token (UI concern)
 */
export function getTokenColor(token: Token, network: Network): string {
  // Nếu là native token
  if (token.symbol === network.badge) {
    const colorMap: Record<string, string> = {
      'eth-sepolia': 'from-cyan-300 to-blue-500',
      'poly-amoy': 'from-purple-300 to-indigo-500',
      'base-sepolia': 'from-sky-300 to-blue-500',
    }
    return colorMap[network.id] || 'from-cyan-300 to-blue-500'
  }
  
  // Có thể mở rộng cho các token khác
  return 'from-gray-300 to-gray-500'
}

