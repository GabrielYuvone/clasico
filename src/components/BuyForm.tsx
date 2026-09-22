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

type Config = {
  precio: number
  aliasMP?: string
  permiteAmigo: boolean
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  clubs: ClubLite[]
  preselectSlug?: string | null
  libres: number
  config?: Config | null
  onBought: () => void
}

const PICKS = [1, 5, 10, 50, 100, 500, 1000]

export default function BuyForm({ open, onOpenChange, clubs, preselectSlug, libres, config, onBought }: Props) {
  const [slug, setSlug] = useState<string>(preselectSlug || 'lepra')
  const [cantidad, setCantidad] = useState<number>(10)
  const [custom, setCustom] = useState<string>('')
  const [nombre, setNombre] = useState<string>('')
  const [mensaje, setMensaje] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      setSlug(preselectSlug || 'lepra')
      setCantidad(10)
      setCustom('')
      setNombre('')
      setMensaje('')
    }
  }, [open, preselectSlug])

  const selectedClub = useMemo(() => clubs.find((c) => c.slug === slug) || null, [clubs, slug])

  const qty = custom ? Math.max(1, Math.min(2000, Math.floor(Number(custom) || 0))) : cantidad
  const precio = config?.precio ?? 0
  const total = precio * qty

  async function postBuyAmigo() {
    if (!slug) { toast.error('Elegí un club primero.'); return }
    if (!qty || qty < 1) { toast.error('Poné una cantidad válida (1 a 2.000).'); return }
    if (qty > libres) { toast.error(`Solo quedan ${nf(libres)} lugares.`); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, cantidad: qty, nombre: nombre || undefined, mensaje: mensaje || undefined, amigo: true }),
      })
      const data = await res.json()
      if (!data.ok) { toast.error(data.error || 'No se pudo agregar.'); return }
      toast.success(`¡Listo! ${nf(qty)} ${qty === 1 ? 'hincha' : 'hinchas'} para ${data.club}.`)
      onBought()
      onOpenChange(false)
    } catch (e) {
      toast.error('Error de red. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function pagarConMP() {
    if (!slug) { toast.error('Elegí un club primero.'); return }
    if (!qty || qty < 1) { toast.error('Poné una cantidad válida.'); return }
    if (qty > libres) { toast.error(`Solo quedan ${nf(libres)} lugares.`); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/mp/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, cantidad: qty, nombre: nombre || undefined, mensaje: mensaje || undefined }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error || 'No se pudo crear el link de pago.')
        return
      }
      const link = data.initPoint || data.sandboxInitPoint
      if (!link) {
        toast.error('Mercado Pago no devolvió un link de pago.')
        return
      }
      window.open(link, '_blank', 'noopener,noreferrer')
      toast(
        `Se abrió Mercado Pago. Pagá $${nf(total)} y listo — cuando MP confirme el pago, los hinchas van a aparecer solos en la cancha.`,
        { duration: 9000 }
      )
      onBought()
      onOpenChange(false)
    } catch (e) {
      toast.error('Error de red. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLepra = slug === 'lepra'
  const clubColor = isLepra ? '#C8102E' : '#0033A0'
  const clubApodo = isLepra ? 'La Lepra' : 'El Canalla'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#161618] border border-white/15 text-white rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight">
            Sumar hinchas al clásico
          </DialogTitle>
          <DialogDescription className="text-white/60 text-xs uppercase tracking-widest">
            Elegí tu bando, meté hinchas y pintá la tribuna. Pagá con Mercado Pago o, si sos amigo, saltá el pago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Selector de bando — 2 botones grandes */}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
              ¿Para qué bando son?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSlug('lepra')}
                className={
                  'p-3 rounded-xl text-white font-black uppercase tracking-wider transition-all ' +
                  (isLepra ? 'ring-2 ring-white scale-[1.02]' : 'opacity-70 hover:opacity-100')
                }
                style={{ background: 'linear-gradient(135deg, #C8102E 0%, #6a0a1a 100%)' }}
              >
                <div className="text-[10px] uppercase tracking-widest text-white/70">Sumar a</div>
                <div className="text-lg">La Lepra</div>
              </button>
              <button
                type="button"
                onClick={() => setSlug('canalla')}
                className={
                  'p-3 rounded-xl text-white font-black uppercase tracking-wider transition-all ' +
                  (!isLepra ? 'ring-2 ring-white scale-[1.02]' : 'opacity-70 hover:opacity-100')
                }
                style={{ background: 'linear-gradient(135deg, #0033A0 0%, #001a50 100%)' }}
              >
                <div className="text-[10px] uppercase tracking-widest text-white/70">Sumar a</div>
                <div className="text-lg">El Canalla</div>
              </button>
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
              ¿Cuántos hinchas metés?
            </Label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {PICKS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setCantidad(p); setCustom('') }}
                  className={
                    'p-2 rounded-lg text-sm font-black transition-all ' +
                    (qty === p && !custom
                      ? 'text-white ring-2 ring-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10')
                  }
                  style={qty === p && !custom ? { background: clubColor } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Label className="text-[10px] uppercase tracking-widest text-white/40">
                Otra cantidad (1 a 2.000)
              </Label>
              <Input
                type="number"
                min={1}
                max={2000}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Personalizada…"
                className="mt-1 bg-white/5 border-white/10 text-white rounded-lg font-bold placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
              Tu nombre <span className="text-white/30 normal-case">— opcional</span>
            </Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={40}
              placeholder="Anónimo"
              className="bg-white/5 border-white/10 text-white rounded-lg font-bold placeholder:text-white/30"
            />
          </div>

          {/* Mensaje */}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
              Bardeá, alentá, dejá tu mensaje <span className="text-white/30 normal-case">— opcional</span>
            </Label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              maxLength={140}
              placeholder="Aguante el más grande"
              className="bg-white/5 border-white/10 text-white rounded-lg font-bold resize-none h-16 placeholder:text-white/30"
            />
            <div className="text-[10px] text-white/30 text-right">{mensaje.length} / 140</div>
          </div>

          {/* Total */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,209,0,0.1)', border: '1px solid rgba(255,209,0,0.3)' }}
          >
            <span className="text-xs uppercase tracking-widest text-white/70">
              Total · {nf(qty)} {qty === 1 ? 'hincha' : 'hinchas'} para {clubApodo} × ${precio}
            </span>
            <span className="text-2xl font-black text-yellow-400">${nf(total)}</span>
          </div>

          {/* Pagar con MP */}
          <div className="space-y-2">
            <Button
              onClick={pagarConMP}
              disabled={submitting}
              className="w-full rounded-xl py-3 text-white font-black uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00b1ea 0%, #0096c7 100%)' }}
            >
              {submitting ? 'Generando link…' : `Pagar $${nf(total)} con Mercado Pago`}
            </Button>
            <div className="text-[10px] text-center text-white/50 bg-white/5 border border-white/10 rounded-lg p-2">
              <b className="text-white/80">Automático:</b> cuando MP confirma el pago, los hinchas pintan la cancha solos.
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">o</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Soy amigo */}
          <Button
            onClick={postBuyAmigo}
            disabled={submitting}
            className="w-full rounded-xl py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-50"
          >
            🤝 Soy amigo · meter sin pagar
          </Button>

          <p className="text-[10px] text-white/40 text-center">
            Quedan <b className="text-yellow-400">{nf(libres)}</b> lugares libres. Cuando se llena la cancha, se acaba.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
