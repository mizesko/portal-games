# 🎮 Portal de Vagas — Games BR

> Portal web de captação e gestão de vagas na indústria de jogos digitais do Brasil, focado em perfis criativos e artísticos.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Lucide React |
| Banco de dados | Arquivo `.xlsx` local via SheetJS + File System Access API |
| Automação | Node.js (ESM) + GitHub Actions |
| Deploy | Vercel (estático) |

## Arquitetura: Headless Single-User Spreadsheet DB

Toda a persistência é feita em um arquivo Excel (`vagas_games_db.xlsx`) no computador da usuária:

- **File System Access API** → acesso direto ao arquivo sem upload/download
- **IndexedDB** → persiste o `FileSystemFileHandle` entre sessões (reconexão em 1 clique)
- **LocalStorage** → cache instantâneo (renderização em 0ms)
- **Mutex via Promise chaining** → fila sequencial de gravações, sem corrupção

### As 4 abas do Excel

| Aba | Descrição |
|-----|-----------|
| `Favoritas` | Vagas favoritadas com notas pessoais |
| `Inscricoes` | Candidaturas com status do processo e notas |
| `Visualizadas` | Histórico de vagas abertas |
| `Descartadas` | Vagas descartadas com motivo e opção de restaurar |

## Estrutura do projeto

```
portal-games/
├── .github/workflows/
│   └── scrape-jobs.yml       # Cron 2x/dia + dispatch manual
├── scripts/
│   └── fetch-jobs.mjs        # Coletor multi-fonte de vagas
├── public/data/
│   └── vagas.json            # Vitrine estática (atualizada pelo CI)
├── src/
│   ├── types/                # job.ts, database.ts
│   ├── services/             # indexedDbService, excelService, storageService
│   ├── context/              # DatabaseContext (estado global + mutex)
│   ├── components/           # ExcelStatusBar, JobCard, JobFilters, JobDetailModal
│   ├── utils/                # format.ts
│   └── App.tsx               # 5 abas de navegação
└── vercel.json
```

## Primeiros passos

### 1. Instalar e rodar localmente

```bash
cd portal-games
npm install
npm run dev
```

### 2. Conectar a planilha

Na barra superior da UI:
- **Nova planilha** → cria `vagas_games_db.xlsx` vazio já formatado
- **Vincular** → conecta um `.xlsx` existente (ex: backup)
- **Exportar backup** → download manual `.xlsx` (funciona em qualquer navegador)

### 3. Deploy na Vercel

```bash
vercel --cwd portal-games
```

Ou conecte o repositório no dashboard da Vercel com as configurações:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `portal-games`

### 4. Configurar GitHub Actions

O workflow `.github/workflows/scrape-jobs.yml` roda automaticamente:
- `cron: '0 11,22 * * *'` — 2x ao dia (08h e 19h BRT)
- Manualmente via **Actions > Coletor de Vagas Games BR > Run workflow**

**Segredo opcional** (para mais vagas via JSearch/RapidAPI):
- `Settings > Secrets > Actions > JSEARCH_API_KEY`

## Fontes de vagas

| Fonte | Tipo | Filtro |
|-------|------|--------|
| Gupy | API JSON pública | Estúdios BR (Wildlife, Gazeus, Tapps, Fanatee…) |
| Hitmarker | API pública | Games, Brazil/Remote |
| Work With Indies | Feed JSON | LATAM/Remote |
| JSearch (opcional) | RapidAPI | "game design/art/tester Brazil" |

## Funcionalidades

### Vitrine de Vagas
- Grid responsivo com filtros por Área, Modelo, Senioridade e busca livre
- Ocultar vagas descartadas/já vistas automaticamente

### Ações rápidas
- ⭐ Favoritar — salva na aba Favoritas do Excel
- ✓ Candidatar — registra na aba Inscrições com status "Enviada"
- 🗑️ Descartar — move para Descartadas (com motivo opcional)

### Painel de Inscrições
- Atualização de status: Enviada → Entrevista → Teste Técnico → Aprovada/Recusada
- Campo de notas livre

### Histórico de Descarte
- Botão "Restaurar" remove da aba Descartadas e devolve a vaga à Vitrine
