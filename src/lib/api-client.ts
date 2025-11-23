import { ApiError } from './errors'

export interface ApiClientOptions {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  retries?: number
  retryDelay?: number
}

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Headers
}

export class ApiClient {
  private baseURL: string
  private timeout: number
  private defaultHeaders: Record<string, string>
  private retries: number
  private retryDelay: number

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || ''
    this.timeout = options.timeout || 30000
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    this.retries = options.retries ?? 0
    this.retryDelay = options.retryDelay ?? 1000
  }

  private createAbortController(): AbortController {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), this.timeout)
    return controller
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retriesLeft: number = this.retries
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retriesLeft > 0 && this.shouldRetry(error)) {
        await this.delay(this.retryDelay)
        return this.executeWithRetry(fn, retriesLeft - 1)
      }
      throw error
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.statusCode >= 500 || error.statusCode === 429
    }
    if (error instanceof Error) {
      return error.name === 'AbortError' || error.message.includes('network')
    }
    return false
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      let errorData: unknown
      try {
        errorData = await response.json()
      } catch {
        try {
          errorData = await response.text()
        } catch {
          errorData = null
        }
      }

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText,
        errorData
      )
    }

    let data: T
    try {
      data = await response.json()
    } catch (error) {
      throw new ApiError(
        'Invalid JSON response',
        200,
        'OK',
        error
      )
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }
  }

  async get<T = unknown>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const controller = this.createAbortController()

    const requestFn = async () => {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      })

      return this.handleResponse<T>(response)
    }

    return this.executeWithRetry(requestFn)
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const controller = this.createAbortController()

    const requestFn = async () => {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...options,
      })

      return this.handleResponse<T>(response)
    }

    return this.executeWithRetry(requestFn)
  }
}

export const apiClient = new ApiClient({
  timeout: 30000,
  retries: 1,
  retryDelay: 1000,
})

