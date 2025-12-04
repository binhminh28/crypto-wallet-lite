# 3.4.3. Tối ưu hóa phí gas và transaction type

## Tổng quan

Phí gas là chi phí phải trả để thực hiện giao dịch trên blockchain Ethereum. Việc tối ưu hóa phí gas giúp người dùng tiết kiệm chi phí và đảm bảo giao dịch được xác nhận nhanh chóng. Crypto Wallet Lite triển khai hệ thống tối ưu hóa gas tự động hỗ trợ cả hai loại giao dịch: **Legacy (Type 0)** và **EIP-1559 (Type 2)**.

## 1. Các loại Transaction Type

### 1.1. Legacy Transaction (Type 0)

**Đặc điểm:**
- Là định dạng giao dịch truyền thống trước khi EIP-1559 được triển khai
- Sử dụng tham số `gasPrice` đơn giản
- Phí gas = `gasLimit × gasPrice`
- Phù hợp với hầu hết các testnet (Sepolia, Amoy)

**Cấu trúc:**
```typescript
{
  to: "0x...",
  value: amountInWei,
  gasLimit: 21000n,
  gasPrice: 20000000000n, // 20 Gwei
  nonce: 5,
  chainId: 11155111,
  type: 0
}
```

**Ưu điểm:**
- Đơn giản, dễ hiểu
- Được hỗ trợ rộng rãi trên mọi mạng
- Phù hợp cho môi trường testnet

**Nhược điểm:**
- Không linh hoạt khi mạng quá tải
- Có thể trả phí cao hơn cần thiết
- Không có cơ chế ưu tiên giao dịch rõ ràng

### 1.2. EIP-1559 Transaction (Type 2)

**Đặc điểm:**
- Được giới thiệu trong bản nâng cấp London (EIP-1559)
- Sử dụng hai tham số: `maxFeePerGas` và `maxPriorityFeePerGas`
- Tự động điều chỉnh phí dựa trên tình trạng mạng
- Phí base được đốt (burned), phí priority được trả cho miner

**Cấu trúc:**
```typescript
{
  to: "0x...",
  value: amountInWei,
  gasLimit: 21000n,
  maxFeePerGas: 30000000000n,        // Phí tối đa sẵn sàng trả
  maxPriorityFeePerGas: 2000000000n,  // Phí tip cho miner
  nonce: 5,
  chainId: 1,
  type: 2
}
```

**Công thức tính phí:**
```
actualFee = min(maxFeePerGas, baseFee + maxPriorityFeePerGas) × gasUsed
```

**Ưu điểm:**
- Dự đoán phí chính xác hơn
- Tiết kiệm chi phí trong điều kiện bình thường
- Ưu tiên giao dịch rõ ràng thông qua priority fee
- Cơ chế đốt base fee giúp kiểm soát lạm phát

**Nhược điểm:**
- Phức tạp hơn Legacy
- Chưa được hỗ trợ trên một số testnet cũ

## 2. Chiến lược tối ưu hóa Gas

### 2.1. Ước tính Gas Limit

Gas limit là lượng gas tối đa được phép sử dụng cho giao dịch. Crypto Wallet Lite ước tính gas limit thông qua:

**Bước 1: Gọi `estimateGas()` từ provider**
```typescript
const estimated = await provider.estimateGas({
  from: walletAddress,
  to: recipientAddress,
  value: amountInWei
})
```

**Bước 2: Thêm buffer 20%**
```typescript
const gasLimit = (estimated × 120) / 100
```

**Lý do thêm buffer:**
- Tránh giao dịch thất bại do out-of-gas
- Bù đắp sự thay đổi trạng thái blockchain giữa ước tính và thực thi
- Đảm bảo an toàn cho các giao dịch phức tạp

**Ví dụ:**
- Giao dịch ETH thông thường: 21,000 gas
- Sau khi thêm buffer: 25,200 gas
- Giao dịch token ERC-20: ~50,000 - 65,000 gas

### 2.2. Tối ưu Gas Price

Ứng dụng cung cấp 3 mức tốc độ với hệ số điều chỉnh khác nhau:

| Tốc độ | Hệ số nhân | Mô tả | Phù hợp với |
|--------|-----------|-------|-------------|
| **Slow** | 0.8x | Rẻ nhất, chậm nhất | Giao dịch không gấp |
| **Standard** | 1.0x | Cân bằng giữa giá và tốc độ | Đa số trường hợp |
| **Fast** | 1.2x | Nhanh nhất, đắt nhất | Giao dịch khẩn cấp |

**Công thức áp dụng:**

**Cho Legacy:**
```typescript
gasPrice = baseGasPrice × multiplier
estimatedCost = gasLimit × gasPrice
```

**Cho EIP-1559:**
```typescript
maxPriorityFeePerGas = basePriorityFee × multiplier
maxFeePerGas = baseMaxFee × multiplier
estimatedCost = gasLimit × maxFeePerGas
```

### 2.3. Tự động chọn Transaction Type

Hệ thống tự động phát hiện loại transaction phù hợp:

```typescript
// 1. Lấy thông tin phí từ mạng
const feeData = await provider.getFeeData()

// 2. Kiểm tra hỗ trợ EIP-1559
const supportsEIP1559 = 
  feeData.maxFeePerGas !== null && 
  feeData.maxPriorityFeePerGas !== null

// 3. Chọn loại phù hợp
const txType = supportsEIP1559 
  ? TransactionType.EIP1559 
  : TransactionType.LEGACY
```

**Lưu ý:** Người dùng có thể ép buộc loại transaction thông qua tham số `forceType`.

## 3. Triển khai trong Code

### 3.1. Module Gas Optimizer

File: `src/services/blockchain/gas-optimizer.ts`

**Các chức năng chính:**

#### `estimateOptimalGas()`
Ước tính phí gas tối ưu cho một giao dịch:

```typescript
const gasEstimate = await estimateOptimalGas(
  network,        // Mạng blockchain (Sepolia, Amoy, ...)
  fromAddress,    // Địa chỉ người gửi
  toAddress,      // Địa chỉ người nhận
  valueInWei,     // Số lượng ETH gửi
  {
    speed: 'standard',  // 'slow' | 'standard' | 'fast'
    forceType: undefined // TransactionType.LEGACY | TransactionType.EIP1559
  }
)
```

**Kết quả trả về:**
```typescript
{
  gasLimit: 25200n,
  gasPrice: 20000000000n,  // Nếu Legacy
  maxFeePerGas: 30000000000n,  // Nếu EIP-1559
  maxPriorityFeePerGas: 2000000000n,  // Nếu EIP-1559
  estimatedCost: 504000000000000n,  // Wei
  type: TransactionType.LEGACY
}
```

#### `compareGasCosts()`
So sánh chi phí giữa 3 mức tốc độ:

```typescript
const comparison = await compareGasCosts(network, from, to, value)

console.log(comparison)
// {
//   slow: { estimatedCost: "0.0004032 ETH", ... },
//   standard: { estimatedCost: "0.000504 ETH", ... },
//   fast: { estimatedCost: "0.0006048 ETH", ... }
// }
```

#### `formatGasEstimate()`
Format kết quả thành dạng dễ đọc:

```typescript
const formatted = formatGasEstimate(gasEstimate)
// {
//   gasLimit: "25200",
//   gasPrice: "20 Gwei",
//   estimatedCost: "0.000504 ETH",
//   type: "Legacy"
// }
```

### 3.2. Tích hợp vào Transaction Service

File: `src/services/blockchain/transaction.ts`

**Trước khi tối ưu:**
```typescript
// Cách cũ: sử dụng giá trị cố định
const gasLimit = TX_DEFAULTS.GAS_LIMIT  // 21000
const gasPrice = feeData.gasPrice || parseEther(TX_DEFAULTS.DEFAULT_GAS_PRICE)
```

**Sau khi tối ưu:**
```typescript
// Cách mới: ước tính động
const gasEstimate = await estimateOptimalGas(
  network,
  wallet.address,
  draft.to,
  amountInWei,
  { speed: 'standard' }
)

// Xây dựng giao dịch dựa trên loại
if (gasEstimate.type === TransactionType.EIP1559) {
  txRequest = {
    // ... EIP-1559 fields
    maxFeePerGas: gasEstimate.maxFeePerGas,
    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
  }
} else {
  txRequest = {
    // ... Legacy fields
    gasPrice: gasEstimate.gasPrice
  }
}
```

### 3.3. Preview Gas trước khi gửi

Hàm `previewTransactionGas()` cho phép người dùng xem ước tính phí trước khi xác nhận:

```typescript
const preview = await previewTransactionGas({
  network: currentNetwork,
  from: walletAddress,
  draft: {
    to: "0x...",
    amount: "0.01",
    note: ""
  }
})

// Hiển thị cho người dùng
console.log("Slow:", preview.slow.estimatedCost)
console.log("Standard:", preview.standard.estimatedCost)
console.log("Fast:", preview.fast.estimatedCost)
```

## 4. Ví dụ thực tế

### Ví dụ 1: Gửi ETH trên Sepolia (Legacy)

**Input:**
- From: `0xABC...123`
- To: `0xDEF...456`
- Amount: `0.01 ETH`
- Network: Sepolia Testnet

**Quá trình:**

1. **Ước tính gas limit:**
   ```
   Estimated: 21,000 gas
   With buffer: 25,200 gas
   ```

2. **Lấy gas price từ mạng:**
   ```
   Base gas price: 18 Gwei
   Speed: standard (1.0x)
   Final gas price: 18 Gwei
   ```

3. **Tính tổng chi phí:**
   ```
   Gas cost = 25,200 × 18 Gwei = 0.0004536 ETH
   Total cost = 0.01 + 0.0004536 = 0.0104536 ETH
   ```

4. **Kiểm tra số dư:**
   ```
   Balance: 0.05 ETH ✓
   Sufficient: ✓
   ```

5. **Gửi giao dịch:**
   ```typescript
   Transaction Type: Legacy (Type 0)
   Hash: 0x789...abc
   Status: Success
   ```

### Ví dụ 2: So sánh 3 mức tốc độ

**Kịch bản:** Gửi 0.1 ETH trên mạng có base fee = 25 Gwei

| Tốc độ | Gas Price | Phí ước tính | Thời gian xác nhận |
|--------|-----------|--------------|-------------------|
| Slow | 20 Gwei (0.8x) | 0.000504 ETH | ~30s |
| Standard | 25 Gwei (1.0x) | 0.00063 ETH | ~15s |
| Fast | 30 Gwei (1.2x) | 0.000756 ETH | ~10s |

**Tiết kiệm:** Chọn Slow thay vì Fast tiết kiệm được `0.000252 ETH` (~$0.75 nếu ETH = $3000)

## 5. Lợi ích của việc tối ưu hóa

### 5.1. Tiết kiệm chi phí
- Tự động điều chỉnh gas price theo tình trạng mạng
- Tránh trả phí cao không cần thiết
- Buffer 20% đảm bảo giao dịch thành công mà không lãng phí

### 5.2. Tăng tốc độ xác nhận
- Người dùng có thể chọn Fast khi cần gấp
- Tự động ưu tiên phí hợp lý

### 5.3. Tính linh hoạt
- Hỗ trợ cả Legacy và EIP-1559
- Tự động phát hiện loại phù hợp
- Cho phép override thủ công

### 5.4. Trải nghiệm người dùng tốt hơn
- Preview phí trước khi gửi
- Hiển thị rõ ràng chi phí ước tính
- Giảm tỷ lệ giao dịch thất bại

## 6. Hạn chế và Cải tiến

### 6.1. Hạn chế hiện tại

**Phụ thuộc RPC:**
- Nếu RPC trả về fee data không chính xác → ước tính sai
- **Giải pháp:** Sử dụng nhiều RPC provider và lấy trung bình

**Testnet không ổn định:**
- Gas price dao động mạnh
- **Giải pháp:** Cache gas price trong 30s để tránh query liên tục

**Chưa hỗ trợ Gas Token:**
- Một số mạng cho phép trả phí bằng token khác
- **Giải pháp:** Mở rộng trong tương lai

### 6.2. Hướng phát triển

**Tích hợp Gas Station API:**
```typescript
// Ví dụ: Polygon Gas Station
const gasData = await fetch('https://gasstation.polygon.technology/v2')
const json = await gasData.json()
const safeLow = json.safeLow
```

**Machine Learning dự đoán phí:**
- Phân tích lịch sử gas price
- Dự đoán thời điểm tối ưu để gửi giao dịch

**Dynamic Gas Adjustment:**
- Tự động tăng gas price nếu giao dịch pending quá lâu
- Sử dụng `eth_sendRawTransaction` với replacement

## 7. Kết luận

Việc triển khai tối ưu hóa gas trong Crypto Wallet Lite mang lại:

✅ **Tiết kiệm chi phí** cho người dùng  
✅ **Tăng tỷ lệ thành công** của giao dịch  
✅ **Linh hoạt** giữa các mạng blockchain  
✅ **Trải nghiệm tốt** với preview rõ ràng  

Hệ thống tự động chọn giữa Legacy và EIP-1559 dựa trên khả năng của mạng, đồng thời cho phép người dùng điều chỉnh tốc độ theo nhu cầu. Đây là nền tảng quan trọng để phát triển ứng dụng ví blockchain thực tế.
