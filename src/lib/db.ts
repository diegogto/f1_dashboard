import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // During build time, return a dummy client that will fail gracefully
    // The actual connection happens at runtime
    throw new Error('DATABASE_URL is not set')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma: PrismaClient = (() => {
  if (globalForPrisma.prisma) return globalForPrisma.prisma
  try {
    const client = createPrismaClient()
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
    return client
  } catch {
    // Return a proxy that fails on first use (allows build-time import)
    return new Proxy({} as PrismaClient, {
      get: (_, prop) => {
        if (typeof prop === 'string' && prop.startsWith('$')) return () => Promise.resolve(null)
        return () => { throw new Error('Database not available: DATABASE_URL is not set') }
      },
    })
  }
})()
