'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, X, Filter } from 'lucide-react'
import { FiltersData } from '@/types/model'
import { Label } from '@/components/ui/label'

export type ActiveFilters = {
  year: number | null
  driver: string | null
  team: string | null
  brand: string | null
  wishlistOnly: boolean
  search: string
}

interface TableFiltersProps {
  filtersData: FiltersData
  activeFilters: ActiveFilters
  onFiltersChange: (filters: ActiveFilters) => void
  totalResults: number
}

function ComboboxFilter({
  label,
  placeholder,
  options,
  value,
  onSelect,
}: {
  label: string
  placeholder: string
  options: (string | number)[]
  value: string | number | null
  onSelect: (val: string | number | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={value ? 'default' : 'outline'}
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 gap-1.5 text-sm font-medium transition-all',
            value
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
          )}
        >
          {label}
          {value ? (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs bg-white/20 text-white">
              {value}
            </Badge>
          ) : null}
          <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0 bg-slate-900 border-white/10" align="start">
        <Command className="bg-transparent">
          <CommandInput placeholder={placeholder} className="h-9 text-sm" />
          <CommandList>
            <CommandEmpty className="text-slate-400 text-sm py-3 text-center">Sin resultados</CommandEmpty>
            <CommandGroup>
              {value !== null && (
                <CommandItem
                  onSelect={() => { onSelect(null); setOpen(false) }}
                  className="text-slate-400 text-xs italic"
                >
                  <X className="mr-2 h-3 w-3" />
                  Limpiar filtro
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={String(opt)}
                  value={String(opt)}
                  onSelect={() => {
                    onSelect(opt === value ? null : opt)
                    setOpen(false)
                  }}
                  className="text-sm"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === opt ? 'opacity-100 text-red-400' : 'opacity-0')}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function TableFilters({
  filtersData,
  activeFilters,
  onFiltersChange,
  totalResults,
}: TableFiltersProps) {
  const activeCount = [
    activeFilters.year,
    activeFilters.driver,
    activeFilters.team,
    activeFilters.brand,
    activeFilters.wishlistOnly,
    activeFilters.search,
  ].filter(Boolean).length

  const clearAll = () => {
    onFiltersChange({ year: null, driver: null, team: null, brand: null, wishlistOnly: false, search: '' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar piloto, auto, artículo..."
          value={activeFilters.search}
          onChange={(e) => onFiltersChange({ ...activeFilters, search: e.target.value })}
          className="h-9 w-64 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
        />

        {/* Year filter */}
        <ComboboxFilter
          label="Año"
          placeholder="Buscar año..."
          options={filtersData.years}
          value={activeFilters.year}
          onSelect={(v) => onFiltersChange({ ...activeFilters, year: v as number | null })}
        />

        {/* Driver filter */}
        <ComboboxFilter
          label="Piloto"
          placeholder="Buscar piloto..."
          options={filtersData.drivers}
          value={activeFilters.driver}
          onSelect={(v) => onFiltersChange({ ...activeFilters, driver: v as string | null })}
        />

        {/* Team filter */}
        <ComboboxFilter
          label="Escudería"
          placeholder="Buscar escudería..."
          options={filtersData.teams}
          value={activeFilters.team}
          onSelect={(v) => onFiltersChange({ ...activeFilters, team: v as string | null })}
        />

        {/* Brand filter */}
        <ComboboxFilter
          label="Fabricante"
          placeholder="Buscar fabricante..."
          options={filtersData.brands}
          value={activeFilters.brand}
          onSelect={(v) => onFiltersChange({ ...activeFilters, brand: v as string | null })}
        />

        {/* Wishlist toggle */}
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5">
          <Switch
            id="wishlist-toggle"
            checked={activeFilters.wishlistOnly}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...activeFilters, wishlistOnly: checked })
            }
            className="data-[state=checked]:bg-red-600"
          />
          <Label htmlFor="wishlist-toggle" className="text-sm text-slate-300 cursor-pointer">
            Solo Wishlist ♥
          </Label>
        </div>

        {/* Clear all */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-9 gap-1 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar ({activeCount})
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500">
        Mostrando <span className="font-semibold text-slate-300">{totalResults.toLocaleString('es')}</span> modelo{totalResults !== 1 ? 's' : ''}
        {activeCount > 0 && ' (filtrado)'}
      </p>
    </div>
  )
}
