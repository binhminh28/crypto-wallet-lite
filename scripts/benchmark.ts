import { chromium, Page } from 'playwright'
import { writeFileSync, appendFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'
import { JsonRpcProvider, formatEther, Wallet } from 'ethers'

dotenv.config()

const { TEST_PRIVATE_KEY_SEND, TEST_PRIVATE_KEY_RECEIVED, BASE_URL = 'http://localhost:5173' } = process.env

if (!TEST_PRIVATE_KEY_SEND || !TEST_PRIVATE_KEY_RECEIVED) {
  throw new Error('Missing TEST_PRIVATE_KEY_SEND or TEST_PRIVATE_KEY_RECEIVED in .env')
}

const ITERATIONS = 50
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/JHMPq2BwZMBC983UnVbyF'
const provider = new JsonRpcProvider(RPC_URL)
provider.pollingInterval = 500

const CSV_PATH = join(process.cwd(), `benchmark_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`)

const senderWallet = new Wallet(TEST_PRIVATE_KEY_SEND)
const RECEIVER_ADDRESS = new Wallet(TEST_PRIVATE_KEY_RECEIVED).address
const SENDER_ADDRESS = senderWallet.address

function initCsvFile() {
  const header = 'iteration,total_ms,network_ms,confirm_ms,ui_gas_eth,actual_gas_eth,rpc_status,tx_hash,value_eth,fee_eth,gas_price_gwei,sender_balance_eth,receiver_balance_eth\n'
  writeFileSync(CSV_PATH, header, 'utf8')
  console.log(`CSV path: ${CSV_PATH}\n`)
}

function appendCsvRow(data: any) {
  const row = [
    data.iteration,
    data.total_ms,
    data.network_ms,
    data.confirm_ms,
    data.ui_gas_eth,
    data.actual_gas_eth,
    data.rpc_status,
    data.tx_hash,
    data.value_eth,
    data.fee_eth,
    data.gas_price_gwei,
    data.sender_balance_eth,
    data.receiver_balance_eth
  ].join(',') + '\n'
  appendFileSync(CSV_PATH, row, 'utf8')
}

async function checkServer(url: string, retries = 10): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(url)
      return true
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return false
}

async function getTransactionDetails(txHash: string) {
  try {
    const receipt = await provider.getTransactionReceipt(txHash)
    const tx = await provider.getTransaction(txHash)

    if (!receipt || !tx) return null

    const feeWei = receipt.gasUsed * receipt.gasPrice
    const gasPriceGwei = Number(formatEther(receipt.gasPrice)) * 1e9

    return {
      status: receipt.status === 1 ? 'success' : 'failed',
      value: formatEther(tx.value),
      fee: formatEther(feeWei),
      actualGas: formatEther(feeWei),
      gasPrice: gasPriceGwei.toFixed(4)
    }
  } catch (error) {
    return null
  }
}

async function importWallet(page: Page, privateKey: string, name: string) {
  await page.click('[data-testid="toggle-import-wallet"]')
  await page.waitForSelector('input[value="privateKey"]')
  await page.click('input[value="privateKey"]')
  await page.fill('[data-testid="import-wallet-label"]', name)
  await page.fill('[data-testid="import-wallet-private-key"]', privateKey)
  await page.click('button:text("Import")')
  await page.waitForSelector(`text="${name}"`)
}

async function setupWallets(page: Page) {
  process.stdout.write('Setup wallets... ')
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  await page.fill('[data-testid="create-password-input"]', '123456')
  await page.fill('[data-testid="confirm-password-input"]', '123456')
  await page.click('[data-testid="create-password-submit"]')

  await importWallet(page, TEST_PRIVATE_KEY_RECEIVED!, 'Receiver')
  await importWallet(page, TEST_PRIVATE_KEY_SEND!, 'Sender')

  await page.click('button:has-text("Sender")')
  await page.waitForSelector('p:text("Sender")', { state: 'visible' })
  console.log('Done\n')
}

async function runIteration(page: Page, i: number) {
  await page.fill('[data-testid="send-to-input"]', RECEIVER_ADDRESS)
  await page.fill('[data-testid="send-amount-input"]', '0.0001')
  await page.waitForTimeout(2000)

  let uiGasEth = '0'
  try {
    const gasText = await page.textContent('span.text-orange-300')
    const match = gasText?.match(/([\d.eE+-]+)/)
    if (match) uiGasEth = match[0]
  } catch {}

  process.stdout.write(`[${i}/${ITERATIONS}] ⏳ Sending...`)

  const netStart = performance.now()
  try {
    await Promise.all([
      page.waitForResponse(res => 
        (res.url().includes('alchemy') || res.url().includes('rpc')) && 
        res.request().method() === 'POST' &&
        res.status() === 200
      , { timeout: 30000 }),
      page.click('button:text("Gửi giao dịch")')
    ])
  } catch (e) {
    process.stdout.write('\n RPC Response Error\n')
  }
  const netEnd = performance.now()
  const networkMs = netEnd - netStart

  await page.waitForSelector('text=Giao dịch đã được gửi thành công!', { timeout: 60000 })
  
  const txLink = await page.getAttribute('a[href*="/tx/"]', 'href')
  const txHash = txLink?.split('/tx/')[1]?.split('?')[0] || ''

  process.stdout.write(`\r[${i}/${ITERATIONS}] Sent (${networkMs.toFixed(0)}ms). Confirming...`)

  let confirmMs = 0
  let rpcStatus = 'pending'
  let details: any = {}
  let senderBal = '0', receiverBal = '0'

  if (txHash) {
    const confirmStart = performance.now()
    try {
      const receipt = await provider.waitForTransaction(txHash, 1, 120_000)
      const confirmEnd = performance.now()
      confirmMs = confirmEnd - confirmStart

      if (receipt) {
        details = await getTransactionDetails(txHash)
        rpcStatus = receipt.status === 1 ? 'success' : 'failed'
        
        const [sBal, rBal] = await Promise.all([
          provider.getBalance(SENDER_ADDRESS),
          provider.getBalance(RECEIVER_ADDRESS)
        ])
        senderBal = formatEther(sBal)
        receiverBal = formatEther(rBal)
      }
    } catch {
      rpcStatus = 'timeout'
    }
  }

  const totalMs = networkMs + confirmMs

  const row = {
    iteration: i,
    total_ms: totalMs.toFixed(2),
    network_ms: networkMs.toFixed(2),
    confirm_ms: confirmMs.toFixed(2),
    ui_gas_eth: uiGasEth,
    actual_gas_eth: details?.actualGas || '0',
    rpc_status: rpcStatus,
    tx_hash: txHash,
    value_eth: details?.value || '0',
    fee_eth: details?.fee || '0',
    gas_price_gwei: details?.gasPrice || '0',
    sender_balance_eth: senderBal,
    receiver_balance_eth: receiverBal
  }

  appendCsvRow(row)

  process.stdout.write(`\r[${i}/${ITERATIONS}] Done: ${txHash.slice(0,8)}... | Net: ${networkMs.toFixed(0)}ms | Confirm: ${confirmMs.toFixed(0)}ms | Total: ${(totalMs/1000).toFixed(2)}s\n`)

  const closeBtn = await page.$('button:text("Đóng")')
  if (closeBtn) await closeBtn.click()
}

async function main() {
  if (!await checkServer(BASE_URL)) {
    console.error(`Server not running at ${BASE_URL}`)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  try {
    initCsvFile()
    await setupWallets(page)

    for (let i = 1; i <= ITERATIONS; i++) {
      await runIteration(page, i)
      await page.waitForTimeout(1000)
    }
    console.log('\n Benchmark completed!')
  } catch (err) {
    console.error('\n Error:', err)
  } finally {
    await browser.close()
  }
}

main()