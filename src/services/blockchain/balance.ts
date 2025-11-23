import { formatEther, getAddress } from 'ethers'
import type { Network } from '../../types'
import { ADDRESS } from '../../config/constants'
import { getProvider } from './rpc'

export async function getWalletNativeBalance(
  network: Network,
  address?: string
): Promise<string> {
  if (!address) return '0'

  if (!address.startsWith(ADDRESS.PREFIX) || address.length !== ADDRESS.LENGTH) {
    return '0'
  }

  try {
    let normalizedAddress: string
    try {
      normalizedAddress = getAddress(address)
    } catch {
      normalizedAddress = address.toLowerCase()
    }

    const provider = getProvider(network)
    const balance = await provider.getBalance(normalizedAddress)
    return formatEther(balance)
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return '0'
  }
}

export async function getNetworkPulse(network: Network) {
  try {
    const provider = getProvider(network)
    const blockNumber = await provider.getBlockNumber()
    const feeData = await provider.getFeeData()

    return {
      blockNumber,
      gasPrice: feeData.gasPrice ? formatEther(feeData.gasPrice) : '0.000000021',
      baseFee: feeData.maxFeePerGas ? formatEther(feeData.maxFeePerGas) : '0.000000021',
    }
  } catch (error) {
    console.error('Error fetching network pulse:', error)
    return {
      blockNumber: 0,
      gasPrice: '0.000000021',
      baseFee: '0.000000021',
    }
  }
}

