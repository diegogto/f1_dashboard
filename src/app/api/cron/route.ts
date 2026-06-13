import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'

export async function POST(request: Request) {
  // Validate secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scraperPath = path.join(process.cwd(), 'scraper', 'scraper.py')

  return new Promise<NextResponse>((resolve) => {
    const start = Date.now()
    exec(`python3 "${scraperPath}"`, { timeout: 10 * 60 * 1000 }, (err, stdout, stderr) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1)
      if (err) {
        console.error('[CRON] Scraper error:', stderr)
        resolve(
          NextResponse.json({
            success: false,
            error: stderr.slice(0, 500),
            duration: `${duration}s`,
          }, { status: 500 })
        )
      } else {
        console.log('[CRON] Scraper finished in', duration + 's')
        resolve(
          NextResponse.json({
            success: true,
            output: stdout.slice(-2000), // last 2000 chars
            duration: `${duration}s`,
          })
        )
      }
    })
  })
}
