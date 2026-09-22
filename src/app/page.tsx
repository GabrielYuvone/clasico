'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Stadium from '@/components/Stadium'
import BuyForm, { type ClubLite } from '@/components/BuyForm'
import type { ClubView } from '@/lib/stadium/estadio'
import { nf, pf, hinchas, timeAgo } from '@/lib/format'

type Club = {
  slug: string
  nombre: string
  apodo: string
  liga: string
  ciudad: string
  provincia: string
  color: string
  color2?: string
  hinchas: number
}

type FeedItem = {
  id: string
  nombre: string
  mensaje?: string | null
  cantidad: number
  club: string
  slug: string
  color: string
  color2?: string
  fecha: string
}

type Config = {
  precio: number
  aliasMP?: string
  capacidad: number
  maxPorCompra: number
  ocupadas: number
  libres: number
  cobraDeVerdad: boolean
  permiteAmigo: boolean
  pendientes: number
  mpReady?: boolean
}

export default function Home() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
  const [preselectSlug, setPreselectSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [c, f, cfg] = await Promise.all([
        fetch('/api/clubs').then((r) => r.json()),
        fetch('/api/feed').then((r) => r.json()),
        fetch('/api/config').then((r) => r.json()).catch(() => null),
      ])
      setClubs(c)
      setFeed(f)
      if (cfg) setConfig(cfg)
    } catch (e) {
      // error recuperable: mantenemos datos previos
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 4000)
    return () => clearInterval(t)
  }, [fetchData])

  const capacidad = config?.capacidad ?? 100000
  const lepra = useMemo(() => clubs.find((c) => c.slug === 'lepra') || null, [clubs])
  const canalla = useMemo(() => clubs.find((c) => c.slug === 'canalla') || null, [clubs])

  const lepraCount = lepra?.hinchas ?? 0
  const canallaCount = canalla?.hinchas ?? 0
  const total = lepraCount + canallaCount
  const libres = Math.max(0, capacidad - total)
  const pctLlena = total > 0 ? (total / capacidad) * 100 : 0

  // Porcentajes relativos entre los dos (para la barra de batalla):
  // si ambos tienen 0, va 50/50.
  const pctLepra = total > 0 ? (lepraCount / total) * 100 : 50
  const pctCanalla = total > 0 ? (canallaCount / total) * 100 : 50
  const ventaja = Math.abs(lepraCount - canallaCount)
  const lider = lepraCount === canallaCount ? null : lepraCount > canallaCount ? 'lepra' : 'canalla'

  const stadiumClubs: ClubView[] = useMemo(
    () => clubs.map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      apodo: c.apodo,
      color: c.color,
      color2: c.color2,
      count: c.hinchas,
    })),
    [clubs]
  )

  const onSelectClub = useCallback((c: ClubView) => {
    setPreselectSlug(c.slug)
    setBuyOpen(true)
  }, [])

  const onBought = useCallback(() => {
    fetchData()
  }, [fetchData])

  function abrirModal(slug: string) {
    setPreselectSlug(slug)
    setBuyOpen(true)
  }

  // ----- render -----
  return (
    <div
      className="min-h-screen flex flex-col text-white relative"
      style={{
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        fontWeight: 500,
      }}
    >
      {/* Fondo: imagen generada mitad Lepra / mitad Canalla */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/bg-clasico.png)',
          // En mobile (retrato) la imagen se ve "acostada" (1344x768), así que
          // la estiramos un poco para que cubra bien. En desktop la cubre tal
          // cual con bg-cover.
        }}
        aria-hidden="true"
      />
      {/* Overlay oscuro para que el contenido se lea encima del fondo */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,8,10,0.85) 0%, rgba(8,8,10,0.75) 50%, rgba(8,8,10,0.85) 100%)',
        }}
        aria-hidden="true"
      />
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6">
        {/* ---------- Cabezal cruzado ---------- */}
        <header className="grid grid-cols-2 mb-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Lado Lepra */}
          <button
            onClick={() => abrirModal('lepra')}
            className="relative p-3 sm:p-7 text-left transition-all hover:brightness-110 group"
            style={{ background: 'linear-gradient(135deg, #C8102E 0%, #6a0a1a 100%)' }}
          >
            <div className="flex items-center gap-2 sm:gap-4">
              <BanderaIcon colors={['#C8102E', '#111111']} />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div
                  className="text-base sm:text-4xl font-black uppercase tracking-tight leading-none"
                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }}
                >
                  LA LEPRA
                </div>
                <div className="text-[9px] sm:text-xs uppercase tracking-widest text-white/70 mt-1 hidden sm:block">
                  Newell&apos;s Old Boys
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-4 flex items-baseline gap-2">
              <span
                className="text-2xl sm:text-5xl font-black tabular-nums"
                style={{ fontWeight: 900 }}
              >
                {nf(lepraCount)}
              </span>
              <span className="text-[10px] sm:text-sm uppercase tracking-wider text-white/70">
                hinchas · {total > 0 ? pf(Math.round(pctLepra * 100) / 100) : '—'}
              </span>
            </div>
          </button>

          {/* Lado Canalla */}
          <button
            onClick={() => abrirModal('canalla')}
            className="relative p-3 sm:p-7 text-right transition-all hover:brightness-110 group"
            style={{ background: 'linear-gradient(135deg, #0033A0 0%, #001a50 100%)' }}
          >
            <div className="flex items-center gap-2 sm:gap-4 justify-end">
              <div className="flex-1 min-w-0 overflow-hidden">
                <div
                  className="text-base sm:text-4xl font-black uppercase tracking-tight leading-none"
                  style={{ fontWeight: 900 }}
                >
                  EL CANALLA
                </div>
                <div className="text-[9px] sm:text-xs uppercase tracking-widest text-white/70 mt-1 hidden sm:block">
                  Rosario Central
                </div>
              </div>
              <BanderaIcon colors={['#0033A0', '#FFD100']} />
            </div>
            <div className="mt-2 sm:mt-4 flex items-baseline gap-2 justify-end">
              <span className="text-[10px] sm:text-sm uppercase tracking-wider text-white/70">
                {total > 0 ? pf(Math.round(pctCanalla * 100) / 100) : '—'} · hinchas
              </span>
              <span
                className="text-2xl sm:text-5xl font-black tabular-nums"
                style={{ fontWeight: 900 }}
              >
                {nf(canallaCount)}
              </span>
            </div>
          </button>
        </header>

        {/* ---------- Barra de batalla (tira de guerra) ---------- */}
        <div className="mb-6">
          <div className="flex justify-between text-[10px] sm:text-xs uppercase tracking-widest text-white/60 mb-1.5">
            <span>Lepra {total > 0 ? pf(Math.round(pctLepra * 100) / 100) : '50,00%'}</span>
            <span>
              {total === 0
                ? 'La cancha está vacía — el primero en entrar manda'
                : lider
                ? `Gana ${lider === 'lepra' ? 'La Lepra' : 'El Canalla'} por ${nf(ventaja)} hinchas`
                : 'Van empatados'}
            </span>
            <span>{total > 0 ? pf(Math.round(pctCanalla * 100) / 100) : '50,00%'} El Canalla</span>
          </div>
          <div className="h-6 rounded-full overflow-hidden flex border border-white/10">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${pctLepra}%`,
                background: 'linear-gradient(90deg, #6a0a1a 0%, #C8102E 100%)',
              }}
            />
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${pctCanalla}%`,
                background: 'linear-gradient(90deg, #0033A0 0%, #FFD100 200%)',
              }}
            />
          </div>
          {/* Aforo */}
          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-white/60 uppercase tracking-wider">
              {nf(total)} / {nf(capacidad)} butacas pintadas
            </span>
            <span className="text-white/60 uppercase tracking-wider">
              {pf(Math.round(pctLlena * 100) / 100)} llena · faltan {nf(libres)}
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-blue-600 transition-all duration-700"
              style={{ width: `${Math.max(pctLlena, total > 0 ? 0.5 : 0)}%` }}
            />
          </div>
        </div>

        {/* ---------- Estadio ---------- */}
        <main className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-3xl">
            <Stadium clubs={stadiumClubs} capacity={capacidad} onSelectClub={onSelectClub} />
          </div>
          <div className="text-[10px] sm:text-xs text-white/40 text-center mt-2 uppercase tracking-widest">
            vista aérea del clásico · medio y medio · los colores se actualizan en vivo
          </div>

          {/* Botones de acción rápida */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mt-6">
            <button
              onClick={() => abrirModal('lepra')}
              className="p-4 sm:p-5 rounded-2xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              style={{ background: 'linear-gradient(135deg, #C8102E 0%, #6a0a1a 100%)' }}
            >
              <div className="text-xs sm:text-sm uppercase tracking-widest text-white/80">
                Sumar hinchas para
              </div>
              <div className="text-xl sm:text-2xl font-black uppercase mt-0.5" style={{ fontWeight: 900 }}>
                La Lepra
              </div>
            </button>
            <button
              onClick={() => abrirModal('canalla')}
              className="p-4 sm:p-5 rounded-2xl text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0033A0 0%, #001a50 100%)' }}
            >
              <div className="text-xs sm:text-sm uppercase tracking-widest text-white/80">
                Sumar hinchas para
              </div>
              <div className="text-xl sm:text-2xl font-black uppercase mt-0.5" style={{ fontWeight: 900 }}>
                El Canalla
              </div>
            </button>
          </div>
        </main>

        {/* ---------- Feed de actividad ---------- */}
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-3 px-1">
            Últimos en entrar a la cancha
          </h2>
          {feed.length === 0 ? (
            <div className="rounded-2xl border border-white/10 p-6 text-center text-white/40 text-sm">
              Todavía no entró nadie al estadio. <b className="text-white/70">¡Sé el primero!</b>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feed.slice(0, 8).map((f) => {
                const isLepra = f.slug === 'lepra'
                const color = isLepra ? '#C8102E' : '#0033A0'
                const apodo = isLepra ? 'La Lepra' : 'El Canalla'
                return (
                  <div
                    key={f.id}
                    className="rounded-xl p-3 flex gap-3 items-start"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderLeft: `4px solid ${color}`,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: color, fontWeight: 900 }}
                    >
                      {isLepra ? 'L' : 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold">
                        <span className="text-white/80">{f.nombre || 'Anónimo'}</span>{' '}
                        <span className="text-white/40">·</span>{' '}
                        <span className="text-white">+{f.cantidad}</span>{' '}
                        <span className="text-white/60">para {apodo}</span>
                      </div>
                      {f.mensaje && (
                        <div className="text-xs text-white/60 mt-0.5 italic">“{f.mensaje}”</div>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 whitespace-nowrap mt-1">
                      {timeAgo(f.fecha)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="mt-8 pt-6 border-t border-white/10 space-y-4">
          {/* Stats y estado */}
          <div className="flex justify-between items-center flex-wrap gap-3 text-[10px] sm:text-xs uppercase tracking-widest text-white/40">
            <span>
              La Tribuna del Clásico · estadio virtual · pagá con MP o «soy amigo»
            </span>
            <span className="flex items-center gap-2 flex-wrap">
              {config && config.pendientes > 0 && (
                <span className="border border-yellow-500/50 text-yellow-400 px-2 py-0.5 rounded">
                  {config.pendientes} pendiente{config.pendientes === 1 ? '' : 's'}
                </span>
              )}
              <span>
                {nf(total)} / {nf(capacidad)} · {pf(Math.round(pctLlena * 100) / 100)}
              </span>
            </span>
          </div>

          {/* Disclaimer de responsabilidad */}
          <div className="text-[10px] sm:text-xs text-white/40 leading-relaxed bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="mb-1">
              <b className="text-white/60">Aviso:</b> Este sitio es una iniciativa independiente, sin relación formal con
              {' '}<b className="text-white/60">Newell&apos;s Old Boys</b> ni <b className="text-white/60">Rosario Central</b>,
              {' '}ni con la venta oficial de entradas de los clubes. Los &quot;hinchas&quot; que se compran aquí son unidades
              virtuales dentro de un estadio simulado: <b className="text-white/60">no representan butacas reales</b>, no dan
              {' '}derecho a entrar a ningún estadio físico y no están asociados a ninguna entidad organizadora.
            </p>
            <p className="mb-1">
              <b className="text-white/60">Pagos:</b> Los pagos se procesan a través de Mercado Pago a su alias registrado.
              {' '}<b className="text-white/60">Las compras no tienen devolución</b>: al confirmar el pago, las unidades virtuales
              {' '}se pintan en el estadio y no se pueden revertir. Si pagaste por error o creés que hubo un problema, contactate
              {' '}con nosotros antes de iniciar un reclamo en Mercado Pago.
            </p>
            <p>
              Al usar este sitio y/o realizar un pago, aceptás este aviso en su totalidad.
            </p>
          </div>

          {/* Créditos a MOXEN (inspiración del sitio) */}
          <div className="text-[10px] sm:text-xs text-white/40 leading-relaxed">
            Inspirado en{' '}
            <a
              href="https://lapopular.online"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white underline"
            >
              lapopular.online
            </a>
            , proyecto original de{' '}
            <a
              href="https://x.com/Moxen14"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white underline"
            >
              MOXEN (@Moxen14 en X)
            </a>
            . Este es un homenaje al concepto, no una copia oficial ni está vinculado a su autor.
          </div>
        </footer>
      </div>

      {/* ---------- Modal de compra ---------- */}
      <BuyForm
        open={buyOpen}
        onOpenChange={setBuyOpen}
        clubs={clubs as unknown as ClubLite[]}
        preselectSlug={preselectSlug}
        libres={libres}
        config={config}
        onBought={onBought}
      />
    </div>
  )
}

// ---------- Sub-componentes ----------

// Bandera estilizada (escudo alternativo) con dos colores en franjas verticales.
function BanderaIcon({ colors }: { colors: [string, string] }) {
  const [c1, c2] = colors
  return (
    <div
      className="w-10 h-12 sm:w-12 sm:h-14 rounded-md overflow-hidden border-2 border-white/20 shadow-lg flex-shrink-0 relative"
      style={{ background: c1 }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1/3"
        style={{ background: c2 }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/3"
        style={{ background: c2 }}
      />
    </div>
  )
}
