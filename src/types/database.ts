// Tipagem das 4 abas do arquivo Excel local
export type StatusProcesso =
  | 'enviada'
  | 'entrevista'
  | 'teste_tecnico'
  | 'aprovada'
  | 'recusada'

// Aba: Favoritas
export interface RowFavorita {
  id: string            // PK da linha no Excel
  vagaId: string        // FK para Vaga.vagaId
  titulo: string
  estudio: string
  area: string
  modelo: string
  local: string
  link: string
  dataFavoritada: string
  notas: string
}

// Aba: Inscricoes
export interface RowInscricao {
  id: string
  vagaId: string
  titulo: string
  estudio: string
  area: string
  modelo: string
  link: string
  dataInscricao: string
  statusProcesso: StatusProcesso
  notas: string
}

// Aba: Visualizadas
export interface RowVisualizada {
  id: string
  vagaId: string
  titulo: string
  estudio: string
  link: string
  dataVisualizacao: string
}

// Aba: Descartadas
export interface RowDescartada {
  id: string
  vagaId: string
  titulo: string
  estudio: string
  link: string
  motivoDescarte: string
  dataDescarte: string
}

// Estado completo do banco de dados Excel em memória
export interface DatabaseState {
  favoritas: RowFavorita[]
  inscricoes: RowInscricao[]
  visualizadas: RowVisualizada[]
  descartadas: RowDescartada[]
  lastSync: string | null    // ISO timestamp da última leitura do .xlsx
}

export type SheetName = 'Favoritas' | 'Inscricoes' | 'Visualizadas' | 'Descartadas'

export const SHEET_NAMES: SheetName[] = ['Favoritas', 'Inscricoes', 'Visualizadas', 'Descartadas']
