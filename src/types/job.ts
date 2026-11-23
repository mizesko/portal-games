// Tipagem da vitrine pública (vagas.json do GitHub)
export type AreaVaga =
  | 'Game Design'
  | 'Arte & Ilustração'
  | 'QA & Game Tester'
  | 'UI/UX'
  | 'Áudio & Narrativa'
  | 'Produção & Comunidade'
  | 'Outros'

export type ModeloTrabalho =
  | 'Remoto'
  | 'Híbrido'
  | 'Presencial'
  | 'Não informado'

export type SenioridadeVaga =
  | 'Estágio'
  | 'Trainee / Aprendiz'
  | 'Júnior / Entry-Level'
  | 'Assistente / Banco de Talentos'
  | 'Entrada / Não especificado'

export interface Vaga {
  vagaId: string
  titulo: string
  estudio: string
  area: AreaVaga
  modelo: ModeloTrabalho
  local: string
  senioridade: SenioridadeVaga
  descricao: string
  link: string
  fonte: string
  dataPublicacao: string    // ISO 8601
  dataColeta: string        // ISO 8601
  salario?: string
  tecnologias?: string[]
}
