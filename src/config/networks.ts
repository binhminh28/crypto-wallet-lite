import type { Network } from '../types'

export const defaultNetworks: Network[] = [
  {
    id: 'eth-sepolia',
    name: 'Ethereum Sepolia',
    chainId: '11155111',
    rpc: 'https://eth-sepolia.g.alchemy.com/v2/JHMPq2BwZMBC983UnVbyF',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  },
  {
    id: 'poly-amoy',
    name: 'Polygon Amoy',
    chainId: '80002',
    rpc: import.meta.env.VITE_RPC_AMOY || 'https://rpc-amoy.polygon.technology',
    explorer: 'https://www.oklink.com/amoy',
    badge: 'POL',
  },
  {
    id: 'base-sepolia',
    name: 'Base Sepolia',
    chainId: '84532',
    rpc: import.meta.env.VITE_RPC_BASE_SEPOLIA || 'https://sepolia.base.org',
    explorer: 'https://sepolia-explorer.base.org',
    badge: 'BASE',
  },
]

