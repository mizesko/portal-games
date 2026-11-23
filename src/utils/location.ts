// location.ts
// Regras de localização: 100% Home Office (Remoto / Brasil) ou Todo o Estado de São Paulo (Presencial/Híbrido)

import type { Vaga } from '../types/job'

const FOREIGN_COUNTRIES_AND_HUBS = [
  'united states', 'usa', 'u.s.', 'los angeles', 'san francisco', 'austin', 'seattle',
  'novato', 'california', 'new york', 'canada', 'vancouver', 'montreal', 'toronto',
  'united kingdom', 'london', 'uk', 'england', 'scotland', 'ireland', 'dublin',
  'germany', 'berlin', 'france', 'paris', 'spain', 'barcelona', 'madrid',
  'poland', 'warsaw', 'japan', 'tokyo', 'india', 'bangalore', 'mumbai',
  'singapore', 'australia', 'sydney', 'melbourne', 'china', 'shanghai', 'beijing',
  'sweden', 'stockholm', 'finland', 'helsinki', 'korea', 'seoul', 'south korea',
  'cyprus', 'greece', 'turkey', 'netherlands', 'amsterdam', 'belgium', 'brussels',
  'italy', 'rome', 'milan', 'portugal', 'lisbon', 'austria', 'vienna', 'switzerland', 'zurich',
  'czech', 'prague', 'hungary', 'budapest', 'romania', 'bucharest', 'ukraine', 'kyiv', 'russia',
  'denmark', 'copenhagen', 'norway', 'oslo', 'taiwan', 'taipei', 'israel', 'tel aviv',
  'us only', 'usa only', 'u.s. only', 'remote - us', 'remote - usa', 'us remote',
  'remote - uk', 'uk only', 'remote - canada', 'canada only',
  'remote - europe', 'europe only', 'emea only', 'north america only'
]

const NON_SP_BRAZIL = [
  'rio de janeiro', ' rj', '/rj', ', rj', '- rj',
  'recife', 'pernambuco', ' pe', '/pe', ', pe', '- pe',
  'porto alegre', 'rio grande do sul', ' rs', '/rs', ', rs', '- rs',
  'florianópolis', 'florianopolis', 'santa catarina', ' sc', '/sc', ', sc', '- sc',
  'curitiba', 'paraná', 'parana', ' pr', '/pr', ', pr', '- pr',
  'belo horizonte', 'minas gerais', ' mg', '/mg', ', mg', '- mg',
  'brasília', 'brasilia', 'distrito federal', ' df', '/df', ', df', '- df',
  'salvador', 'bahia', ' ba', '/ba', ', ba', '- ba',
  'fortaleza', 'ceará', 'ceara', ' ce', '/ce', ', ce', '- ce',
  'goiânia', 'goiania', 'goiás', 'goias', ' go', '/go', ', go', '- go',
  'manaus', 'amazonas', ' am', '/am', ', am', '- am',
  'vitória', 'vitoria', 'espírito santo', 'espirito santo', ' es', '/es', ', es', '- es',
  'belém', 'belem', 'pará', 'para', ' pa', '/pa', ', pa', '- pa',
  'natal', 'rio grande do norte', ' rn', '/rn', ', rn', '- rn',
  'maceió', 'maceio', 'alagoas', ' al', '/al', ', al', '- al',
  'joão pessoa', 'joao pessoa', 'paraíba', 'paraiba', ' pb', '/pb',
  'teresina', 'piauí', 'piaui', ' pi', '/pi',
  'campo grande', 'mato grosso do sul', ' ms', '/ms',
  'cuiabá', 'cuiaba', 'mato grosso', ' mt', '/mt',
  'aracaju', 'sergipe', ' se', '/se',
  'porto velho', 'rondônia', 'rondonia', ' ro', '/ro',
  'rio branco', 'acre', ' ac', '/ac',
  'palmas', 'tocantins', ' to', '/to',
  'macapá', 'macapa', 'amapá', 'amapa', ' ap', '/ap',
  'boa vista', 'roraima', ' rr', '/rr'
]

const SP_TERMS = [
  'são paulo', 'sao paulo', 'state of são paulo', 'estado de são paulo',
  'barueri', 'alphaville', 'osasco', 'santo andré', 'santo andre',
  'são bernardo', 'sao bernardo', 'são caetano', 'sao caetano',
  'campinas', 'itapevi', 'guarulhos', 'cotia', 'diadema', 'mauá', 'maua',
  'mogi das cruzes', 'santana de parnaíba', 'santana de parnaiba',
  'jundiaí', 'jundiai', 'são josé dos campos', 'sao jose dos campos',
  'sorocaba', 'santos', 'ribeirão preto', 'ribeirao preto', 'tatuí', 'tatui',
  'piracicaba', 'bauru', 'franca', 'araraquara', 'indaiatuba', 'limeira',
  'itaquaquecetuba', 'suzano', 'taubaté', 'taubate', 'praia grande', 'são vicente'
]

export function is100PercentRemote(vaga: Pick<Vaga, 'local' | 'modelo' | 'titulo'>): boolean {
  const loc = (vaga.local || '').toLowerCase()
  const mod = (vaga.modelo || '').toLowerCase()
  const tit = (vaga.titulo || '').toLowerCase()

  // Se a localização física especifica país ou cidade no exterior (sem ser Worldwide/LATAM)
  const isForeign = FOREIGN_COUNTRIES_AND_HUBS.some(kw => loc.includes(kw))
  const isExplicitWorldwideOrLatam =
    loc.includes('worldwide') || loc.includes('anywhere') || loc.includes('qualquer lugar') ||
    loc.includes('latam') || loc.includes('américa latina') || loc.includes('america latina')

  if (isForeign && !isExplicitWorldwideOrLatam) {
    return false
  }

  // Localização genérica "Brasil" ou "Brazil"
  const isGenericBrazil =
    loc.trim() === 'brasil' || loc.trim() === 'brazil' ||
    loc.trim() === 'brasil / brazil' || loc.trim() === 'brazil / brasil' ||
    loc.includes('todo o brasil')

  const hasRemoteIndication =
    mod.includes('remoto') || mod.includes('remote') ||
    loc.includes('remoto') || loc.includes('remote') || loc.includes('home office') ||
    loc.includes('trabalho de casa') || tit.includes('remoto') || tit.includes('remote') ||
    isExplicitWorldwideOrLatam || isGenericBrazil

  return hasRemoteIndication
}

export function isSaoPaulo(vaga: Pick<Vaga, 'local' | 'modelo' | 'titulo'>): boolean {
  const loc = (vaga.local || '').toLowerCase()
  const tit = (vaga.titulo || '').toLowerCase()
  const combined = `${loc} ${tit}`

  // Bloqueia cidades e países no exterior
  if (FOREIGN_COUNTRIES_AND_HUBS.some(kw => loc.includes(kw))) {
    return false
  }

  // Se tiver indicação explícita de outro estado e não for SP
  if (NON_SP_BRAZIL.some(kw => loc.includes(kw))) {
    const hasSp = SP_TERMS.some(kw => combined.includes(kw)) || /[,/\-\s]sp\b/i.test(combined)
    if (!hasSp) return false
  }

  // Verifica termos de SP ou sufixo ", SP", "- SP", "/ SP"
  const hasSp =
    SP_TERMS.some(kw => combined.includes(kw)) ||
    /[,/\-\s]sp\b/i.test(combined) ||
    combined.endsWith('sp') ||
    combined.includes('são paulo, brazil') ||
    combined.includes('sao paulo, brazil')

  return hasSp
}

export function isAllowedLocation(vaga: Pick<Vaga, 'local' | 'modelo' | 'titulo'>): boolean {
  return is100PercentRemote(vaga) || isSaoPaulo(vaga)
}
