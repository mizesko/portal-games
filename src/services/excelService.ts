// excelService.ts
// Motor de leitura tolerante, normalização e escrita de .xlsx via SheetJS

import * as XLSX from 'xlsx'
import type {
  DatabaseState,
  RowFavorita,
  RowInscricao,
  RowVisualizada,
  RowDescartada,
  StatusProcesso,
} from '../types/database'

// ─── Normalização de chaves ───────────────────────────────────────────────────

function normalizeKey(key: unknown): string {
  return String(key ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

type RawRow = Record<string, unknown>

function createRowGetter(row: RawRow) {
  const normalized: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    normalized[normalizeKey(k)] = row[k]
  }
  return (...candidates: string[]): string => {
    for (const c of candidates) {
      const v = normalized[normalizeKey(c)]
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim()
      }
    }
    return ''
  }
}

// ─── Localização de abas ─────────────────────────────────────────────────────

function findSheetInWorkbook(wb: XLSX.WorkBook, candidates: string[]): XLSX.WorkSheet | null {
  const normalCandidates = candidates.map(normalizeKey)
  for (const name of wb.SheetNames) {
    if (normalCandidates.includes(normalizeKey(name))) {
      return wb.Sheets[name]!
    }
  }
  return null
}

// ─── Conversão de datas ───────────────────────────────────────────────────────

function parseDate(val: unknown): string {
  if (!val) return new Date().toISOString()
  if (typeof val === 'number') {
    // Serial do Excel (dias desde 1899-12-30)
    return new Date((val - 25569) * 86400 * 1000).toISOString()
  }
  const d = new Date(String(val))
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

// ─── Geração de IDs ───────────────────────────────────────────────────────────

function random4(): string {
  return Math.random().toString(36).slice(2, 6)
}

export function generateId(prefix: string, index: number): string {
  return `${prefix}-${Date.now()}-${index}-${random4()}`
}

// ─── Leitura de Worksheet para objetos ───────────────────────────────────────

function sheetToRows(ws: XLSX.WorkSheet | null): RawRow[] {
  if (!ws) return []
  return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' })
}

// ─── Parse das 4 abas ────────────────────────────────────────────────────────

function parseFavoritas(wb: XLSX.WorkBook): RowFavorita[] {
  const ws = findSheetInWorkbook(wb, ['Favoritas', 'Favoritos', 'Favoritadas'])
  const rows = sheetToRows(ws)
  return rows
    .map((row, i) => {
      const g = createRowGetter(row)
      const vagaId = g('vagaId', 'vagaid', 'idvaga', 'jobid', 'vaga_id')
      if (!vagaId) return null
      return {
        id: g('ID', 'id', 'Id') || generateId('fav', i),
        vagaId,
        titulo: g('Titulo', 'titulo', 'cargo', 'vaga', 'title'),
        estudio: g('Estudio', 'estudio', 'empresa', 'studio', 'company'),
        area: g('Area', 'area'),
        modelo: g('Modelo', 'modelo', 'modalidade'),
        local: g('Local', 'local', 'localizacao', 'cidade'),
        link: g('Link', 'link', 'url'),
        dataFavoritada: parseDate(g('DataFavoritada', 'datafavoritada', 'data')),
        notas: g('Notas', 'notas', 'observacoes', 'notes'),
      } satisfies RowFavorita
    })
    .filter((r): r is RowFavorita => r !== null)
}

function parseInscricoes(wb: XLSX.WorkBook): RowInscricao[] {
  const ws = findSheetInWorkbook(wb, ['Inscricoes', 'Inscrições', 'Inscricao', 'Applications'])
  const rows = sheetToRows(ws)
  const validStatus: StatusProcesso[] = [
    'enviada', 'entrevista', 'teste_tecnico', 'aprovada', 'recusada',
  ]
  return rows
    .map((row, i) => {
      const g = createRowGetter(row)
      const vagaId = g('vagaId', 'vagaid', 'idvaga', 'jobid', 'vaga_id')
      if (!vagaId) return null
      const rawStatus = normalizeKey(g('StatusProcesso', 'statusprocesso', 'status'))
      const statusProcesso: StatusProcesso = validStatus.includes(rawStatus as StatusProcesso)
        ? (rawStatus as StatusProcesso)
        : 'enviada'
      return {
        id: g('ID', 'id', 'Id') || generateId('ins', i),
        vagaId,
        titulo: g('Titulo', 'titulo', 'cargo', 'vaga', 'title'),
        estudio: g('Estudio', 'estudio', 'empresa', 'studio', 'company'),
        area: g('Area', 'area'),
        modelo: g('Modelo', 'modelo', 'modalidade'),
        link: g('Link', 'link', 'url'),
        dataInscricao: parseDate(g('DataInscricao', 'datainscricao', 'data')),
        statusProcesso,
        notas: g('Notas', 'notas', 'observacoes', 'notes'),
      } satisfies RowInscricao
    })
    .filter((r): r is RowInscricao => r !== null)
}

function parseVisualizadas(wb: XLSX.WorkBook): RowVisualizada[] {
  const ws = findSheetInWorkbook(wb, ['Visualizadas', 'Visualizados', 'Viewed'])
  const rows = sheetToRows(ws)
  return rows
    .map((row, i) => {
      const g = createRowGetter(row)
      const vagaId = g('vagaId', 'vagaid', 'idvaga', 'jobid', 'vaga_id')
      if (!vagaId) return null
      return {
        id: g('ID', 'id', 'Id') || generateId('vis', i),
        vagaId,
        titulo: g('Titulo', 'titulo', 'cargo', 'vaga', 'title'),
        estudio: g('Estudio', 'estudio', 'empresa', 'studio', 'company'),
        link: g('Link', 'link', 'url'),
        dataVisualizacao: parseDate(g('DataVisualizacao', 'datavisualizacao', 'data')),
      } satisfies RowVisualizada
    })
    .filter((r): r is RowVisualizada => r !== null)
}

function parseDescartadas(wb: XLSX.WorkBook): RowDescartada[] {
  const ws = findSheetInWorkbook(wb, ['Descartadas', 'Descartados', 'Dismissed'])
  const rows = sheetToRows(ws)
  return rows
    .map((row, i) => {
      const g = createRowGetter(row)
      const vagaId = g('vagaId', 'vagaid', 'idvaga', 'jobid', 'vaga_id')
      if (!vagaId) return null
      return {
        id: g('ID', 'id', 'Id') || generateId('des', i),
        vagaId,
        titulo: g('Titulo', 'titulo', 'cargo', 'vaga', 'title'),
        estudio: g('Estudio', 'estudio', 'empresa', 'studio', 'company'),
        link: g('Link', 'link', 'url'),
        motivoDescarte: g('MotivoDescarte', 'motivodescarte', 'motivo', 'reason'),
        dataDescarte: parseDate(g('DataDescarte', 'datadescarte', 'data')),
      } satisfies RowDescartada
    })
    .filter((r): r is RowDescartada => r !== null)
}

// ─── Leitura principal ────────────────────────────────────────────────────────

export async function readWorkbook(file: File | ArrayBuffer): Promise<DatabaseState> {
  const data = file instanceof File ? await file.arrayBuffer() : file
  const wb = XLSX.read(data, { type: 'array', cellDates: false })

  const favoritas = parseFavoritas(wb)
  const inscricoes = parseInscricoes(wb)
  const visualizadas = parseVisualizadas(wb)
  const descartadas = parseDescartadas(wb)

  return {
    favoritas,
    inscricoes,
    visualizadas,
    descartadas,
    lastSync: new Date().toISOString(),
  }
}

// ─── Escrita / Serialização ───────────────────────────────────────────────────

function stateToWorkbook(state: DatabaseState): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  const favSheet = XLSX.utils.json_to_sheet(
    state.favoritas.map((r) => ({
      ID: r.id, VagaID: r.vagaId, Titulo: r.titulo, Estudio: r.estudio,
      Area: r.area, Modelo: r.modelo, Local: r.local, Link: r.link,
      DataFavoritada: r.dataFavoritada, Notas: r.notas,
    }))
  )
  XLSX.utils.book_append_sheet(wb, favSheet, 'Favoritas')

  const insSheet = XLSX.utils.json_to_sheet(
    state.inscricoes.map((r) => ({
      ID: r.id, VagaID: r.vagaId, Titulo: r.titulo, Estudio: r.estudio,
      Area: r.area, Modelo: r.modelo, Link: r.link,
      DataInscricao: r.dataInscricao, StatusProcesso: r.statusProcesso, Notas: r.notas,
    }))
  )
  XLSX.utils.book_append_sheet(wb, insSheet, 'Inscricoes')

  const visSheet = XLSX.utils.json_to_sheet(
    state.visualizadas.map((r) => ({
      ID: r.id, VagaID: r.vagaId, Titulo: r.titulo, Estudio: r.estudio,
      Link: r.link, DataVisualizacao: r.dataVisualizacao,
    }))
  )
  XLSX.utils.book_append_sheet(wb, visSheet, 'Visualizadas')

  const desSheet = XLSX.utils.json_to_sheet(
    state.descartadas.map((r) => ({
      ID: r.id, VagaID: r.vagaId, Titulo: r.titulo, Estudio: r.estudio,
      Link: r.link, MotivoDescarte: r.motivoDescarte, DataDescarte: r.dataDescarte,
    }))
  )
  XLSX.utils.book_append_sheet(wb, desSheet, 'Descartadas')

  return wb
}

export function workbookToArrayBuffer(state: DatabaseState): ArrayBuffer {
  const wb = stateToWorkbook(state)
  const buf: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buf
}

export function downloadWorkbook(state: DatabaseState, filename = 'vagas_games_db.xlsx'): void {
  const wb = stateToWorkbook(state)
  XLSX.writeFile(wb, filename)
}

// ─── File System Access API ───────────────────────────────────────────────────

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

export async function createNewXlsx(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    // @ts-expect-error showSaveFilePicker TS types not complete in all envs
    const handle: FileSystemFileHandle = await window.showSaveFilePicker({
      suggestedName: 'vagas_games_db.xlsx',
      types: [{ description: 'Planilha Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
    })
    return handle
  } catch {
    return null
  }
}

export async function openXlsxPicker(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) return null
  try {
    // @ts-expect-error showOpenFilePicker TS types not complete in all envs
    const [handle]: FileSystemFileHandle[] = await window.showOpenFilePicker({
      types: [{ description: 'Planilha Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      multiple: false,
    })
    return handle
  } catch {
    return null
  }
}

export async function writeToHandle(
  handle: FileSystemFileHandle,
  state: DatabaseState
): Promise<void> {
  const buf = workbookToArrayBuffer(state)
  // createWritable is a File System Access API method (not in all TS lib versions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writable = await (handle as any).createWritable()
  await writable.write(buf)
  await writable.close()
}

export async function readFromHandle(handle: FileSystemFileHandle): Promise<DatabaseState> {
  const file = await handle.getFile()
  return readWorkbook(file)
}
