// storageService.ts
// Cache rápido das 4 coleções em localStorage para renderização instantânea (0ms)

import type { DatabaseState } from '../types/database'

const LS_KEY = 'vagas-games-db-cache'

const EMPTY_STATE: DatabaseState = {
  favoritas: [],
  inscricoes: [],
  visualizadas: [],
  descartadas: [],
  lastSync: null,
}

export function loadFromStorage(): DatabaseState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as Partial<DatabaseState>
    return {
      favoritas: parsed.favoritas ?? [],
      inscricoes: parsed.inscricoes ?? [],
      visualizadas: parsed.visualizadas ?? [],
      descartadas: parsed.descartadas ?? [],
      lastSync: parsed.lastSync ?? null,
    }
  } catch {
    return EMPTY_STATE
  }
}

export function saveToStorage(state: DatabaseState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function clearStorage(): void {
  localStorage.removeItem(LS_KEY)
}
