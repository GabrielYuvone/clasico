'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { nf } from '@/lib/format'

export type ClubLite = {
  slug: string
  nombre: string
  apodo: string
  color: string
  color2?: string
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  clubs: ClubLite[]
  preselectSlug?: string | null
  libres: number
  onBought: () => void
}

const PICKS = [1, 5, 10, 50, 100, 500, 1000]

export default function BuyForm({ open, onOpenChange, clubs, preselectSlug, libres, onBought }: Props) {
  const [slug, setSlug] = useState<string>(preselectSlug || '')
  const [cantidad, setCantidad] = useState<number>(10)
  const [custom, setCustom] = useState<string>('')
  const [nombre, setNombre] = useState<string>('')
  const [mensaje, setMensaje] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      setSlug(preselectSlug || '')
      setCantidad(10)
      setCustom('')
      setNombre('')
      setMensaje('')
    }
  }, [open, preselectSlug])

  const selectedClub = useMemo(() => clubs.find((c) => c.slug === slug) || null, [clubs, slug])

  const qty = custom ? Math.max(1, Math.min(2000, Math.floor(Number(custom) || 0))) : cantidad

  async function submit() {
    if (!slug) {
      toast.error('Elegí un club primero.')
      return
    }
    if (!qty || qty < 1) {
      toast.error('Poné una cantidad válida (1 a 2.000).')
      return
    }
    if (qty > libres) {
      toast.error(`Solo quedan ${nf(libres)} lugares.`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, cantidad: qty, nombre: nombre || undefined, mensaje: mensaje || undefined }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error || 'No se pudo agregar.')
        return
      }
      toast.success(`¡Listo! ${nf(qty)} ${qty === 1 ? 'hincha' : 'hinchas'} para ${data.club}.`)
      onBought()
      onOpenChange(false)
    } catch (e) {
      toast.error('Error de red. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.55)] rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono font-bold uppercase tracking-wide">
            Metelos a la cancha
          </DialogTitle>
          <DialogDescription className="font-mono text-xs uppercase">
            En modo prueba es gratis y sin registro. Sumá hinchas y pintá la tribuna de tu color.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 font-mono">
          {/* Club picker */}
          {!selectedClub ? (
            <div>
              <Label className="text-xs uppercase mb-2 block">¿Para qué club son?</Label>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 border-4 border-black bg-[var(--panel2,#fffdf2)] font-mono font-bold text-sm"
              >
                <option value="">Elegí un club…</option>
                {clubs.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre} — {c.apodo}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-4 border-black bg-[var(--panel2,#fffdf2)] p-2">
              <div
                className="w-12 h-12 border-2 border-black flex items-center justify-center font-mono font-bold text-lg text-white"
                style={{ background: selectedClub.color }}
              >
                {selectedClub.nombre.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold uppercase text-sm leading-tight">{selectedClub.nombre}</div>
                <div className="text-[10px] text-gray-600">{selectedClub.apodo}</div>
              </div>
              <button
                type="button"
                onClick={() => setSlug('')}
                className="text-[10px] underline text-green-700 uppercase font-mono font-bold"
              >
                cambiar
              </button>
            </div>
          )}

          {/* Cantidad */}
          <div>
            <Label className="text-xs uppercase mb-2 block">¿Cuántos hinchas metés?</Label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {PICKS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setCantidad(p); setCustom('') }}
                  className={
                    'border-4 border-black px-2 py-2 font-mono font-bold text-sm transition-colors ' +
                    (qty === p && !custom ? 'bg-red-600 text-white' : 'bg-[var(--panel2,#fffdf2)] hover:bg-yellow-300')
                  }
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Label className="text-[10px] uppercase text-gray-600">Otra cantidad (1 a 2.000)</Label>
              <Input
                type="number"
                min={1}
                max={2000}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Personalizada…"
                className="mt-1 border-4 border-black rounded-none font-mono font-bold"
              />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <Label className="text-xs uppercase mb-2 block">
              Dejá tu nombre <span className="text-gray-500 normal-case">— opcional</span>
            </Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={40}
              placeholder="Anónimo"
              className="border-4 border-black rounded-none font-mono font-bold"
            />
          </div>

          {/* Mensaje */}
          <div>
            <Label className="text-xs uppercase mb-2 block">
              Bardeá, alentá, dejá tu mensaje <span className="text-gray-500 normal-case">— opcional</span>
            </Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              maxLength={140}
              placeholder="Aguante el más grande"
              className="border-4 border-black rounded-none font-mono font-bold resize-none h-16"
            />
            <div className="text-[10px] text-gray-500 text-right">{mensaje.length} / 140</div>
          </div>

          {/* Total (gratis en prueba) */}
          <div className="flex items-center justify-between bg-yellow-300 border-4 border-black px-3 py-2">
            <span className="font-mono font-bold uppercase text-xs">Total</span>
            <span className="font-mono font-bold text-2xl text-red-700">
              $0
              <span className="text-[10px] uppercase ml-2 text-black font-mono">modo prueba</span>
            </span>
          </div>

          <Button
            onClick={submit}
            disabled={submitting || !slug}
            className="w-full border-4 border-black bg-green-700 hover:bg-green-800 text-white font-mono font-bold uppercase tracking-wide rounded-none shadow-[4px_4px_0_rgba(0,0,0,0.55)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sumando…' : 'Meter hinchas'}
          </Button>

          <p className="text-[10px] text-gray-600 leading-relaxed text-center">
            Quedan <b className="text-red-700">{nf(libres)}</b> lugares libres. Cuando se llena la cancha, se acaba.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
