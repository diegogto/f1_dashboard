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
  })

  // Client-side filter logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (activeFilters.year && row.year !== activeFilters.year) return false
      if (activeFilters.driver && row.driver !== activeFilters.driver) return false
      if (activeFilters.team && row.team !== activeFilters.team) return false
      if (activeFilters.brand && row.brand !== activeFilters.brand) return false
      if (activeFilters.wishlistOnly && !row.isWishlisted) return false
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
              {row.isWishlisted && (
                <Heart className="h-3.5 w-3.5 text-red-400 shrink-0 fill-red-400" aria-label="En Wishlist" />
              )}
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
      columnHelper.accessor('brand', {
        header: ({ column }) => <SortableHeader column={column} label="Fabricante" />,
        cell: (info) => (
          <Badge variant="outline" className="text-xs border-white/10 text-slate-400">
            {info.getValue() ?? '—'}
          </Badge>
        ),
        size: 120,
      }),
      columnHelper.accessor('car', {
        header: ({ column }) => <SortableHeader column={column} label="Auto" />,
        cell: (info) => (
          <span className="text-xs text-slate-500 line-clamp-1">{info.getValue() ?? '—'}</span>
        ),
        size: 180,
      }),
      columnHelper.display({
        id: 'priceVariation',
        header: () => <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Precio / Variación</span>,
        cell: ({ row }) => <PriceBadge row={row.original} />,
        size: 180,
      }),
      columnHelper.display({
        id: 'actions',
        header: () => null,
        cell: ({ row }) => {
          const link = row.original.link
          if (!link) return null
          return (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              title="Ver en CK-ModelCars"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-slate-200" />
            </a>
          )
        },
        size: 40,
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
                      'hover:bg-red-950/30'
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
