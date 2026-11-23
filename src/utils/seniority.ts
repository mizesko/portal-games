// seniority.ts
// Regras de senioridade: Perfil Iniciante / Entrada (Estágio, Trainee, Júnior, Assistente, Entrada)
// Bloqueio estrito de Pleno, Sênior, Especialista e Liderança

import type { Vaga, SenioridadeVaga } from '../types/job'

export function normalizeText(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function isBeginnerFriendly(
  vaga: Pick<Vaga, 'titulo'> & { descricao?: string; senioridade?: string }
): boolean {
  const titNorm = normalizeText(vaga.titulo || '')
  const senNorm = normalizeText(vaga.senioridade || '')
  const descNorm = normalizeText((vaga.descricao || '').slice(0, 400))
  const titAndSen = `${titNorm} ${senNorm}`

  // 1. HARD BLOCKLIST: Sênior, Pleno, Especialista
  const SENIOR_BLOCKLIST = /\b(senior|sr|pleno|mid|mid[- ]level|especialista|specialist|principal|staff|master|expert)\b/i
  if (SENIOR_BLOCKLIST.test(titAndSen)) return false

  // 2. HARD BLOCKLIST: Liderança e Gestão
  const LEAD_BLOCKLIST = /\b(lead|lider|tech lead|art lead|gerente|manager|coordenador|coordinator|diretor|director|head|supervisor|vp|chief)\b/i
  if (LEAD_BLOCKLIST.test(titAndSen)) return false

  // 3. HARD BLOCKLIST: Experiência avançada explícita no título ou primeiros 400 caracteres
  const ADVANCED_EXP_REGEX = /\b([3-9]|\d{2,})\+?\s*(years?|anos?)\b|\b(3\+|4\+|5\+|6\+|7\+|8\+|9\+)\s*(years?|anos?)\b|\b(experiencia solida|solida experiencia|solid experience|extensive experience)\b/i
  if (ADVANCED_EXP_REGEX.test(titNorm) || ADVANCED_EXP_REGEX.test(descNorm)) return false

  return true
}

export function classifySeniority(
  titulo: string = '',
  descricao: string = '',
  senioridadeOriginal: string = ''
): SenioridadeVaga {
  const titNorm = normalizeText(titulo)
  const senNorm = normalizeText(senioridadeOriginal)
  const descNorm = normalizeText(descricao.slice(0, 400))

  // 1. Estágio
  const ESTAGIO_REGEX = /\b(estagio|estagiario|estagiaria|intern|internship)\b/i
  if (ESTAGIO_REGEX.test(titNorm) || ESTAGIO_REGEX.test(senNorm) || ESTAGIO_REGEX.test(descNorm)) {
    return 'Estágio'
  }

  // 2. Trainee / Aprendiz
  const TRAINEE_REGEX = /\b(trainee|aprendiz|jovem aprendiz|apprentice)\b/i
  if (TRAINEE_REGEX.test(titNorm) || TRAINEE_REGEX.test(senNorm) || TRAINEE_REGEX.test(descNorm)) {
    return 'Trainee / Aprendiz'
  }

  // 3. Júnior / Entry-Level
  const JUNIOR_REGEX = /\b(junior|jr|entry[- ]level|associate|iniciante|primeiro emprego)\b/i
  if (JUNIOR_REGEX.test(titNorm) || JUNIOR_REGEX.test(senNorm) || JUNIOR_REGEX.test(descNorm)) {
    return 'Júnior / Entry-Level'
  }

  // 4. Assistente / Banco de Talentos
  const ASSISTENTE_REGEX = /\b(assistente|auxiliar|banco de talentos|talent pool|freelancer)\b/i
  if (ASSISTENTE_REGEX.test(titNorm) || ASSISTENTE_REGEX.test(senNorm) || ASSISTENTE_REGEX.test(descNorm)) {
    return 'Assistente / Banco de Talentos'
  }

  // 5. Entrada / Não especificado
  return 'Entrada / Não especificado'
}
