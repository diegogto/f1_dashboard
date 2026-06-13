import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { modelId, action, value } = body

    if (!modelId || !action || value === undefined) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos.' }, { status: 400 })
    }

    const mId = Number(modelId)
    if (isNaN(mId)) {
      return NextResponse.json({ error: 'ID de modelo inválido.' }, { status: 400 })
    }

    if (action === 'wishlist') {
      const updated = await prisma.model.update({
        where: { id: mId },
        data: { isWishlisted: Boolean(value) },
      })
      return NextResponse.json({ success: true, model: updated })
    }

    if (action === 'blacklist') {
      const updated = await prisma.model.update({
        where: { id: mId },
        data: { isBlacklisted: Boolean(value) },
      })
      return NextResponse.json({ success: true, model: updated })
    }

    return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
  } catch (error: any) {
    console.error('[TOGGLE API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
