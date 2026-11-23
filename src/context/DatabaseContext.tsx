// DatabaseContext.tsx
// Estado global, fila de gravação com mutex (saveMutexRef) e cruzamento Vagas x Excel

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'
import type { Vaga } from '../types/job'
import type {
  DatabaseState,
  RowFavorita,
  RowInscricao,
  RowVisualizada,
  RowDescartada,
  StatusProcesso,
} from '../types/database'
import {
  loadFromStorage,
  saveToStorage,
} from '../services/storageService'
import {
  saveHandle,
  loadHandle,
  clearHandle,
  checkHandlePermission,
  requestHandlePermission,
} from '../services/indexedDbService'
import {
  readFromHandle,
  writeToHandle,
  createNewXlsx,
  openXlsxPicker,
  downloadWorkbook,
  isFileSystemAccessSupported,
  generateId,
  workbookToArrayBuffer,
  readWorkbook,
} from '../services/excelService'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type ConnectionStatus =
  | 'disconnected'
  | 'needs-permission'
  | 'connected'
  | 'syncing'
  | 'error'

interface DatabaseContextValue {
  // Estado do banco
  db: DatabaseState
  connectionStatus: ConnectionStatus
  connectedFileName: string | null
  fileHandle: FileSystemFileHandle | null
  fsaSupported: boolean

  // Ações de conexão
  createNewDatabase: () => Promise<void>
  linkExistingDatabase: () => Promise<void>
  reconnectWithPermission: () => Promise<void>
  disconnectDatabase: () => Promise<void>
  exportBackup: () => void
  importBackupFile: (file: File) => Promise<void>

  // Ações de negócio (otimistas + enfileiradas para disco)
  favoritar: (vaga: Vaga) => Promise<void>
  desfavoritar: (vagaId: string) => Promise<void>
  marcarInscrita: (vaga: Vaga) => Promise<void>
  atualizarInscricao: (vagaId: string, patch: Partial<Pick<RowInscricao, 'statusProcesso' | 'notas'>>) => Promise<void>
  marcarVisualizada: (vaga: Vaga) => Promise<void>
  descartar: (vaga: Vaga, motivo?: string) => Promise<void>
  restaurarDescarte: (vagaId: string) => Promise<void>
  atualizarNotaFavorita: (vagaId: string, notas: string) => Promise<void>

  // Helpers de estado
  isFavorita: (vagaId: string) => boolean
  isInscrita: (vagaId: string) => boolean
  isVisualizada: (vagaId: string) => boolean
  isDescartada: (vagaId: string) => boolean
}

// ─── Context ───────────────────────────────────────────────────────────────────

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabaseContext must be used inside <DatabaseProvider>')
  return ctx
}

// ─── Provider ──────────────────────────────────────────────────────────────────

interface Props { children: ReactNode }

export function DatabaseProvider({ children }: Props) {
  const [db, setDb] = useState<DatabaseState>(loadFromStorage)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [connectedFileName, setConnectedFileName] = useState<string | null>(null)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const fsaSupported = isFileSystemAccessSupported()

  // Mutex: todas as gravações físicas são enfileiradas
  const saveMutexRef = useRef<Promise<void>>(Promise.resolve())

  // ─── Atualização de estado + cache + gravação ──────────────────────────────

  const applyState = useCallback((next: DatabaseState) => {
    setDb(next)
    saveToStorage(next)
  }, [])

  const enqueueSave = useCallback(
    (handle: FileSystemFileHandle, getState: () => DatabaseState) => {
      saveMutexRef.current = saveMutexRef.current.then(async () => {
        try {
          await writeToHandle(handle, getState())
        } catch (err) {
          console.error('Falha ao salvar planilha:', err)
        }
      })
    },
    []
  )

  // Ref sempre atualizado para closures dentro da fila
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])

  // ─── Inicialização: tenta recuperar handle do IndexedDB ────────────────────

  useEffect(() => {
    async function init() {
      const handle = await loadHandle()
      if (!handle) return

      setFileHandle(handle)
      const perm = await checkHandlePermission(handle)

      if (perm === 'granted') {
        setConnectionStatus('syncing')
        try {
          const state = await readFromHandle(handle)
          applyState(state)
          setConnectedFileName(handle.name)
          setConnectionStatus('connected')
        } catch {
          setConnectionStatus('error')
        }
      } else {
        setConnectedFileName(handle.name)
        setConnectionStatus('needs-permission')
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Conexão ───────────────────────────────────────────────────────────────

  async function createNewDatabase() {
    const handle = await createNewXlsx()
    if (!handle) return

    const emptyState: DatabaseState = {
      favoritas: [], inscricoes: [], visualizadas: [], descartadas: [],
      lastSync: new Date().toISOString(),
    }
    setConnectionStatus('syncing')
    try {
      await writeToHandle(handle, emptyState)
      await saveHandle(handle)
      setFileHandle(handle)
      setConnectedFileName(handle.name)
      applyState(emptyState)
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    }
  }

  async function linkExistingDatabase() {
    const handle = await openXlsxPicker()
    if (!handle) return

    setConnectionStatus('syncing')
    try {
      const state = await readFromHandle(handle)
      await saveHandle(handle)
      setFileHandle(handle)
      setConnectedFileName(handle.name)
      applyState(state)
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    }
  }

  async function reconnectWithPermission() {
    if (!fileHandle) return
    const perm = await requestHandlePermission(fileHandle)
    if (perm !== 'granted') return

    setConnectionStatus('syncing')
    try {
      const state = await readFromHandle(fileHandle)
      applyState(state)
      setConnectedFileName(fileHandle.name)
      setConnectionStatus('connected')
    } catch {
      setConnectionStatus('error')
    }
  }

  async function disconnectDatabase() {
    await clearHandle()
    setFileHandle(null)
    setConnectedFileName(null)
    setConnectionStatus('disconnected')
  }

  function exportBackup() {
    downloadWorkbook(dbRef.current)
  }

  async function importBackupFile(file: File) {
    setConnectionStatus('syncing')
    try {
      const state = await readWorkbook(file)
      applyState(state)
      setConnectionStatus(fileHandle ? 'connected' : 'disconnected')
    } catch {
      setConnectionStatus('error')
    }
  }

  // ─── Ações de negócio ──────────────────────────────────────────────────────

  function schedule(next: DatabaseState) {
    applyState(next)
    if (fileHandle && connectionStatus === 'connected') {
      const snapshot = next
      enqueueSave(fileHandle, () => snapshot)
    }
  }

  async function favoritar(vaga: Vaga) {
    if (dbRef.current.favoritas.some(f => f.vagaId === vaga.vagaId)) return
    const row: RowFavorita = {
      id: generateId('fav', dbRef.current.favoritas.length),
      vagaId: vaga.vagaId,
      titulo: vaga.titulo,
      estudio: vaga.estudio,
      area: vaga.area,
      modelo: vaga.modelo,
      local: vaga.local,
      link: vaga.link,
      dataFavoritada: new Date().toISOString(),
      notas: '',
    }
    schedule({ ...dbRef.current, favoritas: [...dbRef.current.favoritas, row] })
  }

  async function desfavoritar(vagaId: string) {
    schedule({ ...dbRef.current, favoritas: dbRef.current.favoritas.filter(f => f.vagaId !== vagaId) })
  }

  async function marcarInscrita(vaga: Vaga) {
    if (dbRef.current.inscricoes.some(i => i.vagaId === vaga.vagaId)) return
    const row: RowInscricao = {
      id: generateId('ins', dbRef.current.inscricoes.length),
      vagaId: vaga.vagaId,
      titulo: vaga.titulo,
      estudio: vaga.estudio,
      area: vaga.area,
      modelo: vaga.modelo,
      link: vaga.link,
      dataInscricao: new Date().toISOString(),
      statusProcesso: 'enviada',
      notas: '',
    }
    schedule({ ...dbRef.current, inscricoes: [...dbRef.current.inscricoes, row] })
  }

  async function atualizarInscricao(
    vagaId: string,
    patch: Partial<Pick<RowInscricao, 'statusProcesso' | 'notas'>>
  ) {
    const next = {
      ...dbRef.current,
      inscricoes: dbRef.current.inscricoes.map(i =>
        i.vagaId === vagaId ? { ...i, ...patch } : i
      ),
    }
    schedule(next)
  }

  async function marcarVisualizada(vaga: Vaga) {
    if (dbRef.current.visualizadas.some(v => v.vagaId === vaga.vagaId)) return
    const row: RowVisualizada = {
      id: generateId('vis', dbRef.current.visualizadas.length),
      vagaId: vaga.vagaId,
      titulo: vaga.titulo,
      estudio: vaga.estudio,
      link: vaga.link,
      dataVisualizacao: new Date().toISOString(),
    }
    schedule({ ...dbRef.current, visualizadas: [...dbRef.current.visualizadas, row] })
  }

  async function descartar(vaga: Vaga, motivo = '') {
    const row: RowDescartada = {
      id: generateId('des', dbRef.current.descartadas.length),
      vagaId: vaga.vagaId,
      titulo: vaga.titulo,
      estudio: vaga.estudio,
      link: vaga.link,
      motivoDescarte: motivo,
      dataDescarte: new Date().toISOString(),
    }
    // Remove de favoritas e inscrições se estiver lá
    schedule({
      ...dbRef.current,
      favoritas: dbRef.current.favoritas.filter(f => f.vagaId !== vaga.vagaId),
      descartadas: [...dbRef.current.descartadas.filter(d => d.vagaId !== vaga.vagaId), row],
    })
  }

  async function restaurarDescarte(vagaId: string) {
    schedule({
      ...dbRef.current,
      descartadas: dbRef.current.descartadas.filter(d => d.vagaId !== vagaId),
    })
  }

  async function atualizarNotaFavorita(vagaId: string, notas: string) {
    const next = {
      ...dbRef.current,
      favoritas: dbRef.current.favoritas.map(f =>
        f.vagaId === vagaId ? { ...f, notas } : f
      ),
    }
    schedule(next)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const isFavorita = (vagaId: string) => db.favoritas.some(f => f.vagaId === vagaId)
  const isInscrita = (vagaId: string) => db.inscricoes.some(i => i.vagaId === vagaId)
  const isVisualizada = (vagaId: string) => db.visualizadas.some(v => v.vagaId === vagaId)
  const isDescartada = (vagaId: string) => db.descartadas.some(d => d.vagaId === vagaId)

  // Silencia o warning de unused import
  void workbookToArrayBuffer

  return (
    <DatabaseContext.Provider
      value={{
        db,
        connectionStatus,
        connectedFileName,
        fileHandle,
        fsaSupported,
        createNewDatabase,
        linkExistingDatabase,
        reconnectWithPermission,
        disconnectDatabase,
        exportBackup,
        importBackupFile,
        favoritar,
        desfavoritar,
        marcarInscrita,
        atualizarInscricao,
        marcarVisualizada,
        descartar,
        restaurarDescarte,
        atualizarNotaFavorita,
        isFavorita,
        isInscrita,
        isVisualizada,
        isDescartada,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}
