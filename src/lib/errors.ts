export class ApiError extends Error {
  readonly statusCode: number
  readonly statusText?: string
  readonly response?: unknown

  constructor(
    message: string,
    statusCode: number,
    statusText?: string,
    response?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.statusText = statusText
    this.response = response
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export class RpcError extends Error {
  readonly code?: number | string
  readonly data?: unknown

  constructor(
    message: string,
    code?: number | string,
    data?: unknown
  ) {
    super(message)
    this.name = 'RpcError'
    this.code = code
    this.data = data
    Object.setPrototypeOf(this, RpcError.prototype)
  }
}

export class ValidationError extends Error {
  readonly field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class WalletError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'WalletError'
    this.code = code
    Object.setPrototypeOf(this, WalletError.prototype)
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 429) {
      return 'RPC đang bận (429). Vui lòng đợi 30s rồi thử lại.'
    }
    if (error.statusCode >= 500) {
      return 'Lỗi server. Vui lòng thử lại sau.'
    }
    if (error.statusCode === 404) {
      return 'Không tìm thấy dữ liệu.'
    }
    return error.message || `Lỗi HTTP ${error.statusCode}`
  }
  
  if (error instanceof RpcError) {
    if (error.code === 429) {
      return 'RPC đang bận (429). Vui lòng đợi 30s rồi thử lại.'
    }
    if (error.message.toLowerCase().includes('insufficient funds')) {
      return 'Số dư không đủ để thực hiện giao dịch.'
    }
    return error.message || 'Lỗi RPC không xác định'
  }
  
  if (error instanceof ValidationError) {
    return error.message
  }
  
  if (error instanceof WalletError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'Lỗi không xác định'
}

