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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    year: null,
    driver: null,
    team: null,
    brand: null,
    wishlistOnly: false,
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

      if (activeFilters.year && row.year !== activeFilters.year) return false
      if (activeFilters.driver && row.driver !== activeFilters.driver) return false
      if (activeFilters.team && row.team !== activeFilters.team) return false
      if (activeFilters.brand && row.brand !== activeFilters.brand) return false
      if (activeFilters.wishlistOnly && !row.isWishlisted) return false
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
      columnHelper.accessor('team', {
        header: ({ column }) => <SortableHeader column={column} label="Escudería" />,
        cell: (info) => (
          <span className="text-sm text-slate-300 line-clamp-1">{info.getValue() ?? '—'}</span>
        ),
        size: 180,
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
          <span className="text-xs text-slate-500 line-clamp-1">{info.getValue() ?? '—'}</span>
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
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
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
              {table.getRowModel().rows.length === 0 ? (
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
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 first:pl-6 last:pr-6 align-middle"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
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
