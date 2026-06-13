'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, AlertTriangle, KeyRound, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SyncControlProps {
  initialLastRun: string | null
}

export function SyncControl({ initialLastRun }: SyncControlProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'cooldown'>('idle')
  const [lastRunDate, setLastRunDate] = useState<string | null>(initialLastRun)
  const [message, setMessage] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [dialogError, setDialogError] = useState('')
  const [log, setLog] = useState<string>('')

  const logConsoleRef = useRef<HTMLDivElement>(null)

  // Scroll terminal to bottom when new logs arrive
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight
    }
  }, [log])

  // Poll status from API
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setLog(data.log || '')
          if (data.status === 'running') {
            setIsSyncing(true)
            setStatus('running')
            setMessage('Sincronización en curso...')
          } else {
            setIsSyncing(false)
            if (status === 'running' && data.status === 'success') {
              setStatus('success')
              setMessage('¡Sincronización exitosa!')
              setTimeout(() => {
                window.location.reload()
              }, 1500)
            } else if (data.status === 'success') {
              setStatus('idle')
              setMessage('')
            } else if (data.status === 'error') {
              setStatus('error')
              setMessage('La última sincronización falló.')
            }
          }
          if (data.finishedAt) {
            setLastRunDate(data.finishedAt)
          } else if (data.startedAt) {
            setLastRunDate(data.startedAt)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sync status:', err)
    }
  }, [status])

  // Initial check
  useEffect(() => {
    checkStatus()
  }, [])

  // Poll logs/status: poll faster (every 2.5s) if currently running
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'running' || isDialogOpen) {
      interval = setInterval(() => {
        checkStatus()
      }, 2500)
    }
    return () => clearInterval(interval)
  }, [status, isDialogOpen, checkStatus])

  const handleSyncClick = () => {
    setPassword('')
    setDialogError('')
    setIsDialogOpen(true)
    // Fetch logs immediately when opening modal
    checkStatus()
  }

  const handleStartSync = async (e: React.FormEvent) => {
    e.preventDefault()
    setDialogError('')

    if (password !== 'dmpa8302') {
      setDialogError('Contraseña incorrecta.')
      return
    }

    setIsSyncing(true)
    setStatus('running')
    setMessage('Iniciando sincronización...')

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setMessage('Sincronización iniciada en segundo plano...')
        // Polling checkStatus will take care of reading live.log
      } else {
        setIsSyncing(false)
        setStatus('cooldown')
        setMessage(data.error || 'Error al iniciar sincronización')
        setDialogError(data.error || 'Error al iniciar sincronización')
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 5000)
      }
    } catch (err) {
      setIsSyncing(false)
      setStatus('error')
      setMessage('Error de conexión con el servidor')
      setDialogError('Error de conexión con el servidor')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 5000)
    }
  }

  const formattedDate = lastRunDate
    ? new Date(lastRunDate).toLocaleDateString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Nunca'

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs">
        <div className="flex flex-col items-start sm:items-end">
          <div className="flex items-center gap-1.5 text-slate-400">
            <RefreshCw className="h-3 w-3" />
            <span>Última actualización: <span className="text-slate-200 font-medium">{formattedDate}</span></span>
          </div>
          {message && (
            <span className={cn(
              "text-[10px] mt-0.5 font-medium animate-pulse",
              status === 'running' && "text-blue-400",
              status === 'success' && "text-emerald-400 animate-none",
              status === 'error' && "text-red-400 animate-none",
              status === 'cooldown' && "text-amber-400 animate-none"
            )}>
              {message}
            </span>
          )}
        </div>
        <div className="h-3 w-px bg-white/10 hidden sm:block" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncClick}
          className={cn(
            "h-8 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold shrink-0 gap-1.5",
            isSyncing && "border-blue-500/30 bg-blue-950/20 text-blue-400"
          )}
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin text-blue-400")} />
          Sincronizar
        </Button>
      </div>

      {/* Sync Logs and Control Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Terminal className="h-5 w-5 text-red-500" />
              Consola de Sincronización
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Muestra el estado del scraper y las actualizaciones de precios de ck-modelcars.de.
            </DialogDescription>
          </DialogHeader>

          {/* Terminal Console View */}
          <div className="flex-1 min-h-[260px] flex flex-col gap-2 my-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-t-lg border-t border-x border-white/5">
              <span>ESTADO: {status.toUpperCase()}</span>
              <span>ACTUALIZADO: {formattedDate}</span>
            </div>
            <div
              ref={logConsoleRef}
              className="flex-1 bg-slate-950 font-mono text-[11px] leading-relaxed p-3 rounded-b-lg border-b border-x border-white/5 h-64 overflow-y-auto text-slate-300 select-text"
            >
              {log ? (
                log.split('\n').map((line, idx) => (
                  <div key={idx} className={cn(
                    "min-h-[16px]",
                    line.includes('Down:') && "text-emerald-400",
                    line.includes('Up:') && "text-red-400",
                    line.includes('New:') && "text-amber-400",
                    line.includes('Failed') && "text-red-500 font-bold",
                    line.includes('Done') && "text-blue-400 font-semibold"
                  )}>
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic">No hay logs de ejecuciones disponibles.</div>
              )}
            </div>
          </div>

          {/* Dialog Action Footer */}
          <form onSubmit={handleStartSync} className="mt-2">
            {isSyncing ? (
              <div className="bg-slate-950/40 border border-blue-500/10 rounded-lg p-3 flex items-center justify-center gap-3">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-xs text-blue-300 font-medium">Ejecutando scraper... Esto tomará aprox. 2 minutos.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-end gap-3 bg-slate-950/20 p-3 rounded-lg border border-white/5">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="sync-password" className="text-xs text-slate-400">
                      Contraseña de Administrador
                    </Label>
                    <Input
                      id="sync-password"
                      type="password"
                      placeholder="Ingresa contraseña para iniciar..."
                      value={password}
                      disabled={status === 'cooldown'}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-8 bg-slate-950 border-white/10 text-slate-200 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={status === 'cooldown'}
                    className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
                  >
                    Sincronizar ahora
                  </Button>
                </div>
                {dialogError && (
                  <p className="text-xs text-red-400 flex items-center gap-1 font-medium px-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {dialogError}
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-white/5 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-slate-400 hover:text-slate-100 hover:bg-white/5 text-xs h-8"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
