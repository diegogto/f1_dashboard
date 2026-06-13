import cron from 'node-cron'
import { exec } from 'child_process'
import path from 'path'

let initialized = false

export function initCron() {
  if (initialized) return
  initialized = true

  // Run every day at 03:00 AM Europe/Berlin
  // (CK-ModelCars is a German store — syncing to their timezone makes sense)
  cron.schedule(
    '0 3 * * *',
    () => {
      const scraperPath = path.join(process.cwd(), 'scraper', 'scraper.py')
      console.log('[CRON] Starting nightly F1 scraper at', new Date().toISOString())

      exec(`python3 "${scraperPath}"`, { timeout: 10 * 60 * 1000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('[CRON] Scraper failed:', stderr.slice(0, 1000))
        } else {
          console.log('[CRON] Scraper completed successfully')
          console.log('[CRON] Output:', stdout.slice(-1000))
        }
      })
    },
    { timezone: 'Europe/Berlin' }
  )

  console.log('[CRON] Nightly scraper scheduled — 03:00 AM Europe/Berlin')
}
