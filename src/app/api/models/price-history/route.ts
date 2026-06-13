import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return NextResponse.json({ error: 'Missing model ID' }, { status: 400 })
    }

    const modelId = parseInt(idParam, 10)
    if (isNaN(modelId)) {
      return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 })
    }

    // Verify model exists
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: {
        id: true,
        car: true,
        driver: true,
        year: true,
        team: true,
        brand: true,
      },
    })

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Fetch chronologically ordered price history
    const history = await prisma.priceHistory.findMany({
      where: { modelId },
      orderBy: { scrapedAt: 'asc' },
      select: {
        id: true,
        price: true,
        scrapedAt: true,
      },
    })

    return NextResponse.json({ model, history })
  } catch (error) {
    console.error('[API/models/price-history] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
