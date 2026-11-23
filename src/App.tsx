// App.tsx — Layout principal e navegação entre as 5 visões

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Gamepad2, Star, CheckCircle2, Eye, Trash2,
  RefreshCw, RotateCcw, ChevronRight,
  TrendingUp, Clock,
} from 'lucide-react'
import { DatabaseProvider, useDatabaseContext } from './context/DatabaseContext'
import { ExcelStatusBar } from './components/ExcelStatusBar'
import { JobCard } from './components/JobCard'
import { JobFilters } from './components/JobFilters'
import type { FiltersState } from './components/JobFilters'
import { JobDetailModal } from './components/JobDetailModal'
import type { Vaga } from './types/job'
import type { StatusProcesso } from './types/database'
import { formatDateTime, areaColor, modeloBadge, statusLabel, statusColor } from './utils/format'
import { isAllowedLocation, is100PercentRemote, isSaoPaulo } from './utils/location'

type Tab = 'vitrine' | 'favoritas' | 'inscricoes' | 'visualizadas' | 'descartadas'

const DEFAULT_FILTERS: FiltersState = {
  search: '',
  areas: [],
  modelos: [],
  senioridades: [],
  localizacao: 'all',
  hideDescartadas: true,
  hideVisualizadas: false,
}

// ─── Vitrine ──────────────────────────────────────────────────────────────────

function VitrineView({
  vagas,
  onOpenModal,
}: { vagas: Vaga[]; onOpenModal: (v: Vaga) => void }) {
  const { isDescartada, isVisualizada } = useDatabaseContext()
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS)

  const filtered = useMemo(() => {
    return vagas.filter(v => {
      // Salvaguarda: somente 100% Remoto ou São Paulo
      if (!isAllowedLocation(v)) return false

      // Filtro de localização selecionado pelo usuário
      if (filters.localizacao === 'remoto' && !is100PercentRemote(v)) return false
      if (filters.localizacao === 'sp' && !isSaoPaulo(v)) return false

      if (filters.hideDescartadas && isDescartada(v.vagaId)) return false
      if (filters.hideVisualizadas && isVisualizada(v.vagaId)) return false
      if (filters.areas.length > 0 && !filters.areas.includes(v.area)) return false
      if (filters.modelos.length > 0 && !filters.modelos.includes(v.modelo)) return false
      if (filters.senioridades.length > 0 && !filters.senioridades.includes(v.senioridade)) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        return (
          v.titulo.toLowerCase().includes(q) ||
          v.estudio.toLowerCase().includes(q) ||
          v.descricao.toLowerCase().includes(q) ||
          v.local.toLowerCase().includes(q) ||
          (v.tecnologias ?? []).some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [vagas, filters, isDescartada, isVisualizada])

  return (
    <div className="space-y-4">
      <JobFilters
        filters={filters}
        onChange={setFilters}
        totalVisible={filtered.length}
        totalAll={vagas.length}
      />
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <Gamepad2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma vaga encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(v => (
            <JobCard key={v.vagaId} vaga={v} onOpenModal={onOpenModal} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Favoritas ────────────────────────────────────────────────────────────────

function FavoritasView({ vagas, onOpenModal }: { vagas: Vaga[]; onOpenModal: (v: Vaga) => void }) {
  const { db, desfavoritar, atualizarNotaFavorita } = useDatabaseContext()

  const favoritasComVaga = useMemo(() =>
    db.favoritas
      .map(f => ({ row: f, vaga: vagas.find(v => v.vagaId === f.vagaId) }))
      .filter((x): x is typeof x & { vaga: Vaga } => !!x.vaga)
      .reverse(),
    [db.favoritas, vagas]
  )

  if (favoritasComVaga.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Star size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhuma vaga favoritada ainda.</p>
        <p className="text-sm mt-1">Clique na ⭐ de qualquer vaga na Vitrine.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favoritasComVaga.map(({ row, vaga }) => (
        <div key={row.id} className="bg-surface-800 border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${areaColor(vaga.area)}`}>
                  {vaga.area}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${modeloBadge(vaga.modelo)}`}>
                  {vaga.modelo}
                </span>
              </div>
              <button
                onClick={() => onOpenModal(vaga)}
                className="text-sm font-semibold text-zinc-100 hover:text-brand-300 transition-colors text-left"
              >
                {vaga.titulo}
              </button>
              <p className="text-xs text-zinc-500 mt-0.5">{vaga.estudio} · {vaga.local}</p>
            </div>
            <button
              onClick={() => desfavoritar(row.vagaId)}
              className="text-amber-400 hover:text-amber-300 p-1.5 hover:bg-white/5 rounded-lg transition-colors shrink-0"
              title="Remover dos favoritos"
            >
              <Star size={16} fill="currentColor" />
            </button>
          </div>
          <textarea
            rows={2}
            defaultValue={row.notas}
            onBlur={e => atualizarNotaFavorita(row.vagaId, e.target.value)}
            placeholder="Suas notas sobre esta vaga…"
            className="w-full bg-surface-700 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
          />
          <p className="text-[10px] text-zinc-600">
            Favoritada em {formatDateTime(row.dataFavoritada)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Inscrições ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: StatusProcesso; label: string }[] = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'teste_tecnico', label: 'Teste Técnico' },
  { value: 'aprovada', label: 'Aprovada ✓' },
  { value: 'recusada', label: 'Recusada' },
]

function InscricoesView({ vagas, onOpenModal }: { vagas: Vaga[]; onOpenModal: (v: Vaga) => void }) {
  const { db, atualizarInscricao } = useDatabaseContext()

  const inscricoesComVaga = useMemo(() =>
    db.inscricoes
      .map(i => ({ row: i, vaga: vagas.find(v => v.vagaId === i.vagaId) }))
      .filter((x): x is typeof x & { vaga: Vaga } => !!x.vaga)
      .reverse(),
    [db.inscricoes, vagas]
  )

  if (inscricoesComVaga.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhuma candidatura registrada ainda.</p>
        <p className="text-sm mt-1">Clique em "Candidatar" em qualquer vaga.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Resumo por status */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_OPTIONS.map(opt => {
          const count = inscricoesComVaga.filter(x => x.row.statusProcesso === opt.value).length
          return count > 0 ? (
            <span key={opt.value} className={`text-xs px-3 py-1 rounded-full bg-white/5 ${statusColor(opt.value)}`}>
              {opt.label}: {count}
            </span>
          ) : null
        })}
      </div>

      {inscricoesComVaga.map(({ row, vaga }) => (
        <div key={row.id} className="bg-surface-800 border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onOpenModal(vaga)}
                className="text-sm font-semibold text-zinc-100 hover:text-brand-300 transition-colors text-left"
              >
                {vaga.titulo}
              </button>
              <p className="text-xs text-zinc-500 mt-0.5">{vaga.estudio}</p>
            </div>
            <span className={`text-xs font-medium ${statusColor(row.statusProcesso)}`}>
              {statusLabel(row.statusProcesso)}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => atualizarInscricao(row.vagaId, { statusProcesso: opt.value })}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors
                  ${row.statusProcesso === opt.value
                    ? `bg-white/10 ${statusColor(opt.value)} font-medium`
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            defaultValue={row.notas}
            onBlur={e => atualizarInscricao(row.vagaId, { notas: e.target.value })}
            placeholder="Notas: contato do recrutador, portfólio enviado, próximos passos…"
            className="w-full bg-surface-700 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
          />

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-600">
              Inscrita em {formatDateTime(row.dataInscricao)}
            </p>
            <a
              href={vaga.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5"
            >
              Ver vaga <ChevronRight size={10} />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Visualizadas ─────────────────────────────────────────────────────────────

function VisualizadasView({ vagas, onOpenModal }: { vagas: Vaga[]; onOpenModal: (v: Vaga) => void }) {
  const { db } = useDatabaseContext()

  const visualizadasComVaga = useMemo(() =>
    db.visualizadas
      .map(v => ({ row: v, vaga: vagas.find(x => x.vagaId === v.vagaId) }))
      .filter((x): x is typeof x & { vaga: Vaga } => !!x.vaga)
      .reverse(),
    [db.visualizadas, vagas]
  )

  if (visualizadasComVaga.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Eye size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhuma vaga visualizada ainda.</p>
        <p className="text-sm mt-1">O histórico aparece aqui quando você abre uma vaga.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {visualizadasComVaga.map(({ row, vaga }) => (
        <div
          key={row.id}
          className="bg-surface-800 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-surface-700 cursor-pointer transition-colors"
          onClick={() => onOpenModal(vaga)}
        >
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${areaColor(vaga.area)}`}>
            {vaga.area}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{vaga.titulo}</p>
            <p className="text-xs text-zinc-500">{vaga.estudio}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-zinc-600 flex items-center gap-1 justify-end">
              <Clock size={10} />
              {formatDateTime(row.dataVisualizacao)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Descartadas ──────────────────────────────────────────────────────────────

function DescartadasView({ vagas, onOpenModal }: { vagas: Vaga[]; onOpenModal: (v: Vaga) => void }) {
  const { db, restaurarDescarte } = useDatabaseContext()

  const descartadasComVaga = useMemo(() =>
    db.descartadas
      .map(d => ({ row: d, vaga: vagas.find(v => v.vagaId === d.vagaId) }))
      .reverse(),
    [db.descartadas, vagas]
  )

  if (descartadasComVaga.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Trash2 size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhuma vaga descartada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {descartadasComVaga.map(({ row, vaga }) => (
        <div key={row.id} className="bg-surface-800 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-300 truncate">
              {row.titulo}
            </p>
            <p className="text-xs text-zinc-500">{row.estudio}</p>
            {row.motivoDescarte && (
              <p className="text-xs text-zinc-600 mt-0.5">Motivo: {row.motivoDescarte}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {vaga && (
              <button
                onClick={() => onOpenModal(vaga)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Ver
              </button>
            )}
            <button
              onClick={() => restaurarDescarte(row.vagaId)}
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              title="Restaurar para a Vitrine"
            >
              <RotateCcw size={12} />
              Restaurar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── App Principal ────────────────────────────────────────────────────────────

function AppContent() {
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('vitrine')
  const [modalVaga, setModalVaga] = useState<Vaga | null>(null)
  const [lastFetch, setLastFetch] = useState<string | null>(null)
  const { db } = useDatabaseContext()

  const fetchVagas = useCallback(async () => {
    try {
      const res = await fetch('/data/vagas.json?' + Date.now())
      const data = await res.json() as Vaga[]
      setVagas(data)
      setLastFetch(new Date().toISOString())
    } catch (e) {
      console.error('Erro ao carregar vagas.json:', e)
    }
  }, [])

  useEffect(() => {
    fetchVagas()
  }, [fetchVagas])

  const counts = useMemo(() => ({
    vitrine: vagas.length,
    favoritas: db.favoritas.length,
    inscricoes: db.inscricoes.length,
    visualizadas: db.visualizadas.length,
    descartadas: db.descartadas.length,
  }), [vagas, db])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'vitrine', label: 'Vitrine', icon: <Gamepad2 size={16} /> },
    { key: 'favoritas', label: 'Favoritas', icon: <Star size={16} /> },
    { key: 'inscricoes', label: 'Inscrições', icon: <CheckCircle2 size={16} /> },
    { key: 'visualizadas', label: 'Visualizadas', icon: <Eye size={16} /> },
    { key: 'descartadas', label: 'Descartadas', icon: <Trash2 size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-surface-900 text-zinc-100 font-sans flex flex-col">
      {/* Top bar */}
      <header className="bg-surface-800 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 leading-none">Portal Games BR</h1>
              <p className="text-[10px] text-zinc-500 mt-0.5">Captação de vagas criativas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-[10px] text-zinc-600 hidden sm:flex items-center gap-1">
                <TrendingUp size={10} />
                Atualizado {new Date(lastFetch).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button
              onClick={fetchVagas}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors"
              title="Recarregar vagas"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
        <ExcelStatusBar />
      </header>

      {/* Tabs */}
      <nav className="bg-surface-800 border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-brand-500 text-brand-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                }`}
            >
              {tab.icon}
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                  ${activeTab === tab.key ? 'bg-brand-700 text-brand-200' : 'bg-white/5 text-zinc-500'}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'vitrine' && <VitrineView vagas={vagas} onOpenModal={setModalVaga} />}
        {activeTab === 'favoritas' && <FavoritasView vagas={vagas} onOpenModal={setModalVaga} />}
        {activeTab === 'inscricoes' && <InscricoesView vagas={vagas} onOpenModal={setModalVaga} />}
        {activeTab === 'visualizadas' && <VisualizadasView vagas={vagas} onOpenModal={setModalVaga} />}
        {activeTab === 'descartadas' && <DescartadasView vagas={vagas} onOpenModal={setModalVaga} />}
      </main>

      {/* Modal */}
      <JobDetailModal vaga={modalVaga} onClose={() => setModalVaga(null)} />
    </div>
  )
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  )
}
