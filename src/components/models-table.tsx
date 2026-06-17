'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { ModelRow } from '@/types/model'
import { PriceBadge } from './price-badge'
import { TableFilters, ActiveFilters } from './table-filters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Crown,
  Heart,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDriverChampion, isTeamChampion } from '@/lib/champions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const columnHelper = createColumnHelper<ModelRow>()

interface ModelsTableProps {
  initialData: ModelRow[]
  filtersData: {
    years: number[]
    drivers: string[]
    teams: string[]
    brands: string[]
  }
}

export function ModelsTable({ initialData, filtersData }: ModelsTableProps) {
  const [data, setData] = useState<ModelRow[]>(initialData)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'year', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    years: [],
    drivers: [],
    teams: [],
    brands: [],
    titles: [],
    priceChanges: [],
    wishlistOnly: false,
    hideUnavailable: false,
    search: '',
    minPrice: null,
    maxPrice: null,
    showBlacklisted: false,
  })
  const [toast, setToast] = useState<{
    id: number
    ckArticleId: string
    visible: boolean
    timer: NodeJS.Timeout | null
  } | null>(null)
  const [selectedModelForHistory, setSelectedModelForHistory] = useState<ModelRow | null>(null)
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 50,
  })
  const [isLoaded, setIsLoaded] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('f1_active_filters')
    if (savedFilters) {
      try {
        setActiveFilters(JSON.parse(savedFilters))
      } catch (e) {
        console.error('Error loading saved filters:', e)
      }
    }

    const savedPagination = localStorage.getItem('f1_pagination')
    if (savedPagination) {
      try {
        setPagination(JSON.parse(savedPagination))
      } catch (e) {
        console.error('Error loading saved pagination:', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save state to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('f1_active_filters', JSON.stringify(activeFilters))
    }
  }, [activeFilters, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('f1_pagination', JSON.stringify(pagination))
    }
  }, [pagination, isLoaded])

  // Reset page index when filters change to avoid out of bounds views
  useEffect(() => {
    if (isLoaded) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }, [activeFilters, isLoaded])

  // Toggle handlers
  const handleToggleBlacklist = useCallback(async (row: ModelRow, isBlacklisted: boolean) => {
    // Optimistic update
    setData((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, isBlacklisted } : item))
    )

    try {
      const res = await fetch('/api/models/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: row.id, action: 'blacklist', value: isBlacklisted }),
      })
      if (!res.ok) {
        // Rollback on error
        setData((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, isBlacklisted: !isBlacklisted } : item))
        )
      } else {
        if (isBlacklisted) {
          // If we blacklisted the model, trigger the undo toast
          setToast((prevToast) => {
            if (prevToast?.timer) clearTimeout(prevToast.timer)
            const timer = setTimeout(() => {
              setToast(null)
            }, 20000) // 20 seconds
            return {
              id: row.id,
              ckArticleId: row.ckArticleId,
              visible: true,
              timer,
            }
          })
        } else {
          // If we restored, hide toast if it was for this model
          setToast((prevToast) => {
            if (prevToast?.id === row.id) {
              if (prevToast.timer) clearTimeout(prevToast.timer)
              return null
            }
            return prevToast
          })
        }
      }
    } catch (err) {
      console.error(err)
      // Rollback
      setData((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, isBlacklisted: !isBlacklisted } : item))
      )
    }
  }, [toast])

  const handleToggleWishlist = useCallback(async (row: ModelRow) => {
    const nextValue = !row.isWishlisted
    // Optimistic update
    setData((prev) =>
      prev.map((item) => (item.id === row.id ? { ...item, isWishlisted: nextValue } : item))
    )

    try {
      const res = await fetch('/api/models/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: row.id, action: 'wishlist', value: nextValue }),
      })
      if (!res.ok) {
        // Rollback
        setData((prev) =>
          prev.map((item) => (item.id === row.id ? { ...item, isWishlisted: !nextValue } : item))
        )
      }
    } catch (err) {
      console.error(err)
      setData((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, isWishlisted: !nextValue } : item))
      )
    }
  }, [])

  // Client-side filter logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Blacklist filter first
      if (activeFilters.showBlacklisted) {
        if (!row.isBlacklisted) return false
      } else {
        if (row.isBlacklisted) return false
      }

      if (activeFilters.years.length > 0 && (row.year === null || !activeFilters.years.includes(row.year))) return false
      if (activeFilters.drivers.length > 0 && (row.driver === null || !activeFilters.drivers.includes(row.driver))) return false
      if (activeFilters.teams.length > 0 && (row.team === null || !activeFilters.teams.includes(row.team))) return false
      if (activeFilters.brands.length > 0 && (row.brand === null || !activeFilters.brands.includes(row.brand))) return false
      if (activeFilters.wishlistOnly && !row.isWishlisted) return false
      if (activeFilters.hideUnavailable && !row.isAvailable) return false
      if (activeFilters.priceChanges && activeFilters.priceChanges.length > 0) {
        if (row.priceChange === null || !(activeFilters.priceChanges as string[]).includes(row.priceChange)) return false
      }

      if (activeFilters.titles.length > 0) {
        let matches = false
        if (activeFilters.titles.includes('wdc') && isDriverChampion(row.year, row.driver)) {
          matches = true
        }
        if (activeFilters.titles.includes('wcc') && isTeamChampion(row.year, row.team)) {
          matches = true
        }
        if (!matches) return false
      }
      if (activeFilters.minPrice !== null && activeFilters.minPrice !== undefined) {
        if (row.currentPrice === null || row.currentPrice < activeFilters.minPrice) return false
      }
      if (activeFilters.maxPrice !== null && activeFilters.maxPrice !== undefined) {
        if (row.currentPrice === null || row.currentPrice > activeFilters.maxPrice) return false
      }
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase()
        const searchable = [row.driver, row.team, row.car, row.ckArticleId, row.brand]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(q)) return false
      }
      return true
    })
  }, [data, activeFilters])

  const columns = useMemo(
    () => [
      columnHelper.accessor('year', {
        header: ({ column }) => (
          <SortableHeader column={column} label="Año" />
        ),
        cell: (info) => (
          <span className="font-mono text-sm font-semibold text-slate-200">
            {info.getValue() ?? '—'}
          </span>
        ),
        size: 80,
      }),
      columnHelper.display({
        id: 'wccTrophy',
        header: () => null,
        cell: ({ row }) => {
          const m = row.original
          const winner = isTeamChampion(m.year, m.team)
          if (!winner) return <div className="w-5" />
          return (
            <div className="flex justify-center w-5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src="/wcc_cup.png"
                      alt="Copa Constructores"
                      className="w-5 h-5 shrink-0 transition-all duration-200 hover:scale-125 object-contain cursor-help filter drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-slate-900 border border-white/10 text-white p-2 text-xs rounded-md shadow-xl">
                    Campeón de Constructores {m.year} ({m.team})
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        },
        size: 40,
      }),
      columnHelper.accessor('team', {
        header: ({ column }) => <SortableHeader column={column} label="Escudería" />,
        cell: (info) => (
          <span className="text-sm text-slate-300 line-clamp-1">{info.getValue() ?? '—'}</span>
        ),
        size: 180,
      }),
      columnHelper.display({
        id: 'wdcTrophy',
        header: () => null,
        cell: ({ row }) => {
          const m = row.original
          const winner = isDriverChampion(m.year, m.driver)
          if (!winner) return <div className="w-5" />
          return (
            <div className="flex justify-center w-5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src="/wdc_cup.png"
                      alt="Copa Pilotos"
                      className="w-5 h-5 shrink-0 transition-all duration-200 hover:scale-125 object-contain cursor-help filter drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-slate-900 border border-white/10 text-white p-2 text-xs rounded-md shadow-xl">
                    Campeón de Pilotos {m.year} ({m.driver})
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )
        },
        size: 40,
      }),
      columnHelper.accessor('driver', {
        header: ({ column }) => <SortableHeader column={column} label="Piloto" />,
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="flex items-center gap-1.5">
              {row.isChampion && (
                <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-label="Campeón Mundial" />
              )}
              <span className="text-sm font-medium text-slate-100">{info.getValue() ?? '—'}</span>
            </div>
          )
        },
        size: 200,
      }),
      columnHelper.accessor('carNumber', {
        header: ({ column }) => <SortableHeader column={column} label="Nº" />,
        cell: (info) => {
          const val = info.getValue()
          return val != null ? (
            <span className="font-mono text-sm font-bold text-slate-400">#{val}</span>
          ) : (
            <span className="text-slate-600">—</span>
          )
        },
        size: 60,
      }),
      columnHelper.accessor('car', {
        header: ({ column }) => <SortableHeader column={column} label="Auto" />,
        cell: (info) => (
          <span className="text-xs text-slate-400 font-medium line-clamp-1">
            {info.getValue() ?? '—'}
          </span>
        ),
        size: 180,
      }),
      columnHelper.accessor('brand', {
        header: ({ column }) => <SortableHeader column={column} label="Fabricante" />,
        cell: (info) => (
          <Badge variant="outline" className="text-xs border-white/10 text-slate-400">
            {info.getValue() ?? '—'}
          </Badge>
        ),
        size: 120,
      }),
      columnHelper.accessor('currentPrice', {
        id: 'priceVariation',
        header: ({ column }) => <SortableHeader column={column} label="Precio / Variación" />,
        cell: ({ row }) => <PriceBadge row={row.original} />,
        size: 180,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const model = row.original
          const link = model.link
          return (
            <div className="flex items-center gap-2.5 justify-end pr-1">
              {/* Wishlist Heart */}
              <button
                onClick={() => handleToggleWishlist(model)}
                className="hover:scale-110 transition-transform focus:outline-none"
                title={model.isWishlisted ? "Quitar de Wishlist" : "Agregar a Wishlist"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-colors cursor-pointer",
                    model.isWishlisted
                      ? "text-red-500 fill-red-500 opacity-100"
                      : "text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                  )}
                />
              </button>

              {/* Blacklist toggle */}
              <button
                onClick={() => handleToggleBlacklist(model, !model.isBlacklisted)}
                className="hover:scale-110 transition-transform focus:outline-none"
                title={model.isBlacklisted ? "Quitar de Lista Negra" : "Mover a Lista Negra"}
              >
                {model.isBlacklisted ? (
                  <Eye className="h-4 w-4 text-amber-500 hover:text-amber-400 opacity-100 cursor-pointer" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-500 hover:text-amber-500 opacity-0 group-hover:opacity-100 cursor-pointer" />
                )}
              </button>

              {/* External link */}
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform focus:outline-none"
                  title="Ver en CK-ModelCars"
                >
                  <ExternalLink className="h-4 w-4 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100" />
                </a>
              )}
            </div>
          )
        },
        size: 90,
      }),
    ],
    []
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <TableFilters
        filtersData={filtersData}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        totalResults={filteredData.length}
      />

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/50 backdrop-blur-sm shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/10 bg-slate-800/60">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 first:pl-6 last:pr-6"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {!isLoaded ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-white/5 transition-colors',
                      i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-3.5 first:pl-6 last:pr-6 align-middle"
                      >
                        <div className="h-4 bg-white/5 rounded animate-pulse w-full max-w-[80%]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16 text-slate-500 text-sm">
                    No se encontraron modelos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'group border-b border-white/5 transition-colors',
                      i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20',
                      row.original.isAvailable
                        ? 'hover:bg-red-950/30'
                        : 'opacity-50 hover:bg-slate-800/30'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isActions = cell.column.id === 'actions'
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-4 py-3 first:pl-6 last:pr-6 align-middle",
                            !isActions && "cursor-pointer"
                          )}
                          onClick={!isActions ? () => setSelectedModelForHistory(row.original) : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Undo Toast Notification */}
      {toast && toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center justify-between gap-4 w-80 rounded-xl border border-red-500/20 bg-slate-900/90 backdrop-blur-md p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-950/50 flex items-center justify-center border border-red-900/30 text-red-400 shrink-0 text-sm">
              🚫
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Modelo enviado a Lista Negra</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Artículo: {toast.ckArticleId}</p>
            </div>
          </div>
          <button
            onClick={() => {
              const matchedModel = initialData.find((m) => m.id === toast.id)
              if (matchedModel) {
                handleToggleBlacklist(matchedModel, false)
              }
            }}
            className="text-xs font-bold text-red-400 hover:text-red-300 underline underline-offset-2 shrink-0 transition-colors focus:outline-none"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* Price History Modal */}
      {selectedModelForHistory && (
        <PriceHistoryModal
          model={selectedModelForHistory}
          onClose={() => setSelectedModelForHistory(null)}
        />
      )}
    </div>
  )
}

// Reusable sortable column header
function SortableHeader({
  column,
  label,
}: {
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void }
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-red-400" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3 text-red-400" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  )
}

interface PriceHistoryModalProps {
  model: ModelRow
  onClose: () => void
}

interface PriceHistoryEntry {
  id: number
  price: number
  scrapedAt: string
}

interface PriceData {
  model: {
    id: number
    car: string | null
    driver: string | null
    year: number | null
    team: string | null
    brand: string | null
  }
  history: PriceHistoryEntry[]
}

function PriceHistoryModal({ model, onClose }: PriceHistoryModalProps) {
  const [priceData, setPriceData] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/models/price-history?id=${model.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar el historial de precios')
        return res.json()
      })
      .then((data) => {
        setPriceData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [model.id])

  const width = 500
  const height = 220
  const paddingLeft = 50
  const paddingRight = 20
  const paddingTop = 30
  const paddingBottom = 30
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const points = useMemo(() => {
    if (!priceData || priceData.history.length === 0) return []
    const history = priceData.history
    const prices = history.map((h) => h.price)
    let minP = Math.min(...prices)
    let maxP = Math.max(...prices)

    if (minP === maxP) {
      minP = Math.max(0, minP - 5)
      maxP = maxP + 5
    } else {
      const diff = maxP - minP
      minP = Math.max(0, minP - diff * 0.1)
      maxP = maxP + diff * 0.1
    }

    const times = history.map((h) => new Date(h.scrapedAt).getTime())
    const minT = Math.min(...times)
    const maxT = Math.max(...times)
    const diffT = maxT - minT || 1

    return history.map((h) => {
      const t = new Date(h.scrapedAt).getTime()
      const x =
        paddingLeft +
        (history.length > 1 ? ((t - minT) / diffT) * chartWidth : chartWidth / 2)
      const y =
        paddingTop + (1 - (h.price - minP) / (maxP - minP)) * chartHeight
      return {
        x,
        y,
        price: h.price,
        date: h.scrapedAt,
      }
    })
  }, [priceData, chartWidth, chartHeight])

  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    if (points.length === 1) {
      const y = points[0].y
      return `M ${paddingLeft} ${y} L ${width - paddingRight} ${y}`
    }
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const bottom = height - paddingBottom
    if (points.length === 1) {
      const y = points[0].y
      return `M ${paddingLeft} ${y} L ${width - paddingRight} ${y} L ${width - paddingRight} ${bottom} L ${paddingLeft} ${bottom} Z`
    }
    const first = points[0]
    const last = points[points.length - 1]
    return `${linePath} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`
  }, [points, linePath])

  const yTicks = useMemo(() => {
    if (!priceData || priceData.history.length === 0) return []
    const prices = priceData.history.map((h) => h.price)
    let minP = Math.min(...prices)
    let maxP = Math.max(...prices)
    if (minP === maxP) {
      minP = Math.max(0, minP - 5)
      maxP = maxP + 5
    } else {
      const diff = maxP - minP
      minP = Math.max(0, minP - diff * 0.1)
      maxP = maxP + diff * 0.1
    }

    const count = 4
    return Array.from({ length: count }, (_, i) => {
      const val = minP + (maxP - minP) * (i / (count - 1))
      const y = paddingTop + (1 - (val - minP) / (maxP - minP)) * chartHeight
      return { val, y }
    })
  }, [priceData, chartHeight])

  const xTicks = useMemo(() => {
    if (!points || points.length === 0) return []
    if (points.length === 1) {
      return [
        {
          label: new Date(points[0].date).toLocaleDateString('es', {
            day: '2-digit',
            month: 'short',
          }),
          x: width / 2,
          anchor: 'middle' as const,
        },
      ]
    }
    const first = points[0]
    const last = points[points.length - 1]
    return [
      {
        label: new Date(first.date).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        }),
        x: first.x,
        anchor: 'start' as const,
      },
      {
        label: new Date(last.date).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: '2-digit',
        }),
        x: last.x,
        anchor: 'end' as const,
      },
    ]
  }, [points])

  const stats = useMemo(() => {
    if (!priceData || priceData.history.length === 0) return null
    const prices = priceData.history.map((h) => h.price)
    const current = prices[prices.length - 1]
    const initial = prices[0]
    const change = current - initial
    const percent = initial !== 0 ? (change / initial) * 100 : 0
    return {
      current,
      initial,
      min: Math.min(...prices),
      max: Math.max(...prices),
      change,
      percent,
    }
  }, [priceData])

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-xl bg-slate-900 border border-white/10 text-white rounded-xl shadow-2xl overflow-hidden p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 uppercase tracking-wider">
            <Calendar className="h-3 w-3" /> Historial de Precios
          </div>
          <DialogTitle className="text-xl font-bold text-white leading-tight mt-1">
            {model.car}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-1 space-y-1">
            <span className="block">
              {model.driver && <span>Piloto: <strong className="text-slate-200">{model.driver}</strong></span>}
              {model.year && <span> ({model.year})</span>}
              {model.team && <span className="ml-3">Escudería: <strong className="text-slate-200">{model.team}</strong></span>}
              {model.brand && <span className="ml-3">Fabricante: <strong className="text-slate-200">{model.brand}</strong></span>}
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Cargando datos históricos...</p>
          </div>
        ) : error ? (
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-4">
            <div className="text-3xl">⚠️</div>
            <p className="text-sm font-semibold text-slate-200 mt-2">Error</p>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
        ) : !priceData || priceData.history.length === 0 ? (
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-slate-400">No hay registros de precios disponibles para este modelo.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Quick stats grid */}
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-white/5 rounded-lg p-3">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Precio Inicial</span>
                  <span className="text-base font-bold text-slate-300 font-mono mt-0.5 block">€{stats.initial.toFixed(2)}</span>
                </div>
                <div className="bg-slate-800/40 border border-white/5 rounded-lg p-3">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Precio Actual</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">€{stats.current.toFixed(2)}</span>
                </div>
                <div className="bg-slate-800/40 border border-white/5 rounded-lg p-3">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Variación</span>
                  <span className={cn(
                    "text-base font-bold font-mono mt-0.5 block flex items-center gap-1",
                    stats.change < 0 ? "text-emerald-400" : stats.change > 0 ? "text-red-400" : "text-slate-300"
                  )}>
                    {stats.change < 0 ? <TrendingDown className="h-4 w-4" /> : stats.change > 0 ? <TrendingUp className="h-4 w-4" /> : null}
                    {stats.change > 0 ? '+' : ''}{stats.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* SVG native chart */}
            <div className="relative w-full h-[220px] bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden shadow-inner p-1">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <defs>
                  {/* Glow filter for the trend line */}
                  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Degradado rojo semitransparente */}
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {yTicks.map((tick, i) => (
                  <g key={i} className="opacity-20">
                    <line
                      x1={paddingLeft}
                      y1={tick.y}
                      x2={width - paddingRight}
                      y2={tick.y}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={tick.y + 4}
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                      opacity="0.8"
                    >
                      €{tick.val.toFixed(2)}
                    </text>
                  </g>
                ))}

                {/* Area path */}
                {areaPath && (
                  <path d={areaPath} fill="url(#chartGrad)" />
                )}

                {/* Line path */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                  />
                )}

                {/* Interactive Points */}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIndex === i ? 6.5 : 4}
                    fill={hoveredIndex === i ? '#f59e0b' : '#ef4444'}
                    stroke="#ffffff"
                    strokeWidth={hoveredIndex === i ? 2 : 1.5}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}

                {/* X Axis Ticks */}
                {xTicks.map((tick, i) => (
                  <text
                    key={i}
                    x={tick.x}
                    y={height - 10}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor={tick.anchor || 'middle'}
                    opacity="0.7"
                  >
                    {tick.label}
                  </text>
                ))}
              </svg>

              {/* Point hover absolute tooltip */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <div
                  className="absolute z-50 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white pointer-events-none shadow-2xl flex flex-col gap-0.5 -translate-x-1/2 -translate-y-full transition-all duration-75"
                  style={{
                    left: `${(points[hoveredIndex].x / width) * 100}%`,
                    top: `${(points[hoveredIndex].y / height) * 100 - 4}%`,
                  }}
                >
                  <span className="font-bold text-red-400 text-center font-mono">€{points[hoveredIndex].price.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-400 font-mono tracking-tight shrink-0 whitespace-nowrap">
                    {new Date(points[hoveredIndex].date).toLocaleDateString('es', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Historical list section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historial detallado</h4>
              <div className="border border-white/5 rounded-lg overflow-hidden bg-slate-950/20 max-h-[160px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-800/20 text-slate-400 font-medium">
                      <th className="px-4 py-2">Fecha y Hora</th>
                      <th className="px-4 py-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {priceData.history.slice().reverse().map((h, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-slate-400 font-mono">
                          {new Date(h.scrapedAt).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-white font-mono">
                          €{h.price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
