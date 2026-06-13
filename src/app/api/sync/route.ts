import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lastRun = await prisma.scraperRun.findFirst({
      orderBy: { startedAt: 'desc' },
    })

    if (lastRun && lastRun.status === 'running') {
      // If it is currently running, read the live log file
      let liveLog = ''
      try {
        const logPath = path.join(process.cwd(), 'scraper', 'live.log')
        if (fs.existsSync(logPath)) {
          liveLog = fs.readFileSync(logPath, 'utf8')
        }
      } catch (err) {
        console.error('[SYNC API GET] Error reading live log file:', err)
      }
      return NextResponse.json({
        ...lastRun,
        log: liveLog || 'Iniciando proceso y cargando logs...',
      })
    }

    return NextResponse.json(lastRun)
  } catch (error: any) {
    console.error('[SYNC API GET] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { password } = body

    // 1. Check password
    if (password !== 'dmpa8302') {
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }

    // 2. Check if a scraper run is already in progress
    const activeRun = await prisma.scraperRun.findFirst({
      where: { status: 'running' },
    })

    if (activeRun) {
      // If it has been running for more than 15 minutes, mark it as error/timed out
      const diffMs = Date.now() - activeRun.startedAt.getTime()
      if (diffMs > 15 * 60 * 1000) {
        await prisma.scraperRun.update({
          where: { id: activeRun.id },
          data: {
            status: 'error',
            finishedAt: new Date(),
            log: 'Timeout: Marcado como error por inactividad de 15 minutos.',
          },
        })
      } else {
        return NextResponse.json(
          { error: 'Ya hay una sincronización en curso.', status: 'running' },
          { status: 409 }
        )
      }
    }

    // 3. Cooldown check: prevent running more than once every 5 minutes (300 seconds)
    const lastSuccess = await prisma.scraperRun.findFirst({
      where: { status: 'success' },
      orderBy: { finishedAt: 'desc' },
    })

    if (lastSuccess && lastSuccess.finishedAt) {
      const diffMs = Date.now() - lastSuccess.finishedAt.getTime()
      const cooldownMs = 5 * 60 * 1000
      if (diffMs < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - diffMs) / 1000)
        return NextResponse.json(
          { error: `Espera ${secondsLeft} segundos antes de sincronizar de nuevo.` },
          { status: 429 }
        )
      }
    }

    // 4. Clear/Prepare live log file
    const logDir = path.join(process.cwd(), 'scraper')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logPath = path.join(logDir, 'live.log')
    fs.writeFileSync(logPath, '🚀 Iniciando el scraper de F1...\n')

    // 5. Run the scraper script in background with spawn (unbuffered -u)
    const scraperPath = path.join(process.cwd(), 'scraper', 'scraper.py')
    console.log('[SYNC API] Spawning scraper in background:', scraperPath)

    const child = spawn('python3', ['-u', scraperPath], {
      env: { ...process.env },
    })

    const logStream = fs.createWriteStream(logPath, { flags: 'a' })
    child.stdout.pipe(logStream)
    child.stderr.pipe(logStream)

    child.on('close', (code) => {
      console.log(`[SYNC API BACKGROUND] Scraper process exited with code ${code}`)
      logStream.end()
    })

    return NextResponse.json({
      success: true,
      message: 'Sincronización iniciada en segundo plano...',
    })
  } catch (error: any) {
    console.error('[SYNC API POST] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
