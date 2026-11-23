#!/usr/bin/env node
// scripts/fetch-jobs.mjs
// Coletor e validador de vagas de games no Brasil (100% Remoto ou Todo o Estado de SP)
// Fontes: Gupy, LinkedIn Guest, Greenhouse, Lever, Ashby, SmartRecruiters, Jobicy, Himalayas, Remotive, JSearch

import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT = join(ROOT, 'public', 'data', 'vagas.json')

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ─── 1. LEITURA AUTOMÁTICA DO .env LOCAL ──────────────────────────────────────

function loadLocalEnv() {
  const envCandidates = [
    join(ROOT, '.env'),
    join(ROOT, '..', '.env'),
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '.env'),
  ]

  for (const envPath of envCandidates) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8')
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim()
          if (!line || line.startsWith('#')) continue
          const eqIdx = line.indexOf('=')
          if (eqIdx !== -1) {
            const key = line.slice(0, eqIdx).trim()
            let val = line.slice(eqIdx + 1).trim()
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
      }
    } catch {}
  }
}

loadLocalEnv()

const jsearchKey = process.env.JSEARCH_API_KEY || ''
if (jsearchKey) {
  console.log(`🔑 JSEARCH_API_KEY detectada: "${jsearchKey.slice(0, 4)}..." (comprimento: ${jsearchKey.length})`)
} else {
  console.log('ℹ️  JSEARCH_API_KEY não encontrada no .env ou process.env')
}

// ─── 2. FILTRO DE ÁREA E CLASSIFICAÇÃO ─────────────────────────────────────────

const AREA_RULES = [
  {
    keywords: [
      'game design', 'gamer design', 'game designer', 'level design', 'level designer',
      'systems designer', 'combat designer', 'economy designer', 'game balancing'
    ],
    area: 'Game Design'
  },
  {
    keywords: [
      'concept art', 'concept artist', '2d artist', '3d artist', 'artista 2d', 'artista 3d',
      'game artist', 'animator', 'animador', 'animadora', 'illustrator', 'ilustrador', 'ilustradora',
      'character artist', 'environment artist', 'prop artist', 'textur', 'rigging',
      'technical artist', 'tech art', '3d generalist', '3d modeler', 'modelador 3d',
      'motion designer', 'motion graphics', 'motion', 'vfx', 'ilustração', 'ilustracao'
    ],
    area: 'Arte & Ilustração'
  },
  {
    keywords: [
      'game tester', 'qa tester', 'qa games', 'tester de jogos', 'testador de jogos', 'testador',
      'playtester', 'game qa', 'quality assurance', 'qa analyst', 'qa '
    ],
    area: 'QA & Game Tester'
  },
  {
    keywords: [
      'game ui', 'ui designer', 'ux designer', 'ui/ux', 'user interface', 'user experience', 'hud'
    ],
    area: 'UI/UX'
  },
  {
    keywords: [
      'narrative', 'narrative designer', 'sound design', 'sound designer', 'audio designer',
      'game audio', 'game sound', 'composer', 'roteirista jogos', 'roteirista', 'writer'
    ],
    area: 'Áudio & Narrativa'
  },
  {
    keywords: [
      'game producer', 'creative producer', 'producer', 'produtor de jogos', 'community manager',
      'gerente de comunidade'
    ],
    area: 'Produção & Comunidade'
  }
]

export function detectArea(titulo, descricao = '') {
  const text = `${titulo} ${descricao}`.toLowerCase()
  for (const rule of AREA_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return rule.area
    }
  }
  return 'Outros'
}

// ─── 3. FILTRO DE ÁREA CRIATIVA / GAMES (SEM LIXO) ───────────────────────────

export function isCreativeGameJob(titulo, descricao = '') {
  const t = `${titulo} ${descricao}`.toLowerCase()
  const tit = titulo.toLowerCase()

  // Bloqueio imediato de apostas, cassino, iGaming, telemarketing
  const blockedTerms = [
    'cassino', 'casino', 'aposta', 'apostas', 'jogo do bicho',
    'igaming', 'gambling', 'slot', 'slots', 'poker',
    'telemarketing', 'call center', 'atendimento ao cliente', 'sac ',
    'cuidador de animais', 'cuidador', 'veterinário', 'veterinario'
  ]
  for (const term of blockedTerms) {
    if (t.includes(term)) return false
  }

  // Palavra "bet" isolada
  if (/\b(bet|bets|betting)\b/i.test(t)) return false

  // Bloqueio de termos corporativos não-games
  if (t.includes('unity catalog') || t.includes('unitycatalog')) return false
  if (
    tit.includes('talent partner') || tit.includes('recruiter') || tit.includes('accounting') ||
    tit.includes('tax ') || tit.includes('legal ') || tit.includes('paralegal') ||
    tit.includes('brand partnership') || tit.includes('first party partnership') ||
    tit.includes('sales manager') || tit.includes('account executive')
  ) {
    return false
  }

  // Termos criativos prioritários no título
  const titleKeywords = [
    'game design', 'gamer design', 'game designer', 'level design', 'narrative design', 'narrative',
    'roteirista jogos', 'concept art', 'concept artist', '2d artist', '3d artist', 'artista 2d',
    'artista 3d', 'game artist', 'animator', 'animador', 'animadora', 'illustrator', 'ilustrador',
    'ilustradora', 'ilustração', 'motion designer', 'motion', 'tech art', 'vfx',
    'game ui', 'ui designer', 'ux designer', 'ui/ux',
    'game tester', 'qa tester', 'qa games', 'tester de jogos', 'testador de jogos', 'testador',
    'game qa', 'quality assurance', 'sound design', 'sound designer', 'audio designer', 'game audio',
    'game producer', 'creative producer', 'producer', 'community manager',
    'unity developer', 'unity', 'unreal engine', 'unreal developer', 'unreal', 'godot', 'roblox',
    'gameplay', 'designer de jogos', 'desenvolvedor de jogos', 'jogos digitais'
  ]

  const matchesTitle = titleKeywords.some(kw => {
    if (['unity', 'unreal', 'producer', 'godot', 'roblox'].includes(kw)) {
      return new RegExp(`\\b${kw}\\b`, 'i').test(tit)
    }
    return tit.includes(kw)
  })

  if (matchesTitle) {
    const genericRoles = [
      'producer', 'community manager', 'ui/ux', 'ui designer', 'ux designer',
      'qa tester', 'tester', 'testador', 'motion designer', 'motion', 'animador'
    ]
    const isGeneric = genericRoles.some(r => tit.includes(r))
    if (isGeneric) {
      return /\b(game|games|gaming|jogos?|gameplay|estúdio|studio|gamer|unity|unreal|godot|roblox|art|arte|animação|design)\b/i.test(t)
    }
    return true
  }

  const creativeTitleKeywords = ['arte', 'art', 'artist', 'ilustra', 'motion', 'modelador', 'texturizador', 'roteirista', 'tester', 'qa']
  if (creativeTitleKeywords.some(kw => tit.includes(kw))) {
    return /\b(game|games|gaming|jogos?|gameplay|unity|unreal|godot|roblox)\b/i.test(t)
  }

  return false
}

// ─── 4. FILTRO GEOGRÁFICO RÍGIDO (100% REMOTO OU ESTADO DE SP) ───────────────

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

export function isAllowedLocation(job) {
  const loc = (job.local || '').toLowerCase()
  const mod = (job.modelo || '').toLowerCase()
  const tit = (job.titulo || '').toLowerCase()
  const combined = `${loc} ${mod} ${tit}`

  const isExplicitWorldwideOrLatam =
    loc.includes('worldwide') || loc.includes('anywhere') || loc.includes('qualquer lugar') ||
    loc.includes('latam') || loc.includes('américa latina') || loc.includes('america latina')

  // Bloqueio de exterior (a menos que seja explicitamente Worldwide/LATAM)
  const isForeign = FOREIGN_COUNTRIES_AND_HUBS.some(kw => loc.includes(kw))
  if (isForeign && !isExplicitWorldwideOrLatam) {
    return false
  }

  // 1. Aceita 100% Remoto / Home Office / Brasil Genérico
  const isGenericBrazil =
    loc.trim() === 'brasil' || loc.trim() === 'brazil' ||
    loc.trim() === 'brasil / brazil' || loc.trim() === 'brazil / brasil' ||
    loc.includes('todo o brasil')

  const isRemote =
    mod.includes('remoto') || mod.includes('remote') ||
    loc.includes('remoto') || loc.includes('remote') || loc.includes('home office') ||
    loc.includes('trabalho de casa') || tit.includes('remoto') || tit.includes('remote') ||
    isExplicitWorldwideOrLatam || isGenericBrazil

  if (isRemote) {
    return true
  }

  // 2. Presencial ou Híbrido: Todo o Estado de São Paulo
  if (NON_SP_BRAZIL.some(kw => loc.includes(kw))) {
    const hasSp = SP_TERMS.some(kw => combined.includes(kw)) || /[,/\-\s]sp\b/i.test(combined)
    if (!hasSp) return false
  }

  const hasSp =
    SP_TERMS.some(kw => combined.includes(kw)) ||
    /[,/\-\s]sp\b/i.test(combined) ||
    combined.endsWith('sp') ||
    combined.includes('são paulo, brazil') ||
    combined.includes('sao paulo, brazil')

  return hasSp
}

// ─── 5. DETECTORES AUXILIARES ─────────────────────────────────────────────────

export function detectModelo(localTexto = '', titulo = '', descricao = '') {
  const t = `${localTexto} ${titulo}`.toLowerCase()
  if (t.includes('híbrido') || t.includes('hibrido') || t.includes('hybrid')) return 'Híbrido'
  if (
    t.includes('remoto') || t.includes('remote') || t.includes('home office') ||
    t.includes('trabalho de casa') || t.includes('anywhere') || t.includes('worldwide')
  ) {
    return 'Remoto'
  }
  if (t.includes('presencial') || t.includes('on-site') || t.includes('onsite') || t.includes('in-office')) return 'Presencial'

  const descLower = descricao.toLowerCase()
  if (
    descLower.includes('trabalho remoto') || descLower.includes('100% remoto') ||
    descLower.includes('100% remote') || descLower.includes('fully remote')
  ) {
    return 'Remoto'
  }
  return 'Não informado'
}

export function detectSenioridade(titulo, descricao = '') {
  const text = `${titulo} ${descricao}`.toLowerCase()
  if (text.includes('estágio') || text.includes('estagio') || text.includes('intern') || text.includes('trainee')) return 'Estágio'
  if (text.includes('junior') || text.includes('júnior') || text.includes(' jr') || text.includes(' jr.')) return 'Júnior'
  if (text.includes('senior') || text.includes('sênior') || text.includes(' sr') || text.includes(' sr.')) return 'Sênior'
  if (text.includes('lead') || text.includes('principal') || text.includes('especialista') || text.includes('specialist')) return 'Lead/Especialista'
  if (text.includes('pleno') || text.includes('mid-level') || text.includes('mid level')) return 'Pleno'
  return 'Não informado'
}

export function makeVagaId(url) {
  const cleanUrl = url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()
  return createHash('sha256').update(cleanUrl).digest('hex').slice(0, 16)
}

function cleanHtml(html = '') {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── 6. VALIDADOR INTELIGENTE DE URL ──────────────────────────────────────────

const ANTI_BOT_DOMAINS = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'bebee.com',
  'trabajo.org', 'adzuna.com', 'epicgames.com', 'google.com', 'gupy.io'
]

export async function validateUrl(url) {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return { valid: false, reason: 'URL inválida' }
    }
    const parsed = new URL(url)

    // Agregadores e portais com proteção anti-bot: aceita diretamente se tiver path
    const isAntiBot = ANTI_BOT_DOMAINS.some(d => parsed.hostname.includes(d))
    if (isAntiBot) {
      if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname !== '') {
        return { valid: true, finalUrl: url }
      }
      return { valid: false, reason: 'URL de portal sem path de vaga' }
    }

    // Demais URLs (ATS diretos): validação HTTP tolerante
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    })

    // Rejeita apenas 404 e 410 (aceita 200-299 e 403)
    if (res.status === 404 || res.status === 410) {
      return { valid: false, reason: `Status HTTP ${res.status}` }
    }

    const finalUrl = new URL(res.url)
    const origUrl = new URL(url)

    if (
      origUrl.pathname !== '/' && origUrl.pathname !== '' &&
      (finalUrl.pathname === '/' || finalUrl.pathname === '' || finalUrl.pathname === '/br' || finalUrl.pathname === '/br/')
    ) {
      return { valid: false, reason: `Redirecionado para a raiz (${finalUrl.href})` }
    }

    const lowerFinal = res.url.toLowerCase()
    const expiredSlugs = ['404', 'not-found', 'expired', 'vaga-encerrada', 'job-not-found', 'position-closed']
    if (expiredSlugs.some(s => lowerFinal.includes(s))) {
      return { valid: false, reason: `URL com slug de encerramento (${res.url})` }
    }

    return { valid: true, finalUrl: res.url }
  } catch (err) {
    if (err.message && (err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED'))) {
      return { valid: false, reason: err.message }
    }
    // Preserva a vaga se for apenas timeout transitório
    return { valid: true, finalUrl: url }
  }
}

export async function validateUrlsInBatches(jobs, concurrency = 5) {
  const validJobs = []
  let discardedCount = 0

  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async (job) => {
        const val = await validateUrl(job.link)
        if (!val.valid) {
          console.log(`  ❌ [URL Inválida]: "${job.titulo}" (${job.estudio}) -> ${val.reason}`)
          return null
        }
        return job
      })
    )
    for (const r of results) {
      if (r) validJobs.push(r)
      else discardedCount++
    }
  }

  return { validJobs, discardedCount }
}

// ─── 7. FONTES DE CAPTAÇÃO ───────────────────────────────────────────────────

// [1] Gupy Public Search
async function fetchGupy() {
  console.log('📡 [1/10] Consultando Gupy Public Search API (17 termos)...')
  const termos = [
    'game', 'jogos', 'game designer', 'level design', 'artista 2d', 'artista 3d',
    'ilustrador', 'ilustração', 'concept art', 'animador', 'motion designer',
    'ui designer', 'ux designer', 'game tester', 'qa tester', 'testador de jogos',
    'unity', 'unreal'
  ]
  const rawJobs = []

  for (const termo of termos) {
    let jobsFromTerm = []

    try {
      const url = `https://portal.api.gupy.io/api/job?name=${encodeURIComponent(termo)}&limit=50`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json?.data)) jobsFromTerm = json.data
      }
    } catch {}

    if (jobsFromTerm.length === 0) {
      try {
        const res = await fetch('https://candidates.mcp.api.gupy.io/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'search_jobs',
              arguments: { term: termo, limit: 50 }
            }
          }),
          signal: AbortSignal.timeout(8000)
        })
        if (res.ok) {
          const text = await res.text()
          const dataLine = text.split('\n').find(l => l.startsWith('data: '))
          if (dataLine) {
            const payload = JSON.parse(dataLine.slice(6))
            const content = payload.result?.content?.[0]?.text
            const parsed = JSON.parse(content || '{}')
            jobsFromTerm = parsed.data?.data || parsed.data || []
          }
        }
      } catch (err) {
        console.log(`  ⚠️ Gupy termo "${termo}" falhou: ${err.message}`)
      }
    }

    for (const job of jobsFromTerm) {
      const jobUrl = job.jobUrl
      if (!jobUrl) continue

      const titulo = job.name || ''
      const descricao = cleanHtml(job.description || '')
      const empresa = job.careerPageName || job.company?.name || 'Gupy'
      const city = job.city || ''
      const state = job.state || ''
      const local = city ? `${city}, ${state}` : (state || 'Brasil')
      const modelo = job.workplaceType === 'remote' ? 'Remoto' :
        job.workplaceType === 'hybrid' ? 'Híbrido' :
        job.workplaceType === 'on-site' ? 'Presencial' :
        detectModelo(local, titulo, descricao)

      rawJobs.push({
        vagaId: makeVagaId(jobUrl),
        titulo,
        estudio: empresa,
        area: detectArea(titulo, descricao),
        modelo,
        local,
        senioridade: detectSenioridade(titulo, descricao),
        descricao: descricao.slice(0, 500) || 'Detalhes na página da vaga.',
        link: jobUrl,
        fonte: 'Gupy',
        dataPublicacao: job.publishedDate ? new Date(job.publishedDate).toISOString() : new Date().toISOString(),
        dataColeta: new Date().toISOString()
      })
    }
  }

  console.log(`✅ Gupy total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [2] LinkedIn Brasil Public Search (Guest API)
async function fetchLinkedInGuest() {
  console.log('📡 [2/10] Consultando LinkedIn Brasil Public Guest API...')
  const terms = [
    'game designer', 'game artist', 'artista 2d', 'artista 3d',
    'ilustrador', 'game tester', 'unity', 'unreal'
  ]
  const rawJobs = []

  for (const term of terms) {
    const urls = [
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(term)}&location=Brazil&f_WT=2&start=0`,
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(term)}&location=S%C3%A3o%20Paulo%2C%20Brazil&start=0`
    ]

    for (const url of urls) {
      try {
        await new Promise(r => setTimeout(r, 400)) // delay anti-429
        const res = await fetch(url, {
          headers: {
            'User-Agent': BROWSER_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(10000)
        })

        if (!res.ok) continue
        const html = await res.text()
        const cards = html.match(/<li[\s\S]*?<\/li>/g) || []

        for (const card of cards) {
          const titleMatch = card.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/)
          const compMatch = card.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/)
          const locMatch = card.match(/<span class="job-search-card__location">([\s\S]*?)<\/span>/)
          const linkMatch = card.match(/<a class="base-card__full-link[^"]*" href="([^"]+)"/)
          const dateMatch = card.match(/<time[^>]*datetime="([^"]*)"/)

          const link = linkMatch ? linkMatch[1].split('?')[0] : ''
          if (!link) continue

          const titulo = titleMatch ? cleanHtml(titleMatch[1]) : ''
          const empresa = compMatch ? cleanHtml(compMatch[1]) : 'Empresa no LinkedIn'
          const local = locMatch ? cleanHtml(locMatch[1]) : 'Brasil'
          const pubDate = dateMatch && dateMatch[1] ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()
          const modelo = url.includes('f_WT=2') ? 'Remoto' : detectModelo(local, titulo)

          rawJobs.push({
            vagaId: makeVagaId(link),
            titulo,
            estudio: empresa,
            area: detectArea(titulo, ''),
            modelo,
            local,
            senioridade: detectSenioridade(titulo, ''),
            descricao: `Vaga no LinkedIn: ${titulo} na ${empresa} (${local}). Veja detalhes no link oficial.`,
            link,
            fonte: 'LinkedIn',
            dataPublicacao: pubDate,
            dataColeta: new Date().toISOString()
          })
        }
      } catch {}
    }
  }

  console.log(`✅ LinkedIn Guest total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [3] Greenhouse Public Board API
async function fetchGreenhouse() {
  console.log('📡 [3/10] Consultando Greenhouse Public Boards API...')
  const boards = [
    'wildlifestudios', 'epicgames', 'riotgames', 'scopely', 'krafton', 'roblox',
    'bungie', 'bethesda', '2k', 'remedy', 'unity', 'gameloft', 'ubisoft',
    'playrix', 'zynga', 'miniclip'
  ]
  const rawJobs = []

  for (const board of boards) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(10000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const job of jobs) {
        const link = job.absolute_url
        if (!link) continue

        const titulo = job.title || ''
        const descricao = cleanHtml(job.content || '')
        const local = job.location?.name || ''
        const modelo = detectModelo(local, titulo, descricao)

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: board.charAt(0).toUpperCase() + board.slice(1),
          area: detectArea(titulo, descricao),
          modelo,
          local: local || 'Não informado',
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Greenhouse',
          dataPublicacao: job.updated_at ? new Date(job.updated_at).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Greenhouse total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [4] Lever Public Postings API
async function fetchLever() {
  console.log('📡 [4/10] Consultando Lever Public Postings API...')
  const companies = [
    'larian', 'blackbirdinteractive', 'kabam', 'xsolla', 'kokku',
    'kwalee', 'illfonic', 'thatgamecompany', 'peoplecanfly'
  ]
  const rawJobs = []

  for (const company of companies) {
    try {
      const url = `https://api.lever.co/v0/postings/${company}?mode=json`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(10000)
      })
      if (!res.ok) continue
      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue

      for (const job of jobs) {
        const link = job.hostedUrl
        if (!link) continue

        const titulo = job.text || ''
        const descricao = cleanHtml(job.description || '')
        const local = job.categories?.location || ''
        const workplaceType = job.categories?.workplaceType || ''
        const modelo = workplaceType.toLowerCase().includes('remote') ? 'Remoto' :
          workplaceType.toLowerCase().includes('hybrid') ? 'Híbrido' :
          detectModelo(local, titulo, descricao)

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: company.charAt(0).toUpperCase() + company.slice(1),
          area: detectArea(titulo, descricao),
          modelo,
          local: local || 'Não informado',
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Lever',
          dataPublicacao: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Lever total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [5] Ashby Public Job Board API
async function fetchAshby() {
  console.log('📡 [5/10] Consultando Ashby Public Job Board API...')
  const tokens = [
    'thatgamecompany', 'supergiantgames', 'innersloth', 'ironwoodstudios',
    'singularity6', 'pocketpair', 'meduza', 'discord', 'midjourney', 'runwayml'
  ]
  const rawJobs = []

  for (const token of tokens) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${token}`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(10000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const job of jobs) {
        const link = job.jobUrl || job.applyUrl
        if (!link) continue

        const titulo = job.title || ''
        const descricao = cleanHtml(job.descriptionHtml || '')
        const local = job.location || (job.isRemote ? 'Remoto Worldwide' : '')
        const modelo = job.isRemote ? 'Remoto' : detectModelo(local, titulo, descricao)

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: token.charAt(0).toUpperCase() + token.slice(1),
          area: detectArea(titulo, descricao),
          modelo,
          local: local || 'Não informado',
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Ashby',
          dataPublicacao: job.publishedAt ? new Date(job.publishedAt).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Ashby total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [6] SmartRecruiters Public Postings API
async function fetchSmartRecruiters() {
  console.log('📡 [6/10] Consultando SmartRecruiters Public Postings API...')
  const companies = [
    'Ubisoft2', 'Gameloft', 'CDPROJEKTRED', 'Wargaming', 'SquareEnix', 'KeywordsStudios'
  ]
  const rawJobs = []

  for (const company of companies) {
    try {
      const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=100`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(10000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.content || []

      for (const job of jobs) {
        const link = `https://jobs.smartrecruiters.com/${company}/${job.id}`
        const titulo = job.name || ''
        const locObj = job.location || {}
        const local = locObj.fullLocation || locObj.city || ''
        const modelo = locObj.remote ? 'Remoto' : (locObj.hybrid ? 'Híbrido' : detectModelo(local, titulo))

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: company,
          area: detectArea(titulo, ''),
          modelo,
          local: local || 'Não informado',
          senioridade: detectSenioridade(titulo, ''),
          descricao: `Vaga no estúdio ${company}. Local: ${local}. Veja descrição completa no link oficial.`,
          link,
          fonte: 'SmartRecruiters',
          dataPublicacao: job.releasedDate ? new Date(job.releasedDate).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ SmartRecruiters total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [7] Himalayas Public Jobs API (100% Remoto)
async function fetchHimalayas() {
  console.log('📡 [7/10] Consultando Himalayas Public Jobs API (100% Remoto)...')
  const rawJobs = []
  const urls = [
    'https://himalayas.app/jobs/api?limit=50&offset=0',
    'https://himalayas.app/jobs/api?limit=50&offset=50'
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const job of jobs) {
        const link = job.applicationLink || job.guid
        if (!link) continue

        const titulo = job.title || ''
        const descricao = cleanHtml(job.description || job.excerpt || '')
        const locRestrictions = Array.isArray(job.locationRestrictions) && job.locationRestrictions.length > 0
          ? job.locationRestrictions.join(', ')
          : 'Worldwide'

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: job.companyName || 'Estúdio Remoto',
          area: detectArea(titulo, descricao),
          modelo: 'Remoto',
          local: `Remoto (${locRestrictions})`,
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Himalayas',
          dataPublicacao: job.pubDate ? new Date(job.pubDate).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Himalayas total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [8] Jobicy Public Remote Jobs API (100% Remoto)
async function fetchJobicy() {
  console.log('📡 [8/10] Consultando Jobicy Public Remote Jobs API (100% Remoto)...')
  const tags = ['game', 'design', 'artist']
  const rawJobs = []

  for (const tag of tags) {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const job of jobs) {
        const link = job.url
        if (!link) continue

        const titulo = job.jobTitle || ''
        const descricao = cleanHtml(job.jobDescription || '')
        const geo = job.jobGeo || 'Worldwide'

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: job.companyName || 'Estúdio Remoto',
          area: detectArea(titulo, descricao),
          modelo: 'Remoto',
          local: `Remoto (${geo})`,
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Jobicy',
          dataPublicacao: job.pubDate ? new Date(job.pubDate).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Jobicy total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [9] Remotive Public API (100% Remoto)
async function fetchRemotive() {
  console.log('📡 [9/10] Consultando Remotive Public API (100% Remoto)...')
  const urls = [
    'https://remotive.com/api/remote-jobs?search=game',
    'https://remotive.com/api/remote-jobs?category=design'
  ]
  const rawJobs = []

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const jobs = data.jobs || []

      for (const job of jobs) {
        const link = job.url
        if (!link) continue

        const titulo = job.title || ''
        const descricao = cleanHtml(job.description || '')
        const local = job.candidate_required_location || 'Worldwide'

        rawJobs.push({
          vagaId: makeVagaId(link),
          titulo,
          estudio: job.company_name || 'Estúdio Remoto',
          area: detectArea(titulo, descricao),
          modelo: 'Remoto',
          local: `Remoto (${local})`,
          senioridade: detectSenioridade(titulo, descricao),
          descricao: descricao.slice(0, 500) || 'Detalhes no link oficial.',
          link,
          fonte: 'Remotive',
          dataPublicacao: job.publication_date ? new Date(job.publication_date).toISOString() : new Date().toISOString(),
          dataColeta: new Date().toISOString()
        })
      }
    } catch {}
  }

  console.log(`✅ Remotive total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// [10] JSearch API (4 buscas estratégicas limpas para Brasil e Remoto)
async function fetchJSearch() {
  if (!jsearchKey) {
    console.log('ℹ️  [10/10] JSearch API: variável JSEARCH_API_KEY não definida (ignorado silenciosamente).\n')
    return []
  }

  console.log(`📡 [10/10] Consultando JSearch API (4 queries limpas via chave "${jsearchKey.slice(0, 4)}...")...`)
  const searchConfigs = [
    { query: 'game designer vagas', country: 'br', date_posted: 'month', num_pages: '1' },
    { query: 'artista jogos ilustrador 2d 3d', country: 'br', date_posted: 'month', num_pages: '1' },
    { query: 'game tester qa jogos unity unreal', country: 'br', date_posted: 'month', num_pages: '1' },
    { query: 'game design remote', country: 'us', work_from_home: 'true', date_posted: 'month', num_pages: '1' }
  ]
  const rawJobs = []

  for (const config of searchConfigs) {
    const params = new URLSearchParams(config)
    const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`

    try {
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': jsearchKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          'User-Agent': BROWSER_UA
        },
        signal: AbortSignal.timeout(15000)
      })

      const text = await res.text()

      if (res.ok) {
        let json
        try {
          json = JSON.parse(text)
        } catch {
          console.log(`  ⚠️ JSearch JSON parse error na query "${config.query}"`)
          continue
        }

        if (json.status !== 'OK') {
          console.log(`  ⚠️ JSearch status não-OK para "${config.query}":`, JSON.stringify(json).slice(0, 300))
        }

        const jobs = json.data || []
        console.log(`  🎯 JSearch query ["${config.query}"]: ${jobs.length} vagas retornadas`)

        for (const job of jobs) {
          const link = job.job_apply_link || job.apply_options?.[0]?.apply_link || job.job_google_link
          if (!link) continue

          const titulo = job.job_title || ''
          const descricao = cleanHtml(job.job_description || '')
          const city = job.job_city || ''
          const state = job.job_state || ''
          const country = job.job_country || ''
          const local = city ? `${city}, ${state || country}` : (state ? `${state}, ${country}` : country || 'Brasil')
          const modelo = job.job_is_remote ? 'Remoto' : detectModelo(local, titulo, descricao)

          rawJobs.push({
            vagaId: makeVagaId(link),
            titulo,
            estudio: job.employer_name || 'Estúdio',
            area: detectArea(titulo, descricao),
            modelo,
            local,
            senioridade: detectSenioridade(titulo, descricao),
            descricao: descricao.slice(0, 500),
            link,
            fonte: 'JSearch (Google Jobs)',
            dataPublicacao: job.job_posted_at_datetime_utc || new Date().toISOString(),
            dataColeta: new Date().toISOString()
          })
        }
      } else {
        console.log(`  ⚠️ JSearch HTTP ${res.status} para query "${config.query}". Resposta: ${text.slice(0, 300)}`)
      }
    } catch (err) {
      console.log(`  ⚠️ JSearch erro na query "${config.query}": ${err.message}`)
    }
  }

  console.log(`✅ JSearch total bruto: ${rawJobs.length} vagas\n`)
  return rawJobs
}

// ─── 8. ORQUESTRADOR PRINCIPAL ────────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════════════════════════')
  console.log('🎮 PORTAL GAMES BR — PIPELINE DE COLETA AMPLIADO (10 FONTES)')
  console.log('Regras: Somente APIs reais | Sem dados fictícios | 100% Remoto ou Todo o Estado de SP')
  console.log('════════════════════════════════════════════════════════════════════\n')

  const results = await Promise.allSettled([
    fetchGupy(),
    fetchLinkedInGuest(),
    fetchGreenhouse(),
    fetchLever(),
    fetchAshby(),
    fetchSmartRecruiters(),
    fetchHimalayas(),
    fetchJobicy(),
    fetchRemotive(),
    fetchJSearch()
  ])

  const [
    gupyJobs, linkedinJobs, greenhouseJobs, leverJobs, ashbyJobs,
    smartJobs, himalayasJobs, jobicyJobs, remotiveJobs, jsearchJobs
  ] = results.map(r => (r.status === 'fulfilled' ? r.value : []))

  const allRaw = [
    ...gupyJobs, ...linkedinJobs, ...greenhouseJobs, ...leverJobs, ...ashbyJobs,
    ...smartJobs, ...himalayasJobs, ...jobicyJobs, ...remotiveJobs, ...jsearchJobs
  ]

  // Deduplicação por VagaID (hash da URL oficial)
  const seenIds = new Set()
  const uniqueRaw = []
  for (const job of allRaw) {
    if (!seenIds.has(job.vagaId)) {
      seenIds.add(job.vagaId)
      uniqueRaw.push(job)
    }
  }

  console.log('────────────────────────────────────────────────────────────────────')
  console.log(`📊 TOTAL BRUTO COLETADO: ${allRaw.length} vagas (${uniqueRaw.length} únicas)`)
  console.log('────────────────────────────────────────────────────────────────────\n')

  // Filtro de Área Criativa / Games
  let discardedArea = 0
  const creativeJobs = []
  for (const job of uniqueRaw) {
    if (isCreativeGameJob(job.titulo, job.descricao)) {
      creativeJobs.push(job)
    } else {
      discardedArea++
    }
  }
  console.log(`🧹 Descartadas por área irrelevante / não-games: ${discardedArea}`)

  // Filtro Geográfico Rígido (100% Remoto / Brasil Genérico OU Estado de São Paulo)
  let discardedLocation = 0
  const locationAllowedJobs = []
  for (const job of creativeJobs) {
    if (isAllowedLocation(job)) {
      locationAllowedJobs.push(job)
    } else {
      discardedLocation++
    }
  }
  console.log(`📍 Descartadas por localização (fora de SP e não-remoto): ${discardedLocation}`)
  console.log(`\n⏳ Validando URLs ativas das ${locationAllowedJobs.length} vagas pré-aprovadas...`)

  // Validação Inteligente de URLs (com bypass anti-bot e validação de ATS)
  const { validJobs, discardedCount: discardedUrls } = await validateUrlsInBatches(locationAllowedJobs, 5)

  // Ordena por data mais recente
  validJobs.sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime())

  // Grava em public/data/vagas.json
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(validJobs, null, 2), 'utf8')

  console.log('\n════════════════════════════════════════════════════════════════════')
  console.log('📋 RELATÓRIO FINAL DE COLETA EXPANDIDA')
  console.log('════════════════════════════════════════════════════════════════════')
  console.log(`• Gupy (bruto):             ${gupyJobs.length}`)
  console.log(`• LinkedIn Guest (bruto):   ${linkedinJobs.length}`)
  console.log(`• Greenhouse (bruto):       ${greenhouseJobs.length}`)
  console.log(`• Lever (bruto):            ${leverJobs.length}`)
  console.log(`• Ashby (bruto):            ${ashbyJobs.length}`)
  console.log(`• SmartRecruiters (bruto):  ${smartJobs.length}`)
  console.log(`• Himalayas (bruto):        ${himalayasJobs.length}`)
  console.log(`• Jobicy (bruto):           ${jobicyJobs.length}`)
  console.log(`• Remotive (bruto):         ${remotiveJobs.length}`)
  console.log(`• JSearch (bruto):          ${jsearchJobs.length}`)
  console.log(`────────────────────────────────────────────────────────────────────`)
  console.log(`• Total Bruto Coletado:     ${allRaw.length}`)
  console.log(`• Descartadas (Área):       ${discardedArea}`)
  console.log(`• Descartadas (Local):      ${discardedLocation}`)
  console.log(`• Descartadas (URL off):    ${discardedUrls}`)
  console.log(`────────────────────────────────────────────────────────────────────`)
  console.log(`⭐ TOTAL DE VAGAS VÁLIDAS SALVAS EM public/data/vagas.json: ${validJobs.length}`)
  console.log('════════════════════════════════════════════════════════════════════\n')

  if (validJobs.length > 0) {
    console.log('Vagas reais validadas e salvas:')
    for (const v of validJobs) {
      console.log(`  🎮 [${v.area}] ${v.titulo} @ ${v.estudio} | ${v.local} (${v.modelo})`)
      console.log(`     Link: ${v.link}`)
    }
  }
}

main().catch(err => {
  console.error('❌ Erro fatal no pipeline de coleta:', err)
  process.exit(1)
})
