import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const driver = searchParams.get('driver')
    const team = searchParams.get('team')
    const wishlistOnly = searchParams.get('wishlist') === 'true'

    const where: Record<string, unknown> = {
      isBlacklisted: false,
    }

    if (year) where.year = parseInt(year)
    if (driver) where.driver = { contains: driver, mode: 'insensitive' }
    if (team) where.team = { contains: team, mode: 'insensitive' }
    if (wishlistOnly) where.isWishlisted = true

    // Get models with their two most recent price history entries
    const models = await prisma.model.findMany({
      where,
      include: {
        priceHistory: {
          orderBy: { scrapedAt: 'desc' },
          take: 2,
        },
      },
      orderBy: [{ year: 'asc' }, { driver: 'asc' }],
    })

    // Compute currentPrice, previousPrice and priceChange for each model
    const modelsWithVariation = models.map((model) => {
      const [latest, previous] = model.priceHistory
      const currentPrice = latest?.price ?? null
      const previousPrice = previous?.price ?? null
      const lastScrapedAt = latest?.scrapedAt ?? null

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

    return NextResponse.json({ data: modelsWithVariation, total: modelsWithVariation.length })
  } catch (error) {
    console.error('[API/models] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET filter options (unique values for faceted filters)
export async function HEAD() {
  return NextResponse.json({})
}
