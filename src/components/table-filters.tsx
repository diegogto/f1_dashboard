'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  years: number[]
  drivers: string[]
  teams: string[]
  brands: string[]
  titles: ('wdc' | 'wcc')[]
  priceChanges: ('up' | 'down')[]
  wishlistOnly: boolean
  hideUnavailable: boolean
  search: string
  minPrice: number | null
  maxPrice: number | null
  showBlacklisted: boolean
}

interface TableFiltersProps {
  filtersData: FiltersData
  activeFilters: ActiveFilters
  onFiltersChange: (filters: ActiveFilters) => void
  totalResults: number
}

function MultiSelectComboboxFilter({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: {
  label: string
  placeholder: string
  options: (string | number)[]
  selectedValues: (string | number)[]
  onChange: (vals: (string | number)[]) => void
}) {
  const [open, setOpen] = useState(false)

  const handleSelect = (opt: string | number) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt))
    } else {
      onChange([...selectedValues, opt])
    }
  }

  const handleClear = () => {
    onChange([])
  }

  const isFiltered = selectedValues.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isFiltered ? 'default' : 'outline'}
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-9 gap-1.5 text-sm font-medium transition-all max-w-[200px]',
            isFiltered
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
          )}
        >
          <span className="truncate">{label}</span>
          {isFiltered ? (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1.5 py-0.5 text-xs bg-white/20 text-white shrink-0">
              {selectedValues.length}
            </Badge>
          ) : null}
          <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform shrink-0', open && 'rotate-180')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 bg-slate-900 border-white/10" align="start">
        <Command className="bg-transparent text-slate-200">
          <CommandInput placeholder={placeholder} className="h-9 text-sm text-white" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty className="text-slate-400 text-sm py-3 text-center">Sin resultados</CommandEmpty>
            <CommandGroup>
              {isFiltered && (
                <CommandItem
                  onSelect={handleClear}
                  className="text-slate-400 text-xs italic cursor-pointer hover:bg-white/5 flex items-center px-2 py-1.5"
                >
                  <X className="mr-2 h-3.5 w-3.5 shrink-0" />
                  Limpiar seleccionados
                </CommandItem>
              )}
              {options.map((opt) => {
                const isSelected = selectedValues.includes(opt)
                return (
                  <CommandItem
                    key={String(opt)}
                    value={String(opt)}
                    onSelect={() => handleSelect(opt)}
                    className="text-sm cursor-pointer hover:bg-white/5 text-slate-200 flex items-center px-2 py-1.5"
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4 shrink-0', isSelected ? 'opacity-100 text-red-400' : 'opacity-0')}
                    />
                    <span className="truncate">{opt}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function PriceRangeFilter({
  minPrice,
  maxPrice,
  onChange,
}: {
  minPrice: number | null
  maxPrice: number | null
  onChange: (min: number | null, max: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [tempMin, setTempMin] = useState<string>(minPrice !== null ? String(minPrice) : '')
  const [tempMax, setTempMax] = useState<string>(maxPrice !== null ? String(maxPrice) : '')

  useEffect(() => {
    setTempMin(minPrice !== null ? String(minPrice) : '')
    setTempMax(maxPrice !== null ? String(maxPrice) : '')
  }, [minPrice, maxPrice])

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    const minVal = tempMin.trim() === '' ? null : parseFloat(tempMin)
    const maxVal = tempMax.trim() === '' ? null : parseFloat(tempMax)
    onChange(
      minVal !== null && !isNaN(minVal) ? minVal : null,
      maxVal !== null && !isNaN(maxVal) ? maxVal : null
    )
    setOpen(false)
  }

  const handleClear = () => {
    setTempMin('')
    setTempMax('')
    onChange(null, null)
    setOpen(false)
  }

  const isFiltered = minPrice !== null || maxPrice !== null

  let labelText = 'Precio'
  if (minPrice !== null && maxPrice !== null) {
    labelText = `${minPrice}€ - ${maxPrice}€`
  } else if (minPrice !== null) {
    labelText = `>= ${minPrice}€`
  } else if (maxPrice !== null) {
    labelText = `<= ${maxPrice}€`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isFiltered ? 'default' : 'outline'}
          className={cn(
            'h-9 gap-1.5 text-sm font-medium transition-all',
            isFiltered
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
          )}
        >
          Precio
          {isFiltered && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs bg-white/20 text-white font-mono">
              {labelText}
            </Badge>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-4 bg-slate-900 border-white/10 text-slate-200" align="start">
        <form onSubmit={handleApply} className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm leading-none">Rango de precio</h4>
            <p className="text-xs text-slate-400">Filtrar por precio (€)</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="min-price" className="text-xs text-slate-400">Mínimo</Label>
              <Input
                id="min-price"
                type="number"
                placeholder="0"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                className="bg-slate-950 border-white/10 text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-price" className="text-xs text-slate-400">Máximo</Label>
              <Input
                id="max-price"
                type="number"
                placeholder="999"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                className="bg-slate-950 border-white/10 text-slate-200"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {isFiltered && (
              <Button type="button" size="sm" variant="ghost" onClick={handleClear} className="text-xs text-slate-400 hover:text-white">
                Limpiar
              </Button>
            )}
            <Button type="submit" size="sm" className="bg-red-600 text-white hover:bg-red-700 text-xs">
              Aplicar
            </Button>
          </div>
        </form>
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
    activeFilters.years.length > 0,
    activeFilters.drivers.length > 0,
    activeFilters.teams.length > 0,
    activeFilters.brands.length > 0,
    activeFilters.titles.length > 0,
    activeFilters.priceChanges && activeFilters.priceChanges.length > 0,
    activeFilters.wishlistOnly,
    activeFilters.hideUnavailable,
    activeFilters.search,
    activeFilters.minPrice !== null ? true : null,
    activeFilters.maxPrice !== null ? true : null,
  ].filter(Boolean).length

  const clearAll = () => {
    onFiltersChange({
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
        <MultiSelectComboboxFilter
          label="Año"
          placeholder="Buscar año..."
          options={filtersData.years}
          selectedValues={activeFilters.years}
          onChange={(v) => onFiltersChange({ ...activeFilters, years: v as number[] })}
        />

        {/* Driver filter */}
        <MultiSelectComboboxFilter
          label="Piloto"
          placeholder="Buscar piloto..."
          options={filtersData.drivers}
          selectedValues={activeFilters.drivers}
          onChange={(v) => onFiltersChange({ ...activeFilters, drivers: v as string[] })}
        />

        {/* Team filter */}
        <MultiSelectComboboxFilter
          label="Escudería"
          placeholder="Buscar escudería..."
          options={filtersData.teams}
          selectedValues={activeFilters.teams}
          onChange={(v) => onFiltersChange({ ...activeFilters, teams: v as string[] })}
        />

        {/* Brand filter */}
        <MultiSelectComboboxFilter
          label="Fabricante"
          placeholder="Buscar fabricante..."
          options={filtersData.brands}
          selectedValues={activeFilters.brands}
          onChange={(v) => onFiltersChange({ ...activeFilters, brands: v as string[] })}
        />

        {/* Champion titles filter */}
        <MultiSelectComboboxFilter
          label="Títulos"
          placeholder="Buscar título..."
          options={['Campeón Pilotos (WDC)', 'Campeón Constructores (WCC)']}
          selectedValues={activeFilters.titles.map((t) =>
            t === 'wdc' ? 'Campeón Pilotos (WDC)' : 'Campeón Constructores (WCC)'
          )}
          onChange={(vals) => {
            const mapped = vals.map((v) =>
              v === 'Campeón Pilotos (WDC)' ? ('wdc' as const) : ('wcc' as const)
            )
            onFiltersChange({ ...activeFilters, titles: mapped })
          }}
        />

        {/* Price variation filter */}
        <MultiSelectComboboxFilter
          label="Variación"
          placeholder="Buscar variación..."
          options={['Subió ▲', 'Bajó ▼']}
          selectedValues={activeFilters.priceChanges ? activeFilters.priceChanges.map((c) =>
            c === 'up' ? 'Subió ▲' : 'Bajó ▼'
          ) : []}
          onChange={(vals) => {
            const mapped = vals.map((v) =>
              v === 'Subió ▲' ? ('up' as const) : ('down' as const)
            )
            onFiltersChange({ ...activeFilters, priceChanges: mapped })
          }}
        />

        {/* Price range filter */}
        <PriceRangeFilter
          minPrice={activeFilters.minPrice}
          maxPrice={activeFilters.maxPrice}
          onChange={(min, max) => onFiltersChange({ ...activeFilters, minPrice: min, maxPrice: max })}
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

        {/* Hide Sold-out toggle */}
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5">
          <Switch
            id="availability-toggle"
            checked={activeFilters.hideUnavailable}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...activeFilters, hideUnavailable: checked })
            }
            className="data-[state=checked]:bg-red-600"
          />
          <Label htmlFor="availability-toggle" className="text-sm text-slate-300 cursor-pointer">
            Ocultar Agotados
          </Label>
        </div>

        {/* Blacklist toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({ ...activeFilters, showBlacklisted: !activeFilters.showBlacklisted })
          }
          className={cn(
            "h-9 gap-1.5 text-xs font-semibold border transition-all",
            activeFilters.showBlacklisted
              ? "bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-950/60 hover:text-amber-300"
              : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-slate-200"
          )}
        >
          {activeFilters.showBlacklisted ? "🚫 Ver Catálogo" : "🚫 Ver Lista Negra"}
        </Button>

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
