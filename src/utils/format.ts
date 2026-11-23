// format.ts — Helpers de formatação e estilo

import type { AreaVaga, ModeloTrabalho } from '../types/job'

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const AREA_COLORS: Record<AreaVaga, string> = {
  'Game Design':         'bg-violet-900/60 text-violet-300',
  'Arte & Ilustração':   'bg-pink-900/60 text-pink-300',
  'QA & Game Tester':    'bg-cyan-900/60 text-cyan-300',
  'UI/UX':               'bg-blue-900/60 text-blue-300',
  'Áudio & Narrativa':   'bg-amber-900/60 text-amber-300',
  'Produção & Comunidade':'bg-green-900/60 text-green-300',
  'Outros':              'bg-zinc-800 text-zinc-400',
}

export function areaColor(area: AreaVaga): string {
  return AREA_COLORS[area] ?? 'bg-zinc-800 text-zinc-400'
}

const MODELO_BADGE: Record<ModeloTrabalho, string> = {
  'Remoto':        'border-emerald-700 text-emerald-400',
  'Híbrido':       'border-amber-700 text-amber-400',
  'Presencial':    'border-blue-700 text-blue-400',
  'Não informado': 'border-zinc-700 text-zinc-500',
}

export function modeloBadge(modelo: ModeloTrabalho): string {
  return MODELO_BADGE[modelo] ?? 'border-zinc-700 text-zinc-500'
}

const STATUS_LABEL: Record<string, string> = {
  enviada:       'Enviada',
  entrevista:    'Entrevista',
  teste_tecnico: 'Teste Técnico',
  aprovada:      'Aprovada ✓',
  recusada:      'Recusada',
}

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s
}

const STATUS_COLOR: Record<string, string> = {
  enviada:       'text-zinc-300',
  entrevista:    'text-brand-300',
  teste_tecnico: 'text-amber-300',
  aprovada:      'text-emerald-300',
  recusada:      'text-red-400',
}

export function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? 'text-zinc-400'
}
