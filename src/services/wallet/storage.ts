import { openDB, type IDBPDatabase } from 'idb'
import type { WalletAccount } from '../../types'

const DB_NAME = 'crypto-wallet-db'
const DB_VERSION = 1
const STORE_NAME = 'wallets'

let dbInstance: IDBPDatabase | null = null

async function getDB() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })

  return dbInstance
}

export async function saveWallet(wallet: WalletAccount): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, wallet)
}

export async function getAllWallets(): Promise<WalletAccount[]> {
  const db = await getDB()
  const wallets = await db.getAll(STORE_NAME)
  return wallets.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getWalletById(id: string): Promise<WalletAccount | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function deleteWallet(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function updateWallet(wallet: WalletAccount): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, wallet)
}

export async function clearAllWallets(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}

