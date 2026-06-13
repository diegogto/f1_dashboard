import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined, currency = 'EUR'): string {
  if (price == null) return '—'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price)
}

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 0
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}
