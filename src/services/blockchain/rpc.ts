import { JsonRpcProvider } from 'ethers'
import type { Network } from '../../types'

const providerCache = new Map<string, JsonRpcProvider>()

export function getProvider(network: Network): JsonRpcProvider {
  if (!providerCache.has(network.rpc)) {
    const provider = new JsonRpcProvider(
      network.rpc,
      {
        chainId: Number(network.chainId),
        name: network.name,
      },
      {
        staticNetwork: true,
        batchMaxCount: 1,
      }
    )
    providerCache.set(network.rpc, provider)
  }
  return providerCache.get(network.rpc)!
}

export function clearProviderCache(): void {
  providerCache.clear()
}

