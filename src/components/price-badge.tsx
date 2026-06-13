'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { daysSince, formatPrice } from '@/lib/utils'
import { ModelRow } from '@/types/model'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface PriceBadgeProps {
  row: ModelRow
}

export function PriceBadge({ row }: PriceBadgeProps) {
  const { currentPrice, previousPrice, priceChange, lastScrapedAt, currency } = row

  if (currentPrice === null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const days = daysSince(lastScrapedAt)
  const diff =
    currentPrice !== null && previousPrice !== null
      ? currentPrice - previousPrice
      : null

  if (priceChange === 'up') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{formatPrice(currentPrice, currency ?? 'EUR')}</span>
            <Badge
              variant="destructive"
              className="gap-1 px-1.5 py-0.5 text-xs font-bold cursor-default"
            >
              <TrendingUp className="h-3 w-3" />
              {days}d
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Subió {formatPrice(Math.abs(diff ?? 0), currency ?? 'EUR')} hace {days} día{days !== 1 ? 's' : ''}</p>
          <p className="text-muted-foreground">Anterior: {formatPrice(previousPrice, currency ?? 'EUR')}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  if (priceChange === 'down') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">{formatPrice(currentPrice, currency ?? 'EUR')}</span>
            <Badge
              className="gap-1 px-1.5 py-0.5 text-xs font-bold cursor-default bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <TrendingDown className="h-3 w-3" />
              {days}d
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Bajó {formatPrice(Math.abs(diff ?? 0), currency ?? 'EUR')} hace {days} día{days !== 1 ? 's' : ''}</p>
          <p className="text-muted-foreground">Anterior: {formatPrice(previousPrice, currency ?? 'EUR')}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Stable or no history
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold text-sm">{formatPrice(currentPrice, currency ?? 'EUR')}</span>
      {priceChange === 'stable' && (
        <Minus className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  )
}
