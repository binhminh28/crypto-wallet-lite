import { formatUnits, parseUnits } from 'ethers'
import type { Network } from '../../types'
import { getProvider } from './rpc'

/**
 * Loại giao dịch Ethereum
 * Type 0: Legacy (trước EIP-1559)
 * Type 2: EIP-1559 (hỗ trợ maxFeePerGas và maxPriorityFeePerGas)
 */
export enum TransactionType {
  LEGACY = 0,
  EIP1559 = 2,
}

export interface GasEstimate {
  gasLimit: bigint
  gasPrice?: bigint // Dùng cho Legacy (Type 0)
  maxFeePerGas?: bigint // Dùng cho EIP-1559 (Type 2)
  maxPriorityFeePerGas?: bigint // Dùng cho EIP-1559 (Type 2)
  estimatedCost: bigint
  type: TransactionType
}

export interface GasOptions {
  speed?: 'slow' | 'standard' | 'fast'
  forceType?: TransactionType
}

/**
 * Ước tính phí gas tối ưu cho giao dịch
 * Hỗ trợ cả Legacy và EIP-1559
 */
export async function estimateOptimalGas(
  network: Network,
  from: string,
  to: string,
  value: bigint,
  options: GasOptions = {}
): Promise<GasEstimate> {
  const provider = getProvider(network)
  const { speed = 'standard', forceType } = options

  // 1. Ước tính gas limit
  const gasLimit = await estimateGasLimit(provider, from, to, value)

  // 2. Lấy thông tin phí từ mạng
  const feeData = await provider.getFeeData()

  // 3. Xác định loại giao dịch
  const supportsEIP1559 = feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null
  const txType = forceType ?? (supportsEIP1559 ? TransactionType.EIP1559 : TransactionType.LEGACY)

  if (txType === TransactionType.EIP1559 && supportsEIP1559) {
    // Sử dụng EIP-1559 (tối ưu hơn cho Ethereum mainnet và một số testnet)
    const baseMaxPriorityFee = feeData.maxPriorityFeePerGas!
    const baseMaxFee = feeData.maxFeePerGas!

    // Điều chỉnh phí theo tốc độ mong muốn
    const multiplier = getSpeedMultiplier(speed)
    const maxPriorityFeePerGas = (baseMaxPriorityFee * BigInt(Math.floor(multiplier * 100))) / 100n
    const maxFeePerGas = (baseMaxFee * BigInt(Math.floor(multiplier * 100))) / 100n

    const estimatedCost = gasLimit * maxFeePerGas

    return {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedCost,
      type: TransactionType.EIP1559,
    }
  } else {
    // Sử dụng Legacy (Type 0) - đơn giản hơn, phù hợp với hầu hết testnet
    const baseGasPrice = feeData.gasPrice || parseUnits('20', 'gwei')
    const multiplier = getSpeedMultiplier(speed)
    const gasPrice = (baseGasPrice * BigInt(Math.floor(multiplier * 100))) / 100n

    const estimatedCost = gasLimit * gasPrice

    return {
      gasLimit,
      gasPrice,
      estimatedCost,
      type: TransactionType.LEGACY,
    }
  }
}

/**
 * Ước tính gas limit an toàn
 * Thêm buffer 20% để đảm bảo giao dịch không bị hết gas
 */
async function estimateGasLimit(
  provider: any,
  from: string,
  to: string,
  value: bigint
): Promise<bigint> {
  try {
    const estimated = await provider.estimateGas({
      from,
      to,
      value,
    })
    // Thêm 20% buffer để đảm bảo an toàn
    return (estimated * 120n) / 100n
  } catch (error) {
    // Fallback: sử dụng giá trị mặc định cho giao dịch ETH thông thường
    return 21000n
  }
}

/**
 * Lấy hệ số nhân dựa trên tốc độ mong muốn
 * slow: 0.8x (rẻ hơn nhưng chậm hơn)
 * standard: 1.0x (cân bằng)
 * fast: 1.2x (nhanh hơn nhưng tốn phí hơn)
 */
function getSpeedMultiplier(speed: 'slow' | 'standard' | 'fast'): number {
  switch (speed) {
    case 'slow':
      return 0.8
    case 'fast':
      return 1.2
    case 'standard':
    default:
      return 1.0
  }
}

/**
 * Format gas estimate thành dạng dễ đọc
 */
export function formatGasEstimate(estimate: GasEstimate): {
  gasLimit: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  estimatedCost: string
  type: string
} {
  return {
    gasLimit: estimate.gasLimit.toString(),
    gasPrice: estimate.gasPrice ? formatUnits(estimate.gasPrice, 'gwei') + ' Gwei' : undefined,
    maxFeePerGas: estimate.maxFeePerGas
      ? formatUnits(estimate.maxFeePerGas, 'gwei') + ' Gwei'
      : undefined,
    maxPriorityFeePerGas: estimate.maxPriorityFeePerGas
      ? formatUnits(estimate.maxPriorityFeePerGas, 'gwei') + ' Gwei'
      : undefined,
    estimatedCost: formatUnits(estimate.estimatedCost, 'ether') + ' ETH',
    type: estimate.type === TransactionType.EIP1559 ? 'EIP-1559' : 'Legacy',
  }
}

/**
 * So sánh chi phí giữa các tùy chọn tốc độ
 */
export async function compareGasCosts(
  network: Network,
  from: string,
  to: string,
  value: bigint
): Promise<{
  slow: GasEstimate
  standard: GasEstimate
  fast: GasEstimate
}> {
  const [slow, standard, fast] = await Promise.all([
    estimateOptimalGas(network, from, to, value, { speed: 'slow' }),
    estimateOptimalGas(network, from, to, value, { speed: 'standard' }),
    estimateOptimalGas(network, from, to, value, { speed: 'fast' }),
  ])

  return { slow, standard, fast }
}
