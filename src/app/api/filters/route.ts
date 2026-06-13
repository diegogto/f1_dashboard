import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const [years, drivers, teams, brands] = await Promise.all([
      prisma.model.findMany({
        where: { isBlacklisted: false, year: { not: null } },
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'asc' },
      }),
      prisma.model.findMany({
        where: { isBlacklisted: false, driver: { not: null } },
        select: { driver: true },
        distinct: ['driver'],
        orderBy: { driver: 'asc' },
      }),
      prisma.model.findMany({
        where: { isBlacklisted: false, team: { not: null } },
        select: { team: true },
        distinct: ['team'],
        orderBy: { team: 'asc' },
      }),
      prisma.model.findMany({
        where: { isBlacklisted: false, brand: { not: null } },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      }),
    ])

    return NextResponse.json({
      years: years.map((m) => m.year).filter(Boolean),
      drivers: drivers.map((m) => m.driver).filter(Boolean),
      teams: teams.map((m) => m.team).filter(Boolean),
      brands: brands.map((m) => m.brand).filter(Boolean),
    })
  } catch (error) {
    console.error('[API/filters] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
