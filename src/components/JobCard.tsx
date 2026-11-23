// JobCard.tsx
// Card rico da vaga com ações rápidas

import React from 'react'
import {
  Star, CheckCircle2, Trash2, MapPin, Briefcase,
  Calendar, ExternalLink, Eye,
} from 'lucide-react'
import type { Vaga } from '../types/job'
import { useDatabaseContext } from '../context/DatabaseContext'
import { formatDate, areaColor, modeloBadge } from '../utils/format'

interface Props {
  vaga: Vaga
  onOpenModal: (vaga: Vaga) => void
  hideActions?: boolean
}

export function JobCard({ vaga, onOpenModal, hideActions = false }: Props) {
  const {
    favoritar, desfavoritar,
    marcarInscrita,
    descartar,
    marcarVisualizada,
    isFavorita, isInscrita, isVisualizada, isDescartada,
  } = useDatabaseContext()

  const fav = isFavorita(vaga.vagaId)
  const ins = isInscrita(vaga.vagaId)
  const vis = isVisualizada(vaga.vagaId)
  const desc = isDescartada(vaga.vagaId)

  async function handleOpen() {
    await marcarVisualizada(vaga)
    onOpenModal(vaga)
  }

  async function handleFav(e: React.MouseEvent) {
    e.stopPropagation()
    if (fav) await desfavoritar(vaga.vagaId)
    else await favoritar(vaga)
  }

  async function handleIns(e: React.MouseEvent) {
    e.stopPropagation()
    if (!ins) await marcarInscrita(vaga)
  }

  async function handleDesc(e: React.MouseEvent) {
    e.stopPropagation()
    await descartar(vaga)
  }

  const areaClr = areaColor(vaga.area)

  return (
    <article
      className={`group relative bg-surface-800 border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-brand-600/40 hover:bg-surface-700 transition-all cursor-pointer animate-fade-in
        ${desc ? 'opacity-50' : ''}`}
      onClick={handleOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${areaClr}`}>
              {vaga.area}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${modeloBadge(vaga.modelo)}`}>
              {vaga.modelo}
            </span>
            {vis && (
              <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                <Eye size={10} />
                Vista
              </span>
            )}
            {ins && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 size={10} />
                Inscrita
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2 group-hover:text-brand-300 transition-colors">
            {vaga.titulo}
          </h3>
        </div>
        {/* Star button */}
        {!hideActions && (
          <button
            onClick={handleFav}
            className={`p-1.5 rounded-lg transition-colors shrink-0
              ${fav ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-600 hover:text-amber-400'}`}
            title={fav ? 'Remover dos favoritos' : 'Favoritar vaga'}
          >
            <Star size={16} fill={fav ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="flex items-center gap-1 text-zinc-400 font-medium">
          <Briefcase size={12} />
          {vaga.estudio}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {vaga.local}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(vaga.dataPublicacao)}
        </span>
      </div>

      {/* Senioridade */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">
          Nível: <span className="text-zinc-300">{vaga.senioridade}</span>
        </span>
        {vaga.fonte && (
          <span className="text-xs text-zinc-600">
            via {vaga.fonte}
          </span>
        )}
      </div>

      {/* Descrição */}
      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
        {vaga.descricao}
      </p>

      {/* Tags de tecnologias */}
      {vaga.tecnologias && vaga.tecnologias.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {vaga.tecnologias.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-surface-600 text-zinc-400 rounded">
              {t}
            </span>
          ))}
          {vaga.tecnologias.length > 4 && (
            <span className="text-[10px] text-zinc-600">+{vaga.tecnologias.length - 4}</span>
          )}
        </div>
      )}

      {/* Ações rápidas */}
      {!hideActions && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <a
            href={vaga.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={async (e) => { e.stopPropagation(); await marcarVisualizada(vaga) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            Ver vaga
          </a>
          <button
            onClick={handleIns}
            disabled={ins}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
              ${ins
                ? 'bg-emerald-900/30 text-emerald-400 cursor-default'
                : 'bg-white/5 text-zinc-300 hover:bg-emerald-900/30 hover:text-emerald-400'
              }`}
            title={ins ? 'Já marcada como inscrita' : 'Marcar como inscrita'}
          >
            <CheckCircle2 size={13} />
            {ins ? 'Inscrita' : 'Candidatar'}
          </button>
          <button
            onClick={handleDesc}
            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
            title="Descartar vaga"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </article>
  )
}
