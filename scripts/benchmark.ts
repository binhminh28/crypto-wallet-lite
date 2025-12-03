import { chromium, Browser, Page } from 'playwright'
import { writeFileSync, existsSync, appendFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'
import axios from 'axios'
import { Wallet, JsonRpcProvider, formatEther } from 'ethers'

dotenv.config()

const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.VITE_ETHERSCAN_API_KEY

if (!TEST_PRIVATE_KEY) {
  throw new Error('Missing TEST_PRIVATE_KEY in .env')
}

if (!ETHERSCAN_API_KEY) {
  throw new Error('Missing VITE_ETHERSCAN_API_KEY in .env')
}

const BASE_URL = 'http://localhost:5173'
const ITERATIONS = 50

// Generate CSV filename with timestamp (ISO format, replace : with - for Windows compatibility)
function getCsvPath(): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/:/g, '-').split('.')[0] // Format: 2024-12-03T16-30-45
  const filename = `benchmark_${timestamp}.csv`
  return join(process.cwd(), filename)
}

let CSV_PATH = getCsvPath()

type BenchmarkRow = {
  iteration: number
  total_ms: number
  network_ms: number
  client_ms: number
  ui_gas_eth: number
  actual_gas_eth: number
  gas_deviation_eth: number
  rpc_status: string
  etherscan_status: string
  tx_hash: string
  etherscan_value_eth: number
  etherscan_fee_eth: number
  etherscan_gas_price_gwei: number
}

function ensureCsvHeader() {
  const header =
    'iteration,total_ms,network_ms,client_ms,ui_gas_eth,actual_gas_eth,gas_deviation_eth,rpc_status,etherscan_status,tx_hash,etherscan_value_eth,etherscan_fee_eth,etherscan_gas_price_gwei\n'
  // Always create new file with header
  writeFileSync(CSV_PATH, header, 'utf8')
  console.log(`📄 Created CSV file: ${CSV_PATH}`)
}

function appendRow(row: BenchmarkRow) {
  const line = [
    row.iteration,
    row.total_ms.toFixed(2),
    row.network_ms.toFixed(2),
    row.client_ms.toFixed(2),
    row.ui_gas_eth.toFixed(8),
    row.actual_gas_eth.toFixed(8),
    row.gas_deviation_eth.toFixed(8),
    row.rpc_status,
    row.etherscan_status,
    row.tx_hash || '',
    row.etherscan_value_eth.toFixed(8),
    row.etherscan_fee_eth.toFixed(8),
    row.etherscan_gas_price_gwei.toFixed(2),
  ].join(',') + '\n'
  appendFileSync(CSV_PATH, line, 'utf8')
}

async function checkServerAvailable(url: string, maxRetries = 10, delayMs = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 2000, validateStatus: () => true })
      if (response.status < 500) {
        return true
      }
    } catch {
      // Server not ready yet
    }
    if (i < maxRetries - 1) {
      console.log(`Waiting for server at ${url}... (${i + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return false
}

async function createBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  return { browser, page }
}

// Receiver address will be set during setup flow
let receiverAddress: string = ''

async function waitForTxConfirmation(
  txHash: string,
  maxWaitTime = 300000
): Promise<{
  value: number
  fee: number
  gasPrice: number
  status: string
}> {
  const startTime = Date.now()
  const pollInterval = 3000 // 3 seconds (faster polling)
  
  // Use RPC directly for more reliable status checking
  const provider = new JsonRpcProvider('https://sepolia.drpc.org')

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check receipt status using RPC (more reliable than Etherscan API)
      const receipt = await provider.getTransactionReceipt(txHash)
      
      if (receipt) {
        // Transaction is confirmed, parse details
        // Handle status: can be bigint (1n) or number (1)
        const statusValue = typeof receipt.status === 'bigint' ? receipt.status : BigInt(receipt.status ?? 0)
        const isSuccess = statusValue === 1n
        console.log(`  ✅ Tx confirmed (status: ${isSuccess ? 'success' : 'fail'})`)
        
        // Parse transaction fee (gasUsed * gasPrice, in Wei, convert to ETH)
        const gasUsed = receipt.gasUsed
        // Use effectiveGasPrice if available (EIP-1559), otherwise gasPrice
        const gasPriceWei = (receipt as any).effectiveGasPrice ?? receipt.gasPrice ?? 0n
        const feeWei = gasUsed * gasPriceWei
        const fee = parseFloat(formatEther(feeWei))
        
        // Get transaction to get value
        let value = 0
        try {
          const tx = await provider.getTransaction(txHash)
          if (tx && tx.value) {
            value = parseFloat(formatEther(tx.value))
          }
        } catch {
          // If can't get transaction, try Etherscan API as fallback
          try {
            const txRes = await axios.get('https://api-sepolia.etherscan.io/api', {
              params: {
                module: 'proxy',
                action: 'eth_getTransactionByHash',
                txhash: txHash,
                apikey: ETHERSCAN_API_KEY,
              },
              timeout: 10000,
            })
            const tx = txRes.data?.result
            if (tx && tx.value) {
              const valueWei = BigInt(tx.value)
              value = parseFloat(formatEther(valueWei))
            }
          } catch {
            // If can't get transaction, value stays 0
          }
        }
        
        // Parse gas price (in Wei, convert to Gwei)
        const gasPriceGwei = parseFloat(formatEther(gasPriceWei)) * 1e9
        
        // Get Etherscan status for verification (optional, for logging)
        try {
          const statusRes = await axios.get('https://api-sepolia.etherscan.io/api', {
            params: {
              module: 'transaction',
              action: 'gettxreceiptstatus',
              txhash: txHash,
              apikey: ETHERSCAN_API_KEY,
            },
            timeout: 10000,
          })
          
          // Parse Etherscan response: result can be string "1"/"0" or object {status: "1"}
          const result = statusRes.data?.result
          let etherscanStatusStr = 'unknown'
          if (typeof result === 'string') {
            etherscanStatusStr = result === '1' ? 'success' : result === '0' ? 'fail' : 'unknown'
          } else if (result?.status) {
            etherscanStatusStr = result.status === '1' ? 'success' : result.status === '0' ? 'fail' : 'unknown'
          }
          console.log(`  📊 Etherscan status: ${etherscanStatusStr}`)
        } catch {
          // Ignore Etherscan API errors, use RPC status
        }

        return {
          value,
          fee,
          gasPrice: gasPriceGwei,
          status: isSuccess ? 'success' : 'fail',
        }
      }
      
      // Still pending, wait and retry
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      console.log(`  ⏳ Tx still pending (${elapsed}s elapsed), waiting ${pollInterval/1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    } catch (error) {
      console.warn(`  ⚠️  Error checking tx status:`, error)
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }
  }

  // Timeout - still pending
  return {
    value: 0,
    fee: 0,
    gasPrice: 0,
    status: 'pending',
  }
}

async function getActualGas(txHash: string): Promise<{
  actualGasEth: number
  rpcStatus: string
  etherscanStatus: string
}> {
  let rpcStatus = 'unknown'
  let etherscanStatus = 'unknown'

  try {
    const provider = new JsonRpcProvider('https://sepolia.drpc.org')
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) {
      rpcStatus = 'pending'
      etherscanStatus = 'pending'
      return { actualGasEth: 0, rpcStatus, etherscanStatus }
    }

    const gasUsed = receipt.gasUsed
    // Use gasPrice, fallback to effectiveGasPrice if available (for EIP-1559)
    const gasPrice = receipt.gasPrice ?? (receipt as any).effectiveGasPrice ?? 0n
    const gasWei = gasUsed * gasPrice
    const actualGasEth = parseFloat(formatEther(gasWei))
    // Status can be 1 (success) or 0 (fail) as number or bigint
    const statusValue = typeof receipt.status === 'bigint' ? receipt.status : BigInt(receipt.status ?? 0)
    rpcStatus = statusValue === 1n ? 'success' : 'fail'

    // Etherscan
    try {
      const res = await axios.get('https://api-sepolia.etherscan.io/api', {
        params: {
          module: 'transaction',
          action: 'gettxreceiptstatus',
          txhash: txHash,
          apikey: ETHERSCAN_API_KEY,
        },
      })
      const status = res.data?.result?.status
      etherscanStatus = status === '1' ? 'success' : status === '0' ? 'fail' : 'unknown'
    } catch {
      etherscanStatus = 'error'
    }

    return { actualGasEth, rpcStatus, etherscanStatus }
  } catch {
    return { actualGasEth: 0, rpcStatus: 'error', etherscanStatus: 'error' }
  }
}

async function importWalletFlow(page: Page): Promise<string> {
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 10000 })
  } catch (error: any) {
    if (error.message?.includes('ERR_CONNECTION_REFUSED') || error.message?.includes('net::ERR')) {
      throw new Error(
        `\n❌ Cannot connect to ${BASE_URL}\n` +
        `   Please start the dev server first:\n` +
        `   npm run dev\n` +
        `\n   Then run the benchmark in another terminal:\n` +
        `   npm run benchmark\n`
      )
    }
    throw error
  }

  console.log('📝 Step 1: Creating master password...')
  // Bước 1: Tạo master password "123456"
  await page.waitForSelector('input[placeholder="Nhập password"]', { timeout: 10000 })
  await page.fill('input[placeholder="Nhập password"]', '123456')
  await page.fill('input[placeholder="Nhập lại password"]', '123456')
  await page.click('button:text("Tạo password và tiếp tục")')
  await page.waitForLoadState('networkidle')

  console.log('📥 Step 2: Importing wallet from TEST_PRIVATE_KEY...')
  // Bước 2: Import ví từ TEST_PRIVATE_KEY
  // Button "Import ví" có class "rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate"
  const importButton = page.locator('button.rounded-2xl.border.border-white\\/10').filter({ hasText: 'Import ví' })
  await importButton.waitFor({ timeout: 10000 })
  await importButton.click()
  
  // Đợi form import hiện ra (div có class "rounded-2xl border border-white/10 bg-white/5")
  await page.waitForSelector('div.bg-white\\/5:has(p:text("Import ví"))', { timeout: 5000 })
  
  // Chọn radio button Private Key (input[type="radio"][value="privateKey"])
  await page.click('input[type="radio"][value="privateKey"]')
  
  // Điền tên ví (input có placeholder "Tên ví (tuỳ chọn)")
  await page.fill('input[placeholder="Tên ví (tuỳ chọn)"]', 'Ví Send')
  
  // Điền private key (input[type="password"][placeholder="0x..."])
  await page.fill('input[type="password"][placeholder="0x..."]', TEST_PRIVATE_KEY as string)
  
  // Click Import button (button trong form import có text "Import")
  const submitImportButton = page.locator('div.bg-white\\/5:has(p:text("Import ví"))').locator('button').filter({ hasText: 'Import' })
  await submitImportButton.click()
  
  // Đợi ví được import và hiển thị trong danh sách (trong div.max-h-96)
  await page.waitForSelector('div.max-h-96:has-text("Ví Send")', { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  console.log('✅ Wallet "Ví Send" imported successfully')

  console.log('🆕 Step 3: Creating new wallet...')
  // Bước 3: Tạo ví mới và lấy địa chỉ
  // Button "+ Tạo ví mới" có class "rounded-2xl border border-white/5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20"
  const createButton = page.locator('button.bg-gradient-to-r.from-cyan-500\\/20.to-blue-500\\/20').filter({ hasText: 'Tạo ví mới' })
  await createButton.click()
  
  // Đợi modal WalletInfoModal hiện ra (div.fixed.inset-0 với h2 có text "Thông tin ví mới")
  await page.waitForSelector('div.fixed.inset-0 h2:text("Thông tin ví mới")', { timeout: 10000 })
  
  // Lấy địa chỉ ví từ modal - tìm trong phần địa chỉ ví (div có text "Địa chỉ ví" chứa p.font-mono)
  const addressElement = await page.waitForSelector('div:has-text("Địa chỉ ví") p.font-mono', { timeout: 5000 })
  const addressText = await addressElement?.textContent()
  
  if (!addressText || !addressText.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Could not extract wallet address from modal')
  }
  
  receiverAddress = addressText.trim()
  console.log(`✅ New wallet created with address: ${receiverAddress}`)
  
  // Đóng modal bằng nút "Đóng" ở góc trên bên phải
  // Button "Đóng" có class "rounded-lg bg-white/10 px-3 py-1 text-sm text-slate" trong header modal
  const closeButton = page.locator('div.fixed.inset-0 h2:text("Thông tin ví mới")').locator('..').locator('button.bg-white\\/10').filter({ hasText: 'Đóng' })
  await closeButton.click()
  
  // Đợi modal đóng (div.fixed.inset-0 không còn visible)
  await page.waitForSelector('div.fixed.inset-0 h2:text("Thông tin ví mới")', { state: 'hidden', timeout: 5000 })
  await page.waitForLoadState('networkidle')

  console.log('🔄 Step 4: Selecting "Ví Send" wallet...')
  // Bước 4: Chọn ví "Ví Send"
  // Trong WalletPanel, mỗi ví có một button với class "flex-1 text-left" và onClick={onSwitch(wallet.id)}
  // Tìm button có text "Ví Send" trong phần danh sách ví (trong div có class "max-h-96 space-y-2")
  const walletListContainer = page.locator('div.max-h-96.space-y-2')
  const walletButton = walletListContainer.locator('button.flex-1.text-left').filter({ hasText: 'Ví Send' })
  await walletButton.waitFor({ timeout: 10000 })
  await walletButton.click()
  
  // Đợi ví được active - check div container có class "border-cyan-400/60 bg-cyan-500/10"
  // Và verify label trong phần "Đang dùng" (p.text-lg.font-semibold.text-white) có text "Ví Send"
  await page.waitForSelector('div.border-cyan-400\\/60.bg-cyan-500\\/10', { timeout: 10000 })
  
  // Verify that "Ví Send" is shown as active wallet label trong phần "Đang dùng"
  // Phần "Đang dùng" có p.text-xs.uppercase.tracking-\\[0\\.3em\\].text-cyan-200
  // Label active wallet có p.text-lg.font-semibold.text-white
  const activeWalletLabel = await page.textContent('p.text-lg.font-semibold.text-white')
  if (activeWalletLabel?.trim() !== 'Ví Send') {
    // Đợi thêm một chút để UI update
    await page.waitForTimeout(1000)
    const retryLabel = await page.textContent('p.text-lg.font-semibold.text-white')
    if (retryLabel?.trim() !== 'Ví Send') {
      throw new Error(`Expected "Ví Send" to be active, but got "${retryLabel || activeWalletLabel}"`)
    }
  }
  await page.waitForLoadState('networkidle')
  console.log('✅ "Ví Send" wallet is now active')

  return receiverAddress
}

async function runIteration(page: Page, iteration: number, receiverAddr: string) {
  console.log(`\n🔄 Iteration ${iteration}/50`)
  
  // Đảm bảo đang ở trang chính và form gửi giao dịch sẵn sàng
  await page.waitForSelector('input[placeholder="0x..."]', { timeout: 10000 })
  
  // Bước 1: Điền form gửi giao dịch
  console.log('  📝 Filling transaction form...')
  const tStart = performance.now()
  
  // Clear và điền địa chỉ nhận
  await page.fill('input[placeholder="0x..."]', '')
  await page.fill('input[placeholder="0x..."]', receiverAddr)
  
  // Điền số lượng
  await page.fill('input[placeholder="0.05"]', '')
  await page.fill('input[placeholder="0.05"]', '0.0001')
  
  // Đợi gas fee được tính và hiển thị
  await page.waitForTimeout(1000)

  // Bước 2: Thu thập gas fee từ UI
  console.log('  💰 Reading gas fee from UI...')
  let uiGasEth = 0
  try {
    // Tìm element chứa text "Phí gas (sẽ trừ từ số tiền gửi):"
    const gasSection = await page.locator('text=Phí gas (sẽ trừ từ số tiền gửi):').locator('..')
    const gasText = await gasSection.locator('span.text-orange-300').textContent()
    
    if (gasText) {
      // Parse giá trị từ text như "~0.000021 ETH" hoặc "~1.000011e-12 ETH"
      let cleanedText = gasText.replace('~', '').trim()
      
      // Remove "ETH" suffix if present
      cleanedText = cleanedText.replace(/ETH/gi, '').trim()
      
      // Try to parse as number (handles scientific notation)
      const parsed = parseFloat(cleanedText)
      if (!isNaN(parsed)) {
        uiGasEth = parsed
        console.log(`  ✅ UI Gas Fee: ${uiGasEth} ETH`)
      } else {
        // Fallback: try to extract number with regex
        const match = cleanedText.match(/([0-9.eE+-]+)/)
        if (match) {
          uiGasEth = parseFloat(match[1])
          console.log(`  ✅ UI Gas Fee (parsed): ${uiGasEth} ETH`)
        }
      }
    }
    
    // If still 0, try alternative selector
    if (uiGasEth === 0) {
      try {
        const altGasText = await page.textContent('span.text-orange-300')
        if (altGasText) {
          const cleaned = altGasText.replace('~', '').replace(/ETH/gi, '').trim()
          const parsed = parseFloat(cleaned)
          if (!isNaN(parsed)) {
            uiGasEth = parsed
            console.log(`  ✅ UI Gas Fee (alt): ${uiGasEth} ETH`)
          }
        }
      } catch {
        // Ignore
      }
    }
  } catch (error) {
    console.warn('  ⚠️  Could not read gas fee from UI:', error)
  }

  // Bước 3: Monitor network requests và đo thời gian
  console.log('  📡 Monitoring network requests...')
  let networkMs = 0
  let txHash = ''
  let rpcRequestTime: number | null = null
  let rpcResponseTime: number | null = null

  // Setup network monitoring để bắt RPC requests
  const rpcUrls = [
    'eth-sepolia.g.alchemy.com',
    'sepolia.drpc.org',
    'sepolia.etherscan.io',
    'rpc.sepolia.org',
  ]

  // Create one-time listeners for this iteration
  const requestHandler = (request: any) => {
    const url = request.url()
    if (rpcUrls.some(rpcUrl => url.includes(rpcUrl)) && request.method() === 'POST' && !rpcRequestTime) {
      rpcRequestTime = performance.now()
      console.log(`  📤 RPC Request detected: ${url.substring(0, 80)}...`)
    }
  }

  const responseHandler = (response: any) => {
    const url = response.url()
    if (rpcUrls.some(rpcUrl => url.includes(rpcUrl)) && response.request().method() === 'POST' && rpcRequestTime && !rpcResponseTime) {
      rpcResponseTime = performance.now()
      const requestLatency = rpcResponseTime - rpcRequestTime
      console.log(`  📥 RPC Response received (${requestLatency.toFixed(2)}ms)`)
    }
  }

  page.on('request', requestHandler)
  page.on('response', responseHandler)

  // Bấm gửi giao dịch
  const netStart = performance.now()
  console.log('  🚀 Clicking "Gửi giao dịch" button...')
  await page.click('button:text("Gửi giao dịch")')

  // Đợi thông báo thành công
  const successSelector = 'text=Giao dịch đã được gửi thành công!'
  await page.waitForSelector(successSelector, { timeout: 120_000 })
  
  // Remove listeners after transaction completes
  page.removeListener('request', requestHandler)
  page.removeListener('response', responseHandler)
  
  const netEnd = performance.now()
  networkMs = netEnd - netStart
  
  // Nếu có RPC timing data, sử dụng nó (chính xác hơn)
  if (rpcRequestTime && rpcResponseTime) {
    networkMs = rpcResponseTime - rpcRequestTime
    console.log(`  ⏱️  Network latency (RPC): ${networkMs.toFixed(2)}ms`)
  } else {
    console.log(`  ⏱️  Network latency (estimated): ${networkMs.toFixed(2)}ms`)
  }

  // Lấy transaction hash từ link Etherscan / Explorer
  try {
    const link = await page.waitForSelector('a[href*="/tx/"]', { timeout: 5000 })
    if (link) {
      const href = await link.getAttribute('href')
      if (href) {
        const parts = href.split('/tx/')
        txHash = parts[1]?.split('?')[0]?.split('#')[0] ?? ''
        console.log(`  ✅ Transaction Hash: ${txHash}`)
      }
    }
  } catch (error) {
    console.warn('  ⚠️  Could not extract transaction hash:', error)
  }

  const tEnd = performance.now()
  const totalMs = tEnd - tStart
  const clientMs = totalMs - networkMs

  // Bước 4: Kiểm chứng và lưu dữ liệu
  console.log('  🔍 Verifying transaction on blockchain...')
  let actualGasEth = 0
  let gasDeviationEth = 0
  let rpcStatus = 'unknown'
  let etherscanStatus = 'unknown'
  let etherscanValueEth = 0
  let etherscanFeeEth = 0
  let etherscanGasPriceGwei = 0

  if (txHash) {
    // Get initial status from RPC
    const gasInfo = await getActualGas(txHash)
    rpcStatus = gasInfo.rpcStatus
    
    // Wait for tx confirmation on Etherscan and get detailed data
    console.log(`  ⏳ Waiting for tx confirmation (max 5 min)...`)
    const etherscanData = await waitForTxConfirmation(txHash, 300000)
    etherscanStatus = etherscanData.status
    etherscanValueEth = etherscanData.value
    etherscanFeeEth = etherscanData.fee
    etherscanGasPriceGwei = etherscanData.gasPrice
    
    // Use Etherscan fee as actualGasEth if available, otherwise use RPC
    if (etherscanFeeEth > 0) {
      actualGasEth = etherscanFeeEth
    } else {
      actualGasEth = gasInfo.actualGasEth
    }
    
    if (uiGasEth > 0 && actualGasEth > 0) {
      gasDeviationEth = Math.abs(uiGasEth - actualGasEth)
      console.log(`  📊 Gas Deviation: ${gasDeviationEth.toFixed(8)} ETH`)
    }
    
    console.log(`  ✅ Etherscan data:`, {
      status: etherscanStatus,
      value: `${etherscanValueEth.toFixed(8)} ETH`,
      fee: `${etherscanFeeEth.toFixed(8)} ETH`,
      gasPrice: `${etherscanGasPriceGwei.toFixed(2)} Gwei`,
    })
  }

  const row: BenchmarkRow = {
    iteration,
    total_ms: totalMs,
    network_ms: networkMs,
    client_ms: clientMs,
    ui_gas_eth: uiGasEth,
    actual_gas_eth: actualGasEth,
    gas_deviation_eth: gasDeviationEth,
    rpc_status: rpcStatus,
    etherscan_status: etherscanStatus,
    tx_hash: txHash || '',
    etherscan_value_eth: etherscanValueEth,
    etherscan_fee_eth: etherscanFeeEth,
    etherscan_gas_price_gwei: etherscanGasPriceGwei,
  }

  console.log(`  ✅ Iteration ${iteration} completed:`, {
    total: `${totalMs.toFixed(2)}ms`,
    network: `${networkMs.toFixed(2)}ms`,
    client: `${clientMs.toFixed(2)}ms`,
    uiGas: `${uiGasEth.toFixed(8)} ETH`,
    actualGas: `${actualGasEth.toFixed(8)} ETH`,
    deviation: `${gasDeviationEth.toFixed(8)} ETH`,
    status: `${rpcStatus}/${etherscanStatus}`,
    txHash: txHash ? txHash.substring(0, 10) + '...' : 'N/A',
  })
  
  appendRow(row)
  
  // Clear transaction result để sẵn sàng cho iteration tiếp theo
  try {
    const clearButton = await page.$('button:text("Đóng")')
    if (clearButton) {
      await clearButton.click()
      await page.waitForTimeout(500)
    }
  } catch {
    // Ignore if clear button not found
  }
}

async function main() {
  console.log('🔍 Checking if dev server is running...')
  const serverAvailable = await checkServerAvailable(BASE_URL)
  
  if (!serverAvailable) {
    console.error(
      `\n❌ Dev server is not running at ${BASE_URL}\n` +
      `   Please start it first:\n` +
      `   npm run dev\n` +
      `\n   Then run the benchmark in another terminal:\n` +
      `   npm run benchmark\n`
    )
    process.exit(1)
  }
  
  console.log('✅ Server is ready!\n')
  
  // Generate new CSV file with timestamp
  CSV_PATH = getCsvPath()
  ensureCsvHeader()
  const { browser, page } = await createBrowser()

  try {
    const receiverAddr = await importWalletFlow(page)
    
    if (!receiverAddr) {
      throw new Error('Failed to get receiver address from setup flow')
    }
    
    console.log(`\n🎯 Starting benchmark with ${ITERATIONS} iterations`)
    console.log(`📬 Receiver address: ${receiverAddr}\n`)

    for (let i = 1; i <= ITERATIONS; i++) {
      try {
        await runIteration(page, i, receiverAddr)
        
        // Small delay between iterations to avoid rate limiting
        if (i < ITERATIONS) {
          await page.waitForTimeout(1000)
        }
      } catch (err) {
        console.error(`\n❌ Iteration ${i} failed:`, err)
        appendRow({
          iteration: i,
          total_ms: 0,
          network_ms: 0,
          client_ms: 0,
          ui_gas_eth: 0,
          actual_gas_eth: 0,
          gas_deviation_eth: 0,
          rpc_status: 'error',
          etherscan_status: 'error',
          tx_hash: '',
          etherscan_value_eth: 0,
          etherscan_fee_eth: 0,
          etherscan_gas_price_gwei: 0,
        })
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


