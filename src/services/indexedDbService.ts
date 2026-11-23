// indexedDbService.ts
// Persiste o FileSystemFileHandle no IndexedDB para reconexão sem re-abrir o explorador

const DB_NAME = 'vagas-games-db'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const HANDLE_KEY = 'xlsx-file-handle'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function clearHandle(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(HANDLE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

export async function checkHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  try {
    // @ts-expect-error FileSystemHandle.queryPermission may not be in all type defs
    return await handle.queryPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}

export async function requestHandlePermission(
  handle: FileSystemFileHandle
): Promise<PermissionState> {
  try {
    // @ts-expect-error FileSystemHandle.requestPermission may not be in all type defs
    return await handle.requestPermission({ mode: 'readwrite' })
  } catch {
    return 'denied'
  }
}
