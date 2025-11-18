import type {
  FaucetTip,
  Lesson,
  Network,
  Web3Snippet,
} from '../types'

export const defaultNetworks: Network[] = [
  {
    id: 'eth-sepolia',
    name: 'Ethereum Sepolia',
    chainId: '11155111',
    rpc: import.meta.env.VITE_RPC_SEPOLIA || 'https://sepolia.gateway.tenderly.co', // Tenderly Gateway (miễn phí, ổn định, không bị Cloudflare chặn)
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


export const defaultLearningPath: Lesson[] = [
  { id: 'lesson-1', title: 'Ví crypto 101', caption: 'Seed phrase, private key', duration: '10 phút', status: 'done' },
  {
    id: 'lesson-2',
    title: 'Giao dịch testnet',
    caption: 'Nonce, phí gas, mempool',
    duration: '15 phút',
    status: 'in-progress',
  },
  {
    id: 'lesson-3',
    title: 'Tương tác smart contract',
    caption: 'ABI, call vs. write',
    duration: '20 phút',
    status: 'locked',
  },
]

export const defaultFaucetTips: FaucetTip[] = [
  {
    id: 'faucet-1',
    network: 'Sepolia',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    note: 'Alchemy faucet - 0.5 ETH/24h, cần đăng ký Alchemy account (miễn phí).',
  },
  {
    id: 'faucet-1-alt',
    network: 'Sepolia',
    url: 'https://faucets.chain.link/sepolia',
    note: 'Chainlink faucet - 0.1 ETH/24h, cần xác thực GitHub account.',
  },
  {
    id: 'faucet-2',
    network: 'Base',
    url: 'https://www.alchemy.com/faucets/base-sepolia',
    note: 'Alchemy Base Sepolia faucet - Trực tiếp claim ETH trên Base Sepolia, cần Alchemy account.',
  },
  {
    id: 'faucet-2-alt',
    network: 'Base',
    url: 'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
    note: 'Coinbase faucet - Login Coinbase, claim ETH trên Sepolia rồi bridge qua Base.',
  },
  {
    id: 'faucet-3',
    network: 'Polygon',
    url: 'https://faucet.polygon.technology/',
    note: 'Polygon official faucet - Chọn network "Amoy", paste địa chỉ và claim POL tức thì.',
  },
]

export const defaultWeb3Snippets: Web3Snippet[] = [
  {
    id: 'snippet-1',
    title: 'Đọc số dư ERC20',
    code: `import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
})

const balance = await client.readContract({
  address: tokenAddress,
  abi,
  functionName: 'balanceOf',
  args: [walletAddress],
})`,
  },
  {
    id: 'snippet-2',
    title: 'Ký giao dịch bằng WalletConnect',
    code: `import { Web3Modal } from '@web3modal/standalone'

const modal = new Web3Modal({ projectId })
const session = await modal.connect()

await session.request({
  method: 'eth_sendTransaction',
  params: [{ from, to, value, data }],
})`,
  },
]


