/**
 * DEMO: Cách sử dụng Gas Optimizer trong Crypto Wallet Lite
 * 
 * File này minh họa các tình huống sử dụng thực tế của hệ thống
 * tối ưu hóa gas và transaction type.
 */

import { parseEther, formatUnits } from 'ethers'
import {
  estimateOptimalGas,
  compareGasCosts,
  formatGasEstimate,
  TransactionType,
} from '../services/blockchain/gas-optimizer'
import {
  sendNativeTransaction,
  previewTransactionGas,
} from '../services/blockchain/transaction'
import type { Network, TransactionDraft } from '../types'

// ========================================
// DEMO 1: Ước tính gas cho giao dịch đơn giản
// ========================================
async function demo1_basicGasEstimate() {
  console.log('=== DEMO 1: Ước tính gas cơ bản ===\n')

  const network: Network = {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    rpc: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  }

  const from = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  const value = parseEther('0.01') // 0.01 ETH

  try {
    // Ước tính với tốc độ standard
    const estimate = await estimateOptimalGas(network, from, to, value, {
      speed: 'standard',
    })

    console.log('Transaction Type:', estimate.type === 0 ? 'Legacy' : 'EIP-1559')
    console.log('Gas Limit:', estimate.gasLimit.toString())

    if (estimate.gasPrice) {
      console.log('Gas Price:', formatUnits(estimate.gasPrice, 'gwei'), 'Gwei')
    }

    if (estimate.maxFeePerGas) {
      console.log('Max Fee Per Gas:', formatUnits(estimate.maxFeePerGas, 'gwei'), 'Gwei')
      console.log(
        'Max Priority Fee:',
        formatUnits(estimate.maxPriorityFeePerGas!, 'gwei'),
        'Gwei'
      )
    }

    console.log('Estimated Cost:', formatUnits(estimate.estimatedCost, 'ether'), 'ETH')
    console.log()
  } catch (error) {
    console.error('Lỗi:', error.message)
  }
}

// ========================================
// DEMO 2: So sánh 3 mức tốc độ
// ========================================
async function demo2_compareGasSpeeds() {
  console.log('=== DEMO 2: So sánh tốc độ giao dịch ===\n')

  const network: Network = {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    rpc: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  }

  const from = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  const value = parseEther('0.1')

  try {
    const comparison = await compareGasCosts(network, from, to, value)

    console.log('┌─────────────┬──────────────┬──────────────┬──────────────┐')
    console.log('│   Tốc độ    │  Gas Price   │   Chi phí    │ Thời gian dự │')
    console.log('│             │              │   ước tính   │     kiến     │')
    console.log('├─────────────┼──────────────┼──────────────┼──────────────┤')

    const formatRow = (name: string, est: any, time: string) => {
      const formatted = formatGasEstimate(est)
      const price = formatted.gasPrice || formatted.maxFeePerGas || 'N/A'
      console.log(`│ ${name.padEnd(11)} │ ${price.padEnd(12)} │ ${formatted.estimatedCost.padEnd(12)} │ ${time.padEnd(12)} │`)
    }

    formatRow('Slow', comparison.slow, '~30 giây')
    formatRow('Standard', comparison.standard, '~15 giây')
    formatRow('Fast', comparison.fast, '~10 giây')

    console.log('└─────────────┴──────────────┴──────────────┴──────────────┘\n')

    // Tính tiết kiệm
    const savings = comparison.fast.estimatedCost - comparison.slow.estimatedCost
    console.log(`💡 Tiết kiệm khi chọn Slow thay vì Fast: ${formatUnits(savings, 'ether')} ETH\n`)
  } catch (error) {
    console.error('Lỗi:', error.message)
  }
}

// ========================================
// DEMO 3: Preview gas trước khi gửi
// ========================================
async function demo3_previewBeforeSend() {
  console.log('=== DEMO 3: Xem trước phí gas ===\n')

  const network: Network = {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    rpc: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  }

  const from = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'

  const draft: TransactionDraft = {
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    amount: '0.05',
    note: 'Test payment',
  }

  try {
    console.log('📋 Thông tin giao dịch:')
    console.log(`   Từ: ${from}`)
    console.log(`   Đến: ${draft.to}`)
    console.log(`   Số lượng: ${draft.amount} ETH\n`)

    const preview = await previewTransactionGas({ network, from, draft })

    console.log('⚡ Ước tính phí gas:\n')
    console.log('🐌 Slow (tiết kiệm):', preview.slow.estimatedCost)
    console.log('   - Type:', preview.slow.type)
    console.log('   - Gas Limit:', preview.slow.gasLimit)
    console.log()

    console.log('⚖️  Standard (cân bằng):', preview.standard.estimatedCost)
    console.log('   - Type:', preview.standard.type)
    console.log('   - Gas Limit:', preview.standard.gasLimit)
    console.log()

    console.log('🚀 Fast (nhanh nhất):', preview.fast.estimatedCost)
    console.log('   - Type:', preview.fast.type)
    console.log('   - Gas Limit:', preview.fast.gasLimit)
    console.log()

    console.log('💡 Gợi ý: Chọn Standard cho hầu hết các giao dịch\n')
  } catch (error) {
    console.error('Lỗi:', error.message)
  }
}

// ========================================
// DEMO 4: Gửi giao dịch thực tế với gas tối ưu
// ========================================
async function demo4_sendOptimizedTransaction() {
  console.log('=== DEMO 4: Gửi giao dịch với gas tối ưu ===\n')

  const network: Network = {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    rpc: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  }

  const privateKey = 'YOUR_PRIVATE_KEY_HERE' // ⚠️ KHÔNG BAO GIỜ COMMIT KEY THẬT

  const draft: TransactionDraft = {
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    amount: '0.001',
    note: 'Test transaction',
  }

  try {
    console.log('📤 Đang gửi giao dịch...\n')

    const result = await sendNativeTransaction({
      network,
      draft,
      privateKey,
    })

    console.log('✅ Giao dịch thành công!')
    console.log('   Hash:', result.hash)
    console.log('   From:', result.from)
    console.log('   To:', result.to)
    console.log('   Value:', result.value, network.badge)
    console.log()

    if (result.gasUsed) {
      const formatted = formatGasEstimate(result.gasUsed)
      console.log('⛽ Thông tin gas:')
      console.log('   Type:', formatted.type)
      console.log('   Gas Limit:', formatted.gasLimit)
      console.log('   Estimated Cost:', formatted.estimatedCost)
      console.log()
    }

    console.log(`🔍 Xem chi tiết: ${network.explorer}/tx/${result.hash}\n`)
  } catch (error) {
    console.error('❌ Giao dịch thất bại:', error.message)
  }
}

// ========================================
// DEMO 5: Ép buộc sử dụng Legacy Transaction
// ========================================
async function demo5_forceLegacyTransaction() {
  console.log('=== DEMO 5: Sử dụng Legacy Transaction ===\n')

  const network: Network = {
    id: 'sepolia',
    name: 'Sepolia',
    chainId: '11155111',
    rpc: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    badge: 'ETH',
  }

  const from = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
  const to = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199'
  const value = parseEther('0.01')

  try {
    // Ép buộc sử dụng Legacy
    const estimate = await estimateOptimalGas(network, from, to, value, {
      speed: 'standard',
      forceType: TransactionType.LEGACY,
    })

    console.log('✅ Sử dụng Legacy Transaction (Type 0)')
    console.log('   Gas Limit:', estimate.gasLimit.toString())
    console.log('   Gas Price:', formatUnits(estimate.gasPrice!, 'gwei'), 'Gwei')
    console.log('   Estimated Cost:', formatUnits(estimate.estimatedCost, 'ether'), 'ETH')
    console.log()
    console.log('📌 Legacy phù hợp với hầu hết testnet và đơn giản hơn EIP-1559\n')
  } catch (error) {
    console.error('Lỗi:', error.message)
  }
}

// ========================================
// CHẠY TẤT CẢ DEMO
// ========================================
async function runAllDemos() {
  await demo1_basicGasEstimate()
  await demo2_compareGasSpeeds()
  await demo3_previewBeforeSend()
  // await demo4_sendOptimizedTransaction() // Uncomment khi có private key
  await demo5_forceLegacyTransaction()
}

// Export để sử dụng trong app
export {
  demo1_basicGasEstimate,
  demo2_compareGasSpeeds,
  demo3_previewBeforeSend,
  demo4_sendOptimizedTransaction,
  demo5_forceLegacyTransaction,
  runAllDemos,
}
