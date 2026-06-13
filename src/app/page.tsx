import { prisma } from '@/lib/db'
import { ModelsTable } from '@/components/models-table'
import { ModelRow } from '@/types/model'
import { Trophy, Database, RefreshCw, TrendingDown } from 'lucide-react'

async function getModels(): Promise<ModelRow[]> {
  const models = await prisma.model.findMany({
    where: { isBlacklisted: false },
    include: {
      priceHistory: {
        orderBy: { scrapedAt: 'desc' },
        take: 2,
      },
    },
    orderBy: [{ year: 'asc' }, { driver: 'asc' }],
  })

  return models.map((model) => {
    const [latest, previous] = model.priceHistory
    const currentPrice = latest?.price ?? null
    const previousPrice = previous?.price ?? null
    const lastScrapedAt = latest?.scrapedAt?.toISOString() ?? null

    let priceChange: 'up' | 'down' | 'stable' | null = null
    if (currentPrice !== null && previousPrice !== null) {
      if (currentPrice > previousPrice) priceChange = 'up'
      else if (currentPrice < previousPrice) priceChange = 'down'
      else priceChange = 'stable'
    }

    return {
      id: model.id,
      ckArticleId: model.ckArticleId,
      year: model.year,
      driver: model.driver,
      team: model.team,
      car: model.car,
      brand: model.brand,
      scale: model.scale,
      link: model.link,
      currency: model.currency,
      carNumber: model.carNumber,
      isWishlisted: model.isWishlisted,
      isBlacklisted: model.isBlacklisted,
      isChampion: model.isChampion,
      isAvailable: model.isAvailable,
      currentPrice,
      previousPrice,
      lastScrapedAt,
      priceChange,
    }
  })
}

async function getFiltersData() {
  const [years, drivers, teams, brands] = await Promise.all([
    prisma.model.findMany({
      where: { isBlacklisted: false, year: { not: null } },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'asc' },
    }),
    prisma.model.findMany({
      where: { isBlacklisted: false, driver: { not: null } },
      select: { driver: true },
      distinct: ['driver'],
      orderBy: { driver: 'asc' },
    }),
    prisma.model.findMany({
      where: { isBlacklisted: false, team: { not: null } },
      select: { team: true },
      distinct: ['team'],
      orderBy: { team: 'asc' },
    }),
    prisma.model.findMany({
      where: { isBlacklisted: false, brand: { not: null } },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    }),
  ])

  return {
    years: years.map((m) => m.year).filter((y): y is number => y !== null),
    drivers: drivers.map((m) => m.driver).filter((d): d is string => d !== null),
    teams: teams.map((m) => m.team).filter((t): t is string => t !== null),
    brands: brands.map((m) => m.brand).filter((b): b is string => b !== null),
  }
}

async function getStats() {
  const [total, wishlisted, lastRun] = await Promise.all([
    prisma.model.count({ where: { isBlacklisted: false } }),
    prisma.model.count({ where: { isWishlisted: true } }),
    prisma.scraperRun.findFirst({
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true, status: true },
    }),
  ])

  return {
    total,
    wishlisted,
    lastRun: lastRun?.startedAt?.toISOString() ?? null,
  }
}


export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let models: ModelRow[] = []
  let filtersData = { years: [] as number[], drivers: [] as string[], teams: [] as string[], brands: [] as string[] }
  let stats = { total: 0, wishlisted: 0, lastRun: null as string | null }
  let dbError = false

  try {
    ;[models, filtersData, stats] = await Promise.all([
      getModels(),
      getFiltersData(),
      getStats(),
    ])
  } catch (error) {
    console.error('Database error:', error)
    dbError = true
  }

  const lastRunDate = stats.lastRun
    ? new Date(stats.lastRun).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Nunca'

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* F1 logo area */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/50">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                  F1 Scale Models
                </h1>
                <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">
                  Dashboard · 1:43
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3" />
              <span>Última actualización: <span className="text-slate-300">{lastRunDate}</span></span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-slate-400">ck-modelcars.de</span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        {/* Database error banner */}
        {dbError && (
          <div className="rounded-xl border border-red-800/50 bg-red-950/30 px-6 py-4 flex items-center gap-3">
            <Database className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">Base de datos no disponible</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Ejecuta las migraciones de Prisma y asegúrate de que PostgreSQL esté corriendo.
              </p>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Modelos en BD"
            value={stats.total.toLocaleString('es')}
            icon={<Database className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label="En Wishlist"
            value={stats.wishlisted.toLocaleString('es')}
            icon={<span className="text-base leading-none">♥</span>}
            color="red"
          />
          <StatCard
            label="Con bajada de precio"
            value={models.filter(m => m.priceChange === 'down').length.toLocaleString('es')}
            icon={<TrendingDown className="h-4 w-4" />}
            color="green"
          />
          <StatCard
            label="Fabricantes únicos"
            value={filtersData.brands.length.toLocaleString('es')}
            icon={<Trophy className="h-4 w-4" />}
            color="amber"
          />
        </div>

        {/* Decorative F1 stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-transparent rounded-full" />

        {/* Main table */}
        <section>
          <ModelsTable initialData={models} filtersData={filtersData} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12 py-6">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between text-xs text-slate-600">
          <span>F1 Scale Models Dashboard · Datos de <a href="https://ck-modelcars.de" target="_blank" className="hover:text-slate-400 transition-colors underline underline-offset-2">ck-modelcars.de</a></span>
          <span>Actualización automática: 03:00 AM CET</span>
        </div>
      </footer>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: 'blue' | 'red' | 'green' | 'amber'
}) {
  const colorMap = {
    blue: 'from-blue-900/30 border-blue-800/30 text-blue-400',
    red: 'from-red-900/30 border-red-800/30 text-red-400',
    green: 'from-emerald-900/30 border-emerald-800/30 text-emerald-400',
    amber: 'from-amber-900/30 border-amber-800/30 text-amber-400',
  }

  return (
    <div className={`rounded-xl border bg-gradient-to-br to-slate-900/50 p-4 space-y-2 ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className={`opacity-70 ${colorMap[color].split(' ')[2]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
    </div>
  )
}
