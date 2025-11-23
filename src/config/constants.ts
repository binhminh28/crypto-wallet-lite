export const API_CONFIG = {
  ETHERSCAN_BASE_URL: 'https://api.etherscan.io/v2/api',
  TIMEOUT: 30000,
  RETRIES: 1,
  RETRY_DELAY: 1000,
} as const

export const TX_DEFAULTS = {
  GAS_LIMIT: 21000n,
  DEFAULT_GAS_PRICE: '0.00000005',
  DEFAULT_GAS_PRICE_FORMATTED: '0.000000021',
} as const

export const ADDRESS = {
  LENGTH: 42,
  PREFIX: '0x',
} as const

export const PRIVATE_KEY = {
  LENGTH: 66,
  PREFIX: '0x',
} as const

export const SEED_PHRASE = {
  WORD_COUNT_OPTIONS: [12, 24] as const,
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_PAGE: 1,
} as const

export const EXPLORER_API = {
  DEFAULT_START_BLOCK: '0',
  DEFAULT_END_BLOCK: '99999999',
  SORT_DESC: 'desc',
} as const

