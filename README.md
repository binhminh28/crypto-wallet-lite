# Crypto Wallet - Ứng dụng Ví Tiền Điện Tử trên Testnet

## 📋 Tổng quan

Dự án này là một ứng dụng ví tiền điện tử (cryptocurrency wallet) được xây dựng để học tập và thực hành các khái niệm blockchain cơ bản. Ứng dụng cho phép người dùng tạo ví, quản lý tài sản, và thực hiện giao dịch trên các mạng testnet (Ethereum Sepolia, Polygon Amoy, Base Sepolia) mà không cần sử dụng tiền thật.

**Mục đích học tập:**
- Hiểu cách hoạt động của ví tiền điện tử và quản lý private key
- Nắm vững quy trình tạo và ký giao dịch blockchain
- Thực hành tương tác với blockchain thông qua RPC providers
- Hiểu về gas fees, nonce, và transaction lifecycle

---

## 🏗️ Kiến trúc Hệ thống

### 1. Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (UI Layer)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Components   │  │   Hooks      │  │   Services   │      │
│  │ (UI/UX)      │→ │ (State Mgmt) │→ │ (Business)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Ethers.js (Blockchain Abstraction)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Wallet      │  │  Provider    │  │  Transaction │      │
│  │  (Signing)   │  │  (RPC Calls) │  │  (Broadcast) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Networks (Testnet)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Ethereum     │  │   Polygon    │  │    Base      │      │
│  │  Sepolia     │  │    Amoy      │  │   Sepolia    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2. Cấu trúc Thư mục

```
src/
├── components/          # React Components (UI Layer)
│   ├── sections/        # Các section chính của ứng dụng
│   │   ├── ActivityFeed.tsx          # Hiển thị lịch sử giao dịch
│   │   ├── HeroSection.tsx          # Header với tổng giá trị portfolio
│   │   ├── NetworkSelector.tsx       # Chọn blockchain network
│   │   ├── PortfolioOverview.tsx     # Tổng quan tài sản
│   │   ├── SendTransactionForm.tsx   # Form gửi giao dịch
│   │   └── WalletPanel.tsx          # Quản lý ví
│   └── shared/          # Components dùng chung
│       └── TransactionDetailsModal.tsx
│
├── hooks/               # Custom React Hooks (State Management)
│   ├── useActivityFeed.ts           # Quản lý activity log
│   ├── useBlockchainData.ts         # Fetch blockchain data (balance, gas price)
│   ├── useTokenHoldings.ts          # Quản lý danh sách tokens
│   ├── useTransactionHistory.ts     # Lấy lịch sử từ explorer API
│   └── useWalletManager.ts          # Quản lý ví (CRUD operations)
│
├── services/            # Business Logic Layer
│   ├── testnet.ts                   # Core blockchain operations
│   │   ├── getProvider()            # Tạo và cache RPC provider
│   │   ├── getWalletNativeBalance() # Lấy số dư native token
│   │   ├── sendNativeTransaction() # Gửi giao dịch (QUAN TRỌNG)
│   │   └── getTransactionHistory()  # Lấy lịch sử từ Etherscan API
│   ├── walletService.ts             # Tạo và import ví
│   ├── walletStorage.ts              # IndexedDB storage cho ví
│   └── tokenPrice.ts                 # Tính giá token (USD)
│
├── types/               # TypeScript Type Definitions
│   └── index.ts
│
├── utils/               # Utility Functions
│   └── format.ts        # Format address, timestamp, etc.
│
└── data/               # Static Data
    └── mockData.ts     # Network configs, faucet links
```

---

## 🔐 Các Khái niệm Blockchain được Áp dụng

### 1. Wallet và Private Key Management

**Khái niệm:**
- **Private Key**: Một số ngẫu nhiên 256-bit dùng để ký giao dịch và chứng minh quyền sở hữu
- **Public Key**: Được derive từ private key, dùng để tạo địa chỉ ví
- **Address**: Địa chỉ công khai của ví, dạng `0x...` (42 ký tự)

**Implementation trong dự án:**
```typescript
// src/services/walletService.ts
import { Wallet } from 'ethers'

// Tạo ví mới: ethers.js tự động generate private key ngẫu nhiên
export function createNewWallet(label?: string): WalletAccount {
  const wallet = Wallet.createRandom()
  return {
    id: crypto.randomUUID(),
    label: label || 'Ví mới',
    address: wallet.address,        // Public address
    privateKey: wallet.privateKey,  // Private key (BẢO MẬT)
    createdAt: new Date().toISOString(),
  }
}
```

**Lưu trữ:**
- Private keys được lưu trong IndexedDB (local storage của browser)
- **LƯU Ý BẢO MẬT**: Trong production, private keys KHÔNG BAO GIỜ được lưu plaintext
- Dự án này chỉ dùng cho học tập trên testnet

### 2. Transaction Lifecycle

**Quy trình gửi giao dịch blockchain:**

```
1. User Input
   ↓
2. Validate Input (address, amount)
   ↓
3. Fetch Nonce (transaction count)
   ↓
4. Get Gas Price (current network fee)
   ↓
5. Calculate Gas Limit (21000 for native transfer)
   ↓
6. Check Balance (amount + gas fee)
   ↓
7. Sign Transaction (with private key)
   ↓
8. Broadcast Transaction (send to network)
   ↓
9. Get Transaction Hash
   ↓
10. Monitor Status (optional - via explorer)
```

**Implementation:**
```typescript
// src/services/testnet.ts - sendNativeTransaction()

// Bước 1-2: Validate và parse
const amountInWei = parseEther(draft.amount)  // Convert ETH → Wei

// Bước 3: Lấy nonce (số thứ tự giao dịch)
const nonce = await provider.getTransactionCount(wallet.address, 'pending')

// Bước 4: Lấy gas price
const feeData = await provider.getFeeData()
const gasPrice = feeData.gasPrice || parseEther('0.00000005')

// Bước 5: Gas limit cho native transfer luôn là 21000
const gasLimit = 21000n

// Bước 6: Kiểm tra số dư
const totalCost = amountInWei + (gasLimit * gasPrice)
const balance = await provider.getBalance(wallet.address)
if (balance < totalCost) throw new Error('Insufficient funds')

// Bước 7-8: Ký và gửi
const txRequest = {
  to: draft.to,
  value: amountInWei,
  gasLimit,
  gasPrice,
  nonce,
  chainId: Number(network.chainId),
  type: 0  // Legacy transaction
}
const tx = await wallet.sendTransaction(txRequest)

// Bước 9: Trả về hash
return { hash: tx.hash, status: 'success' }
```

### 3. Nonce và Transaction Ordering

**Khái niệm:**
- **Nonce**: Số thứ tự giao dịch của một địa chỉ, bắt đầu từ 0
- Mỗi giao dịch phải có nonce duy nhất và tăng dần
- Blockchain sử dụng nonce để đảm bảo thứ tự giao dịch và tránh double-spending

**Ví dụ:**
```
Address: 0x123...
Transaction 1: nonce = 0  → Gửi 0.1 ETH
Transaction 2: nonce = 1  → Gửi 0.2 ETH
Transaction 3: nonce = 2  → Gửi 0.05 ETH
```

**Implementation:**
```typescript
// Lấy nonce hiện tại (pending = true nghĩa là bao gồm cả giao dịch chưa được confirm)
const nonce = await provider.getTransactionCount(wallet.address, 'pending')
```

### 4. Gas Fees và Transaction Costs

**Khái niệm:**
- **Gas**: Đơn vị tính toán trên Ethereum blockchain
- **Gas Limit**: Số gas tối đa có thể sử dụng (21000 cho native transfer)
- **Gas Price**: Giá của mỗi đơn vị gas (tính bằng wei)
- **Total Cost**: `amount + (gasLimit × gasPrice)`

**Tối ưu trong dự án:**
- Hardcode `gasLimit = 21000` cho native transfer (không cần estimateGas)
- Sử dụng Legacy transaction (type 0) thay vì EIP-1559 để đơn giản hóa
- Không đợi transaction confirmation (tx.wait()) để tránh polling RPC

### 5. RPC Provider và Network Communication

**Khái niệm:**
- **RPC (Remote Procedure Call)**: Giao thức để giao tiếp với blockchain node
- **Provider**: Đối tượng trong ethers.js đại diện cho kết nối đến blockchain
- **Static Network Config**: Cấu hình network tĩnh để tránh auto-detection (giảm requests)

**Implementation:**
```typescript
// src/services/testnet.ts
function getProvider(network: Network): JsonRpcProvider {
  if (!providerCache.has(network.rpc)) {
    const provider = new JsonRpcProvider(
      network.rpc,
      {
        chainId: Number(network.chainId),
        name: network.name
      },
      {
        staticNetwork: true,  // QUAN TRỌNG: Ngăn auto-detect network
        batchMaxCount: 1      // Tắt batch để tránh lỗi RPC public
      }
    )
    providerCache.set(network.rpc, provider)
  }
  return providerCache.get(network.rpc)!
}
```

**Tối ưu RPC Calls:**
- Cache provider instances để tái sử dụng
- Gọi song song các RPC calls không phụ thuộc nhau (`Promise.all`)
- Set đầy đủ transaction params để tránh ethers tự động fetch

### 6. Transaction Signing và Broadcasting

**Quy trình ký giao dịch:**

1. **Tạo Transaction Object**: Chứa to, value, gasLimit, gasPrice, nonce, chainId
2. **Sign với Private Key**: Wallet dùng private key để tạo chữ ký số
3. **Serialize**: Chuyển transaction đã ký thành raw bytes
4. **Broadcast**: Gửi raw transaction đến network qua `eth_sendRawTransaction`

**Ethers.js tự động xử lý:**
```typescript
// wallet.sendTransaction() tự động:
// 1. Ký transaction với private key
// 2. Serialize thành raw transaction
// 3. Gọi RPC eth_sendRawTransaction
// 4. Trả về transaction hash
const tx = await wallet.sendTransaction(txRequest)
// tx.hash là transaction hash (0x...)
```

---

## 🔄 Data Flow và State Management

### 1. Wallet Management Flow

```
User Action (Create/Import Wallet)
    ↓
useWalletManager Hook
    ↓
walletService (generate/import)
    ↓
walletStorage (save to IndexedDB)
    ↓
State Update (React State)
    ↓
UI Re-render
```

### 2. Transaction Flow

```
User fills form → Submit
    ↓
handleSubmitTx (App.tsx)
    ↓
Validation (address, amount, balance)
    ↓
sendNativeTransaction (testnet.ts)
    ↓
Fetch: nonce, gasPrice, balance
    ↓
Create & Sign Transaction
    ↓
Broadcast to Network
    ↓
Return Transaction Hash
    ↓
Update UI (success/error message)
    ↓
Record to Activity Feed
    ↓
Refresh Transaction History (after 2s delay)
```

### 3. Blockchain Data Fetching

```
Component Mount / Network Change
    ↓
useBlockchainData Hook
    ↓
Parallel Fetch (Promise.all):
  - getWalletNativeBalance()
  - getNetworkPulse() (blockNumber, gasPrice)
    ↓
Update State
    ↓
Components Re-render with new data
```

---

## 🛠️ Technical Decisions và Trade-offs

### 1. Tại sao không dùng estimateGas?

**Vấn đề:**
- `estimateGas` thường gây lỗi 429 (rate limit) trên RPC testnet công cộng
- Native transfer (chuyển ETH/POL/BASE) LUÔN cần đúng 21000 gas

**Giải pháp:**
```typescript
// Hardcode thay vì estimate
const gasLimit = 21000n  // Không cần RPC call
```

**Trade-off:**
- ✅ Giảm 1 RPC call quan trọng
- ✅ Tránh lỗi rate limit
- ❌ Chỉ áp dụng được cho native transfer (không dùng cho smart contract calls)

### 2. Tại sao dùng Legacy Transaction (Type 0)?

**Vấn đề:**
- EIP-1559 (Type 2) yêu cầu RPC tính toán `baseFee` chính xác
- Nhiều testnet RPC public xử lý EIP-1559 kém → lỗi "underpriced"

**Giải pháp:**
```typescript
const txRequest = {
  // ...
  type: 0  // Legacy transaction
}
```

**Trade-off:**
- ✅ Đơn giản hơn, ổn định hơn trên testnet
- ✅ Không cần tính toán baseFee
- ❌ Không tận dụng được cơ chế EIP-1559 (nhưng không quan trọng trên testnet)

### 3. Tại sao không đợi Transaction Confirmation?

**Vấn đề:**
- `tx.wait()` sẽ polling RPC liên tục để check status
- Nếu network lag, có thể timeout hoặc gây nhiều requests

**Giải pháp:**
```typescript
// Trả về hash ngay sau khi broadcast
const tx = await wallet.sendTransaction(txRequest)
return { hash: tx.hash, status: 'success' }
// Không gọi tx.wait()
```

**Trade-off:**
- ✅ UI phản hồi nhanh
- ✅ Không bị treo nếu RPC chậm
- ✅ Giảm số lượng RPC calls
- ❌ Không biết ngay transaction có thành công hay không (user check trên explorer)

### 4. Tại sao dùng Static Network Config?

**Vấn đề:**
- Ethers.js mặc định sẽ auto-detect network (gọi `eth_chainId`)
- Gây thêm RPC calls không cần thiết

**Giải pháp:**
```typescript
const provider = new JsonRpcProvider(rpc, {
  chainId: Number(network.chainId),
  name: network.name
}, {
  staticNetwork: true  // Ngăn auto-detect
})
```

**Trade-off:**
- ✅ Giảm RPC calls
- ✅ Tăng performance
- ❌ Phải tự quản lý chainId (nhưng đã có trong config)

---

## 📚 Các Khái niệm Blockchain Quan trọng

### 1. Wei và Unit Conversion

**Ethereum sử dụng hệ thống đơn vị:**
- **Wei**: Đơn vị nhỏ nhất (1 ETH = 10^18 Wei)
- **Gwei**: 1 Gwei = 10^9 Wei (dùng cho gas price)
- **Ether**: Đơn vị chính

**Conversion trong code:**
```typescript
import { parseEther, formatEther } from 'ethers'

// ETH → Wei
const amountInWei = parseEther('0.1')  // 100000000000000000 wei

// Wei → ETH
const amountInEth = formatEther(amountInWei)  // "0.1"
```

### 2. Transaction Hash và Explorer

**Transaction Hash:**
- Mã định danh duy nhất của mỗi giao dịch
- Dạng `0x` + 64 ký tự hex (tổng 66 ký tự)
- Được tạo từ nội dung transaction đã ký

**Explorer:**
- Công cụ để xem chi tiết transaction trên blockchain
- Ví dụ: Etherscan (Ethereum), Polygonscan (Polygon)
- URL format: `{explorer}/tx/{hash}`

### 3. Testnet vs Mainnet

**Testnet:**
- Mạng blockchain dùng để test, không dùng tiền thật
- Có thể claim test tokens miễn phí từ faucet
- Dự án này chỉ hỗ trợ testnet

**Mainnet:**
- Mạng blockchain thật, dùng tiền thật
- Cần cẩn thận với private keys và transactions

---

## 🔧 Công nghệ Sử dụng

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool

### Blockchain
- **Ethers.js v6**: Thư viện tương tác với blockchain
  - Wallet management
  - Transaction signing
  - RPC communication

### Storage
- **IndexedDB** (via `idb`): Lưu trữ ví local
  - Persistent storage trong browser
  - Không bị mất khi refresh

### APIs
- **Etherscan API V2**: Lấy lịch sử giao dịch
- **RPC Providers**: 
  - Tenderly Gateway (Sepolia)
  - Polygon RPC (Amoy)
  - Base RPC (Base Sepolia)

---

## 🚀 Cách Chạy Dự án

### 1. Cài đặt Dependencies

```bash
npm install
```

### 2. Cấu hình Environment Variables (Optional)

Tạo file `.env`:
```env
VITE_RPC_SEPOLIA=https://sepolia.gateway.tenderly.co
VITE_RPC_AMOY=https://rpc-amoy.polygon.technology
VITE_RPC_BASE_SEPOLIA=https://sepolia.base.org
VITE_ETHERSCAN_API_KEY=your_api_key_here
```

### 3. Chạy Development Server

```bash
npm run dev
```

### 4. Build Production

```bash
npm run build
```

---

## 📖 Hướng dẫn Sử dụng

### Tạo Ví Mới
1. Click "Tạo ví mới" trong Wallet Panel
2. Hệ thống tự động generate private key và address
3. Ví được lưu vào IndexedDB

### Import Ví
1. Click "Import ví" trong Wallet Panel
2. Nhập private key (dạng `0x...`)
3. Hệ thống validate và tạo ví từ private key

### Gửi Giao dịch
1. Chọn network (Sepolia/Amoy/Base Sepolia)
2. Nhập địa chỉ nhận và số lượng
3. Click "Gửi giao dịch"
4. Hệ thống sẽ:
   - Validate input
   - Kiểm tra số dư
   - Ký và gửi transaction
   - Hiển thị transaction hash và link đến explorer

### Xem Lịch sử Giao dịch
- Tự động fetch từ Etherscan API
- Hiển thị cả giao dịch gửi (sent) và nhận (received)
- Click "Chi tiết" để xem thông tin đầy đủ
- Click "Explorer" để mở trên blockchain explorer

### Hình ảnh ứng dụng
<img width="1232" height="1176" alt="image" src="https://github.com/user-attachments/assets/4584dfae-7c53-4454-846f-b4d19d9b57d2" />
<img width="1221" height="597" alt="image" src="https://github.com/user-attachments/assets/fe958084-b978-418e-bf82-53a3be2db3cf" />

---

## 🔍 Chi tiết Kỹ thuật

### 1. Transaction Signing Process

**ECDSA (Elliptic Curve Digital Signature Algorithm):**
- Ethereum sử dụng secp256k1 curve
- Private key → Public key → Address
- Mỗi transaction được ký bằng private key
- Chữ ký chứng minh quyền sở hữu mà không tiết lộ private key

**Flow trong ethers.js:**
```
Transaction Object
    ↓
Serialize to RLP (Recursive Length Prefix)
    ↓
Hash with Keccak-256
    ↓
Sign with ECDSA (using private key)
    ↓
Append signature to transaction
    ↓
Serialize to raw bytes
    ↓
Send via eth_sendRawTransaction
```

### 2. RPC Methods Sử dụng

**Các RPC calls trong dự án:**

| Method | Mục đích | Khi nào gọi |
|--------|----------|-------------|
| `eth_getBalance` | Lấy số dư | Khi load wallet, trước khi gửi |
| `eth_getTransactionCount` | Lấy nonce | Trước mỗi transaction |
| `eth_gasPrice` | Lấy gas price | Trước mỗi transaction |
| `eth_sendRawTransaction` | Gửi transaction | Khi user submit form |
| `eth_getBlockNumber` | Lấy block hiện tại | Để hiển thị network pulse |

**Tối ưu:**
- Cache provider để tái sử dụng connection
- Gọi song song các calls không phụ thuộc
- Set static network để tránh `eth_chainId` call

### 3. Error Handling

**Các loại lỗi phổ biến:**

1. **Rate Limit (429)**
   - Nguyên nhân: Quá nhiều requests đến RPC
   - Giải pháp: Giảm số lượng RPC calls, cache data

2. **Insufficient Funds**
   - Nguyên nhân: Số dư không đủ (amount + gas fee)
   - Giải pháp: Validate trước khi gửi

3. **Invalid Address**
   - Nguyên nhân: Địa chỉ không hợp lệ
   - Giải pháp: Validate bằng `getAddress()` từ ethers

4. **Network Error**
   - Nguyên nhân: RPC không phản hồi
   - Giải pháp: Retry logic hoặc fallback RPC

---

## 🎓 Bài học Rút ra

### 1. Blockchain Transaction là Asynchronous

- Transaction được broadcast ngay lập tức
- Nhưng phải đợi được mine vào block mới được confirm
- Có thể mất vài giây đến vài phút tùy network

### 2. Gas Fees là Chi phí Bắt buộc

- Mọi transaction đều cần trả gas fee
- Gas price thay đổi theo network congestion
- Phải tính toán: `amount + gasFee` khi kiểm tra số dư

### 3. Private Key = Quyền Sở hữu

- Ai có private key = sở hữu ví
- Private key không thể khôi phục nếu mất
- Phải bảo mật tuyệt đối

### 4. Testnet là Môi trường An toàn

- Có thể thử nghiệm mà không lo mất tiền
- Test tokens miễn phí từ faucet
- Phù hợp cho học tập và development

---

## 📝 Ghi chú Quan trọng

### Bảo mật
- ⚠️ **KHÔNG** dùng private keys thật trong dự án này
- ⚠️ Private keys được lưu plaintext trong IndexedDB (chỉ cho testnet)
- ⚠️ Trong production, cần sử dụng hardware wallet hoặc secure key management

### Rate Limiting
- RPC providers công cộng có giới hạn requests
- Dự án đã tối ưu để giảm số lượng calls
- Nếu gặp 429, đợi 30s rồi thử lại

### Network Reliability
- Testnet RPC có thể không ổn định
- Có thể cần thay đổi RPC endpoint nếu gặp vấn đề
- Sử dụng environment variables để dễ thay đổi

---

## 🔗 Tài liệu Tham khảo

- [Ethers.js Documentation](https://docs.ethers.org/)
- [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)
- [EIP-1559: Fee Market Change](https://eips.ethereum.org/EIPS/eip-1559)
- [Ethereum RPC Methods](https://ethereum.org/en/developers/docs/apis/json-rpc/)

---

## 📄 License

Dự án này được tạo cho mục đích học tập.

---

**Lưu ý:** Đây là dự án học tập, không nên sử dụng với mainnet hoặc tiền thật. Luôn test kỹ trên testnet trước khi deploy lên production.

