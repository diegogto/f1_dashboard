'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, AlertTriangle, KeyRound } from 'lucide-react'
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

  // Poll status from API
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          if (data.status === 'running') {
            setIsSyncing(true)
            setStatus('running')
            setMessage('Sincronización en curso...')
          } else {
            setIsSyncing(false)
            if (status === 'running' && data.status === 'success') {
              // Reload page data to show new records/prices!
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

  // Poll every 5 seconds if running
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'running') {
      interval = setInterval(() => {
        checkStatus()
      }, 5000)
    }
    return () => clearInterval(interval)
  }, [status, checkStatus])

  const handleSyncClick = () => {
    if (isSyncing) return
    setPassword('')
    setDialogError('')
    setIsDialogOpen(true)
  }

  const handleStartSync = async (e: React.FormEvent) => {
    e.preventDefault()
    setDialogError('')

    if (password !== 'dmpa8302') {
      setDialogError('Contraseña incorrecta.')
      return
    }

    setIsDialogOpen(false)
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
        // Polling will handle the rest
      } else {
        setIsSyncing(false)
        setStatus('cooldown')
        setMessage(data.error || 'Error al iniciar sincronización')
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 5000)
      }
    } catch (err) {
      setIsSyncing(false)
      setStatus('error')
      setMessage('Error de conexión con el servidor')
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
          disabled={isSyncing || status === 'cooldown'}
          onClick={handleSyncClick}
          className={cn(
            "h-8 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold shrink-0 gap-1.5",
            isSyncing && "border-blue-500/30 bg-blue-950/20 text-blue-400"
          )}
        >
          <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin text-blue-400")} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </Button>
      </div>

      {/* Password Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-200 sm:max-w-md">
          <form onSubmit={handleStartSync}>
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2 text-slate-100">
                <KeyRound className="h-5 w-5 text-red-500" />
                Sincronización Manual
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Se requiere la contraseña de administrador para forzar la lectura del sitio de origen. El proceso puede demorar hasta 2 minutos.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <Label htmlFor="sync-password" className="text-xs text-slate-400">
                Contraseña
              </Label>
              <Input
                id="sync-password"
                type="password"
                placeholder="Ingresa la contraseña..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-white/10 text-slate-200 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
              {dialogError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {dialogError}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="text-slate-400 hover:text-slate-100 hover:bg-white/5 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
