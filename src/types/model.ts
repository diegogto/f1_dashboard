export type ModelRow = {
  id: number
  ckArticleId: string
  year: number | null
  driver: string | null
  team: string | null
  car: string | null
  brand: string | null
  scale: string | null
  link: string | null
  currency: string | null
  carNumber: number | null
  isWishlisted: boolean
  isBlacklisted: boolean
  isChampion: boolean
  currentPrice: number | null
  previousPrice: number | null
  lastScrapedAt: string | null
  priceChange: 'up' | 'down' | 'stable' | null
}

export type FiltersData = {
  years: number[]
  drivers: string[]
  teams: string[]
  brands: string[]
}
