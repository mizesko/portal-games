// JobDetailModal.tsx
// Modal completo da vaga com edição de notas e status de processo

import React, { useState, useEffect } from 'react'
import {
  X, ExternalLink, Star, CheckCircle2, Trash2,
  MapPin, Briefcase, Calendar, Tag, Clock,
  FileText, ChevronDown,
} from 'lucide-react'
import type { Vaga } from '../types/job'
import type { StatusProcesso } from '../types/database'
import { useDatabaseContext } from '../context/DatabaseContext'
import {
  formatDate, formatDateTime, areaColor, modeloBadge,
  statusLabel, statusColor,
} from '../utils/format'

const STATUS_OPTIONS: { value: StatusProcesso; label: string }[] = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'teste_tecnico', label: 'Teste Técnico' },
  { value: 'aprovada', label: 'Aprovada ✓' },
  { value: 'recusada', label: 'Recusada' },
]

interface Props {
  vaga: Vaga | null
  onClose: () => void
}

export function JobDetailModal({ vaga, onClose }: Props) {
  const {
    favoritar, desfavoritar,
    marcarInscrita,
    atualizarInscricao,
    atualizarNotaFavorita,
    descartar,
    marcarVisualizada,
    isFavorita, isInscrita, isDescartada,
    db,
  } = useDatabaseContext()

  const [motivoDescarte, setMotivoDescarte] = useState('')
  const [showDescartar, setShowDescartar] = useState(false)

  useEffect(() => {
    if (!vaga) return
    // Marcar como visualizada ao abrir o modal
    marcarVisualizada(vaga)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaga?.vagaId])

  if (!vaga) return null

  const fav = isFavorita(vaga.vagaId)
  const ins = isInscrita(vaga.vagaId)
  const desc = isDescartada(vaga.vagaId)

  const inscricaoRow = db.inscricoes.find(i => i.vagaId === vaga.vagaId)
  const favoritaRow = db.favoritas.find(f => f.vagaId === vaga.vagaId)

  async function handleDescartarConfirm() {
    await descartar(vaga!, motivoDescarte)
    setShowDescartar(false)
    setMotivoDescarte('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-2xl bg-surface-800 border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-surface-800 border-b border-white/5 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${areaColor(vaga.area)}`}>
                {vaga.area}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${modeloBadge(vaga.modelo)}`}>
                {vaga.modelo}
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 leading-snug">{vaga.titulo}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{vaga.estudio}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <MapPin size={14} className="text-zinc-500 shrink-0" />
              {vaga.local}
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Briefcase size={14} className="text-zinc-500 shrink-0" />
              {vaga.senioridade}
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Calendar size={14} className="text-zinc-500 shrink-0" />
              Publicada em {formatDate(vaga.dataPublicacao)}
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock size={14} className="text-zinc-500 shrink-0" />
              Coletada em {formatDate(vaga.dataColeta)}
            </div>
            {vaga.salario && (
              <div className="flex items-center gap-2 text-zinc-400 col-span-2">
                <Tag size={14} className="text-zinc-500 shrink-0" />
                {vaga.salario}
              </div>
            )}
          </div>

          {/* Tecnologias */}
          {vaga.tecnologias && vaga.tecnologias.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {vaga.tecnologias.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-surface-600 text-zinc-300 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Descrição */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <FileText size={12} />
              Descrição
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {vaga.descricao}
            </p>
          </div>

          {/* Notas de favorita */}
          {fav && favoritaRow && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <Star size={12} className="text-amber-400" />
                Minhas notas (Favorita)
              </h3>
              <textarea
                rows={3}
                defaultValue={favoritaRow.notas}
                onBlur={e => atualizarNotaFavorita(vaga.vagaId, e.target.value)}
                placeholder="Adicione suas notas sobre esta vaga…"
                className="w-full bg-surface-700 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
              />
            </div>
          )}

          {/* Painel de inscrição */}
          {ins && inscricaoRow && (
            <div className="bg-surface-700 border border-white/5 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                Acompanhamento da inscrição
              </h3>

              {/* Status selector */}
              <div className="relative">
                <label className="text-xs text-zinc-500 block mb-1">Status do processo</label>
                <div className="relative">
                  <select
                    value={inscricaoRow.statusProcesso}
                    onChange={e => atualizarInscricao(vaga.vagaId, { statusProcesso: e.target.value as StatusProcesso })}
                    className="w-full appearance-none bg-surface-600 border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors pr-8"
                    style={{ color: 'inherit' }}
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
                <div className={`text-xs mt-1 ${statusColor(inscricaoRow.statusProcesso)}`}>
                  {statusLabel(inscricaoRow.statusProcesso)}
                </div>
              </div>

              {/* Notas de inscrição */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Notas (recrutador, portfólio enviado, próximos passos…)
                </label>
                <textarea
                  rows={3}
                  defaultValue={inscricaoRow.notas}
                  onBlur={e => atualizarInscricao(vaga.vagaId, { notas: e.target.value })}
                  placeholder="Ex: Enviada em 20/11, aguardando retorno de Ana (ana@estudio.com)"
                  className="w-full bg-surface-600 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
                />
              </div>

              <p className="text-xs text-zinc-600">
                Inscrita em {formatDateTime(inscricaoRow.dataInscricao)}
              </p>
            </div>
          )}

          {/* Descartar modal */}
          {showDescartar && !desc && (
            <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-300">Motivo do descarte (opcional):</p>
              <input
                type="text"
                value={motivoDescarte}
                onChange={e => setMotivoDescarte(e.target.value)}
                placeholder="Ex: Fora do meu nível de senioridade"
                className="w-full bg-surface-700 border border-white/5 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDescartarConfirm}
                  className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Confirmar descarte
                </button>
                <button
                  onClick={() => setShowDescartar(false)}
                  className="px-4 py-2 bg-white/5 text-zinc-300 text-sm rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer ações */}
        <div className="sticky bottom-0 bg-surface-800 border-t border-white/5 px-6 py-4 flex flex-wrap gap-2">
          <a
            href={vaga.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => marcarVisualizada(vaga)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ExternalLink size={15} />
            Candidatar-se / Ver no site
          </a>

          <button
            onClick={() => fav ? desfavoritar(vaga.vagaId) : favoritar(vaga)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${fav ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            <Star size={15} fill={fav ? 'currentColor' : 'none'} />
            {fav ? 'Favoritada' : 'Favoritar'}
          </button>

          <button
            onClick={() => !ins && marcarInscrita(vaga)}
            disabled={ins}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${ins ? 'bg-emerald-900/30 text-emerald-400 cursor-default' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
          >
            <CheckCircle2 size={15} />
            {ins ? 'Inscrita' : 'Marcar inscrita'}
          </button>

          {!desc && (
            <button
              onClick={() => setShowDescartar(s => !s)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
            >
              <Trash2 size={15} />
              Descartar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
