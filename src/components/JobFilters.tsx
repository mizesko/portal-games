// JobFilters.tsx
// Filtros por área, modelo, senioridade, localização rígida, busca e toggles

import React from 'react'
import { Search, X, SlidersHorizontal, MapPin } from 'lucide-react'
import type { AreaVaga, ModeloTrabalho, SenioridadeVaga } from '../types/job'

const AREAS: AreaVaga[] = [
  'Game Design', 'Arte & Ilustração', 'QA & Game Tester',
  'UI/UX', 'Áudio & Narrativa', 'Produção & Comunidade', 'Outros',
]

const MODELOS: ModeloTrabalho[] = ['Remoto', 'Híbrido', 'Presencial', 'Não informado']

const SENIORIDADES: SenioridadeVaga[] = [
  'Estágio',
  'Trainee / Aprendiz',
  'Júnior / Entry-Level',
  'Assistente / Banco de Talentos',
  'Entrada / Não especificado',
]

export type LocalizacaoOption = 'all' | 'remoto' | 'sp'

export const LOCALIZACOES: { id: LocalizacaoOption; label: string }[] = [
  { id: 'all', label: 'Todas (Remoto + São Paulo)' },
  { id: 'remoto', label: '100% Home Office (Remoto)' },
  { id: 'sp', label: 'São Paulo (Presencial / Híbrido)' },
]

export interface FiltersState {
  search: string
  areas: AreaVaga[]
  modelos: ModeloTrabalho[]
  senioridades: SenioridadeVaga[]
  localizacao: LocalizacaoOption
  hideDescartadas: boolean
  hideVisualizadas: boolean
}

interface Props {
  filters: FiltersState
  onChange: (f: FiltersState) => void
  totalVisible: number
  totalAll: number
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
        ${active
          ? 'bg-brand-600 text-white'
          : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
        }`}
    >
      {label}
    </button>
  )
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export function JobFilters({ filters, onChange, totalVisible, totalAll }: Props) {
  const hasActive = filters.areas.length > 0 || filters.modelos.length > 0 ||
    filters.senioridades.length > 0 || filters.search !== '' || filters.localizacao !== 'all'

  function clear() {
    onChange({ ...filters, search: '', areas: [], modelos: [], senioridades: [], localizacao: 'all' })
  }

  return (
    <div className="bg-surface-800 border border-white/5 rounded-xl p-4 space-y-3">
      {/* Busca + contadores */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar vaga, estúdio, tecnologia…"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-surface-700 border border-white/5 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <div className="text-xs text-zinc-500 whitespace-nowrap">
          <span className="text-zinc-200 font-medium">{totalVisible}</span>/{totalAll} vagas
        </div>
        {hasActive && (
          <button onClick={clear} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={13} />
            Limpar
          </button>
        )}
      </div>

      {/* Filtro Rígido de Localização */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium mr-1">
          <MapPin size={12} className="text-brand-400" />
          Local:
        </div>
        {LOCALIZACOES.map(loc => (
          <Chip
            key={loc.id}
            label={loc.label}
            active={filters.localizacao === loc.id}
            onClick={() => onChange({ ...filters, localizacao: loc.id })}
          />
        ))}
      </div>

      {/* Filtros de área */}
      <div className="flex gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mr-1">
          <SlidersHorizontal size={12} />
          Área:
        </div>
        {AREAS.map(a => (
          <Chip
            key={a}
            label={a}
            active={filters.areas.includes(a)}
            onClick={() => onChange({ ...filters, areas: toggle(filters.areas, a) })}
          />
        ))}
      </div>

      {/* Filtros de modelo */}
      <div className="flex gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mr-1 w-14">Modelo:</div>
        {MODELOS.map(m => (
          <Chip
            key={m}
            label={m}
            active={filters.modelos.includes(m)}
            onClick={() => onChange({ ...filters, modelos: toggle(filters.modelos, m) })}
          />
        ))}
      </div>

      {/* Filtros de senioridade */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="flex items-center gap-1 text-xs text-zinc-500 mr-1 w-14">Nível:</div>
        <Chip
          label="Todos os níveis de entrada"
          active={filters.senioridades.length === 0}
          onClick={() => onChange({ ...filters, senioridades: [] })}
        />
        {SENIORIDADES.map(s => (
          <Chip
            key={s}
            label={s}
            active={filters.senioridades.includes(s)}
            onClick={() => onChange({ ...filters, senioridades: toggle(filters.senioridades, s) })}
          />
        ))}
      </div>

      {/* Toggles de ocultação */}
      <div className="flex gap-4 pt-1 border-t border-white/5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hideDescartadas}
            onChange={e => onChange({ ...filters, hideDescartadas: e.target.checked })}
            className="w-3.5 h-3.5 accent-brand-500"
          />
          <span className="text-xs text-zinc-400">Ocultar descartadas</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hideVisualizadas}
            onChange={e => onChange({ ...filters, hideVisualizadas: e.target.checked })}
            className="w-3.5 h-3.5 accent-brand-500"
          />
          <span className="text-xs text-zinc-400">Ocultar já vistas</span>
        </label>
      </div>
    </div>
  )
}
