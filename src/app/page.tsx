'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Stadium from '@/components/Stadium'
import BuyForm, { type ClubLite } from '@/components/BuyForm'
import type { ClubView } from '@/lib/stadium/estadio'
import { nf, pf, hinchas, timeAgo, colorLegible, isHex } from '@/lib/format'

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
}

// Ranking: por hinchas desc, desempate por nombre asc.
function ordenRanking(a: Club, b: Club) {
  if (b.hinchas !== a.hinchas) return b.hinchas - a.hinchas
  return a.nombre.localeCompare(b.nombre, 'es')
}

export default function Home() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
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
    // Polling cada 4s para actualización en vivo
    const t = setInterval(fetchData, 4000)
    return () => clearInterval(t)
  }, [fetchData])

  const capacidad = config?.capacidad ?? 100000
  const ocupadas = clubs.reduce((s, c) => s + (c.hinchas || 0), 0)
  const libres = Math.max(0, capacidad - ocupadas)
  const pct = Math.round((ocupadas / capacidad) * 10000) / 100

  const ranked = useMemo(() => clubs.slice().sort(ordenRanking), [clubs])
  const conHinchas = useMemo(() => ranked.filter((c) => c.hinchas > 0), [ranked])

  // Mapa para el detalle del club seleccionado
  const selected = useMemo(
    () => (selectedSlug ? ranked.find((c) => c.slug === selectedSlug) || null : null),
    [ranked, selectedSlug]
  )

  // El club inmediatamente arriba del seleccionado (para "necesita N para pasar a …")
  const arriba = useMemo(() => {
    if (!selected) return null
    return ranked.filter((o) => o.hinchas > selected.hinchas).pop() || null
  }, [ranked, selected])

  // ClubView[] para el renderer del estadio
  const stadiumClubs: ClubView[] = useMemo(
    () => ranked.map((c) => ({
      slug: c.slug,
      nombre: c.nombre,
      apodo: c.apodo,
      color: c.color,
      color2: c.color2,
      count: c.hinchas,
    })),
    [ranked]
  )

  const onSelectClub = useCallback((c: ClubView) => {
    setSelectedSlug(c.slug)
  }, [])

  const onBought = useCallback(() => {
    fetchData()
  }, [fetchData])

  // ----- render helpers -----
  function clubSwatch(c: { color: string; color2?: string }) {
    return (
      <span
        className="inline-block w-3.5 h-3.5 border-2 border-black flex-shrink-0"
        style={{ background: colorLegible(c) }}
      />
    )
  }

  const lider = conHinchas[0] || null

  return (
    <div
      className="min-h-screen flex flex-col text-black"
      style={{
        background: '#35603f',
        padding: '14px',
        fontFamily: "'Courier New', Courier, monospace",
        fontWeight: 700,
      }}
    >
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col">
        {/* ---------- Header ---------- */}
        <header className="flex items-stretch border-4 border-black bg-yellow-300 mb-3.5 shadow-[6px_6px_0_rgba(0,0,0,0.55)]">
          <div className="bg-black text-white px-4 py-2 flex flex-col justify-center">
            <div className="text-[15px] leading-none tracking-wider">LA</div>
            <div className="text-3xl leading-none tracking-wider" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              TRIBUNA
            </div>
            <div className="text-[9px] tracking-wider mt-0.5">estadio.virtual</div>
          </div>
          <div className="flex-1 px-4 py-2 min-w-0">
            <h1
              className="text-3xl sm:text-4xl uppercase leading-none"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: 1 }}
            >
              100.000 lugares para tu club
            </h1>
            <p className="mt-1 text-[11px] tracking-wider uppercase">
              Elegí tu club · meté hinchas · pintá la tribuna · <span className="text-red-700">{config?.precio ? `$${config.precio} por hincha · ` : ''}pagá con Mercado Pago o soy amigo</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center px-3 border-l-4 border-black">
            <div className="border-2 border-dashed border-black px-3 py-1.5 text-center leading-tight">
              <b className="block text-lg text-red-700">{nf(ocupadas)}</b>
              <span className="text-[9px] tracking-wider">de {nf(capacidad)}</span>
            </div>
          </div>
        </header>

        {/* ---------- Grid principal ---------- */}
        <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          {/* En desktop: 3 columnas; en mobile: 1 sola, estadio primero */}
          <style>{`
            @media (min-width: 1080px) {
              .grid-main { grid-template-columns: 250px minmax(0, 1fr) 270px !important; }
            }
          `}</style>
          <div className="grid-main grid gap-3.5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
            {/* ---------- columna izquierda ---------- */}
            <aside className="order-2 lg:order-1 space-y-3.5">
              <Card title="Top 3">
                {conHinchas.length === 0 ? (
                  <p className="text-[10px] font-normal text-gray-600">Todavía no entró nadie al estadio.</p>
                ) : (
                  <div>
                    {conHinchas.slice(0, 3).map((c, i) => (
                      <button
                        key={c.slug}
                        onClick={() => setSelectedSlug(c.slug)}
                        className="w-full flex items-center gap-2 py-1.5 border-b-2 border-dotted border-gray-400 last:border-0 text-left hover:bg-yellow-200/50"
                      >
                        <span className="text-xs w-5">{['1º', '2º', '3º'][i]}</span>
                        {clubSwatch(c)}
                        <span className="flex-1 min-w-0 text-[11px] uppercase truncate">
                          {c.apodo || c.nombre}
                        </span>
                        <span className="text-sm" style={{ color: colorLegible(c), fontFamily: 'Impact, Arial Black, sans-serif' }}>
                          {c.hinchas > 0 ? pf(Math.round((c.hinchas / capacidad) * 10000) / 100) : '<0,01%'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Hinchas en la cancha">
                <div
                  className="text-center text-[34px] leading-none text-green-700"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  {loading && clubs.length === 0 ? <span className="inline-block min-w-[3.5em] h-[0.85em] align-middle bg-gray-300 border-2 border-gray-400 animate-pulse" /> : nf(ocupadas)}
                </div>
                <div className="text-[10px] text-center uppercase mt-1">metidos hasta ahora</div>
                <div className="text-[9px] text-center border-2 border-black p-1.5 mt-2.5 uppercase">
                  La cancha se llena con {nf(capacidad)}
                </div>
              </Card>

              <div className="bg-[#fff6c9] border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.55)] p-3">
                <div className="text-[15px] text-red-700 uppercase leading-none" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  Sumá un hincha
                </div>
                <div className="text-[13px] uppercase leading-tight mt-0.5" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  y pintá con tu color
                </div>
                <button
                  onClick={() => setBuyOpen(true)}
                  className="block w-full mt-2.5 bg-green-700 hover:bg-green-800 text-white border-4 border-black py-2 text-sm uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,0.55)]"
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  ¡Meto hinchas!
                </button>
                <div className="text-[9px] text-center mt-2 uppercase">{config?.precio ? `$${config.precio} por hincha · ` : 'gratis '}· o «soy amigo»</div>
              </div>
            </aside>

            {/* ---------- centro: estadio ---------- */}
            <main className="order-1 lg:order-2 space-y-3.5">
              {/* Cartel "listo" si recién compraron */}
              {/* (lo dejamos opcional; las toasts ya avisan) */}

              {/* Banderas del podio */}
              <div className="relative min-h-[140px] flex items-end justify-center" style={{ gap: '3%' }}>
                {conHinchas.length === 0 ? (
                  <p className="text-xs text-[#cfe0d4] text-center self-center">
                    El estadio está vacío. <b>El primero que entra, manda.</b>
                  </p>
                ) : (
                  conHinchas.slice(0, 3).map((c, i) => {
                    const poleH = [74, 52, 34][i]
                    const numFs = [32, 26, 22][i]
                    const crestSz = [34, 28, 24][i]
                    const label = ['1º', '2º', '3º'][i]
                    return (
                      <button
                        key={c.slug}
                        onClick={() => setSelectedSlug(c.slug)}
                        title={c.nombre}
                        className="flex flex-col items-center cursor-pointer"
                      >
                        <div
                          className="relative border-[3px] border-black px-2.5 py-1.5 text-center overflow-hidden"
                          style={{
                            background: isHex(c.color) ? c.color : '#8a8a8a',
                            boxShadow: '5px 5px 0 rgba(0,0,0,.5)',
                          }}
                        >
                          {/* franjas del trapo con color secundario */}
                          <div
                            className="absolute inset-0 opacity-90 pointer-events-none"
                            style={{
                              background:
                                isHex(c.color2) && c.color2!.toLowerCase() !== c.color.toLowerCase()
                                  ? `repeating-linear-gradient(180deg, transparent 0 12px, ${c.color2} 12px 24px)`
                                  : `repeating-linear-gradient(180deg, transparent 0 12px, rgba(0,0,0,.3) 12px 24px)`,
                            }}
                          />
                          <div className="relative flex items-center justify-center gap-2">
                            <span
                              className="text-white"
                              style={{
                                fontFamily: 'Impact, Arial Black, sans-serif',
                                fontSize: numFs,
                                lineHeight: 0.85,
                                WebkitTextStroke: '2px #111',
                                paintOrder: 'stroke fill',
                              }}
                            >
                              {label}
                            </span>
                            <span
                              className="bg-white border-2 border-black flex items-center justify-center font-mono font-bold text-black"
                              style={{ width: crestSz, height: crestSz, fontSize: crestSz * 0.5 }}
                            >
                              {c.nombre.charAt(0)}
                            </span>
                          </div>
                          <div
                            className="relative text-[9px] uppercase mt-1 text-white truncate max-w-[132px]"
                            style={{
                              textShadow: '1.5px 0 0 #111, -1.5px 0 0 #111, 0 1.5px 0 #111, 0 -1.5px 0 #111',
                              letterSpacing: 0.5,
                            }}
                          >
                            {c.apodo || c.nombre}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 7,
                            height: poleH,
                            background: 'linear-gradient(90deg,#8f96a3 0 40%, #6b7280 40% 100%)',
                            border: '2px solid #111',
                          }}
                        />
                      </button>
                    )
                  })
                )}
              </div>

              {/* Aforo */}
              <div className="bg-[#f4f1e4] border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.55)] p-2.5 mb-3.5">
                <div className="text-[13px] uppercase mb-2" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  Faltan <b className="text-red-700 text-[22px]">{nf(libres)}</b> hinchas para llenar la cancha
                </div>
                <div className="flex justify-between text-[11px] uppercase mb-1.5">
                  <span>Cuánto falta para llenarla</span>
                  <span>{pf(pct)} llena</span>
                </div>
                <div className="h-[15px] bg-[#ddd8c6] border-[3px] border-black overflow-hidden">
                  <div
                    className="h-full bg-red-700 transition-all"
                    style={{ width: Math.max(ocupadas > 0 ? 0.6 : 0, pct) + '%' }}
                  />
                </div>
              </div>

              {/* Estadio canvas */}
              <div>
                <Stadium clubs={stadiumClubs} capacity={capacidad} onSelectClub={onSelectClub} />
              </div>
              <div className="text-[9px] text-[#cfe0d4] text-right">
                vista general de la cancha · los colores se actualizan en vivo
              </div>

              {/* Banner meme */}
              {libres > 0 && (
                <div className="flex items-end gap-1 bg-yellow-300 border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.55)] p-0">
                  <div className="flex-1 min-w-0 px-3.5 py-3.5">
                    <div className="uppercase leading-none text-red-700" style={{ fontFamily: 'Impact, Arial Black, sans-serif', fontSize: 'clamp(15px, 2.4vw, 24px)' }}>
                      {lider ? '¿Vas a dejar que te pasen?' : 'La cancha está vacía'}
                    </div>
                    <div className="text-[10.5px] uppercase leading-tight mt-1.5">
                      {lider
                        ? `${lider.apodo || lider.nombre} va primero con ${hinchas(lider.hinchas)}. Quedan ${nf(libres)} lugares: cada uno que no llena tu club, se lo queda otro.`
                        : `Las ${nf(capacidad)} hinchas están libres. El primero que entre, manda.`}
                    </div>
                    <button
                      onClick={() => setBuyOpen(true)}
                      className="block mt-2.5 bg-green-700 hover:bg-green-800 text-white border-4 border-black py-2 px-3 text-sm uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,0.55)]"
                      style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                    >
                      ¡Meto los míos!
                    </button>
                  </div>
                </div>
              )}

              {/* Feed de últimas compras */}
              <Card title="Últimos en entrar">
                {feed.length === 0 ? (
                  <p className="text-[10px] font-normal text-gray-600">Acá van a aparecer las últimas compras.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    {feed.slice(0, 8).map((f) => (
                      <div key={f.id} className="flex gap-2 py-1.5 border-b-2 border-dotted border-gray-400 last:border-0">
                        <div
                          className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold"
                          style={{ color: colorLegible(f) }}
                        >
                          {f.club.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10.5px] uppercase truncate">
                            {f.nombre} → x{f.cantidad} {f.club}
                          </div>
                          {f.mensaje && (
                            <div className="text-[10px] font-normal text-gray-600 truncate">“{f.mensaje}”</div>
                          )}
                        </div>
                        <div className="text-[9px] text-gray-500 whitespace-nowrap">{timeAgo(f.fecha)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </main>

            {/* ---------- columna derecha ---------- */}
            <aside className="order-3 space-y-3.5">
              {!selected ? (
                <>
                  <Card title="Llená la cancha">
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                          {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((v, i) => (
                            <span
                              key={i}
                              className="w-[7px] h-[7px] block"
                              style={{ background: v ? '#1f7a3f' : 'transparent', border: v ? 'none' : '1px solid #9aa' }}
                            />
                          ))}
                        </div>
                        <div className="text-[9.5px] leading-tight uppercase">Metés hinchas y pintás cancha para tu club.</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                          {[1, 1, 1, 0, 1, 0, 1, 0, 1].map((v, i) => (
                            <span
                              key={i}
                              className="w-[7px] h-[7px] block"
                              style={{ background: v ? '#1f7a3f' : 'transparent', border: v ? 'none' : '1px solid #9aa' }}
                            />
                          ))}
                        </div>
                        <div className="text-[9.5px] leading-tight uppercase">Entran {nf(capacidad)} y ni uno más.</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                          {[0, 1, 0, 0, 1, 0, 1, 1, 1].map((v, i) => (
                            <span
                              key={i}
                              className="w-[7px] h-[7px] block"
                              style={{ background: v ? '#1f7a3f' : 'transparent', border: v ? 'none' : '1px solid #9aa' }}
                            />
                          ))}
                        </div>
                        <div className="text-[9.5px] leading-tight uppercase">Cuando se llena, queda así para siempre.</div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Ranking">
                    {conHinchas.length === 0 ? (
                      <p className="text-[10px] font-normal text-gray-600">Todavía no entró nadie a la cancha.</p>
                    ) : (
                      <div className="max-h-[322px] overflow-y-auto -mx-1 px-1">
                        <div className="flex justify-between text-[8.5px] uppercase text-gray-500 border-b-[3px] border-black pb-1">
                          <span>Club</span><span>De la cancha</span>
                        </div>
                        {ranked.map((c, i) => {
                          if (c.hinchas === 0) return null
                          const value = c.hinchas > 0 ? Math.round((c.hinchas / capacidad) * 10000) / 100 : 0
                          return (
                            <button
                              key={c.slug}
                              onClick={() => setSelectedSlug(c.slug)}
                              className={
                                'w-full flex items-center gap-1.5 py-1 border-b-2 border-dotted border-gray-400 last:border-0 cursor-pointer hover:bg-yellow-200/50 text-left ' +
                                (i < 3 ? 'text-red-700' : '')
                              }
                            >
                              <span className="text-[11px] w-5 text-gray-500" style={i < 3 ? { color: '#d81f26', fontSize: 13 } : {}}>
                                {i + 1}º
                              </span>
                              {clubSwatch(c)}
                              <span className="flex-1 min-w-0 text-[9.5px] uppercase truncate">{c.apodo || c.nombre}</span>
                              <span className="text-[10.5px]" style={{ color: colorLegible(c) }}>
                                {value > 0 ? pf(value) : '<0,01%'}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <ClubDetail
                  club={selected}
                  rank={ranked.findIndex((c) => c.slug === selected.slug) + 1}
                  capacidad={capacidad}
                  arriba={arriba}
                  onClose={() => setSelectedSlug(null)}
                  onAdd={() => setBuyOpen(true)}
                />
              )}
            </aside>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <footer className="mt-3.5 bg-black text-gray-300 border-4 border-black flex justify-between items-center flex-wrap gap-2.5 px-3.5 py-2 text-[10px] uppercase">
          <span>La Tribuna · estadio virtual · {config?.aliasMP ? `pagá a ${config.aliasMP} o «soy amigo»` : 'modo prueba'}</span>
          <span className="border-2 border-yellow-300 text-yellow-300 px-2 py-1">
            {nf(ocupadas)} / {nf(capacidad)} · {pf(pct)} llena
          </span>
        </footer>
      </div>

      {/* ---------- Botón fijo en mobile ---------- */}
      <button
        onClick={() => setBuyOpen(true)}
        className="lg:hidden fixed left-2 right-2 bottom-2 z-50 bg-red-700 text-white text-center border-[3px] border-black shadow-[4px_4px_0_rgba(0,0,0,0.55)] py-3 text-base uppercase tracking-wider"
        style={{ fontFamily: 'Impact, Arial Black, sans-serif', bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
      >
        ¡Meto hinchas!
      </button>

      {/* ---------- Modal de compra ---------- */}
      <BuyForm
        open={buyOpen}
        onOpenChange={setBuyOpen}
        clubs={clubs as unknown as ClubLite[]}
        preselectSlug={selectedSlug}
        libres={libres}
        config={config}
        onBought={onBought}
      />
    </div>
  )
}

/* ---------- Sub-componentes ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f4f1e4] border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.55)] mb-3.5">
      <div className="bg-red-700 text-white px-2.5 py-1.5 text-sm uppercase text-center border-b-[3px] border-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function ClubDetail({
  club,
  rank,
  capacidad,
  arriba,
  onClose,
  onAdd,
}: {
  club: Club
  rank: number
  capacidad: number
  arriba: Club | null
  onClose: () => void
  onAdd: () => void
}) {
  const value = Math.round((club.hinchas / capacidad) * 10000) / 100

  return (
    <div className="bg-[#f4f1e4] border-4 border-black shadow-[6px_6px_0_rgba(0,0,0,0.55)]">
      <div className="bg-red-700 text-white px-2.5 py-1.5 text-sm uppercase text-center border-b-[3px] border-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
        Ficha del club
      </div>
      <div className="p-3">
        <div
          className="w-16 h-16 mx-auto mb-2 border-[3px] border-black bg-white flex items-center justify-center font-mono font-bold text-2xl"
          style={{ color: colorLegible(club) }}
        >
          {club.nombre.charAt(0)}
        </div>
        <div className="text-center uppercase text-[15px] leading-tight" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
          {club.nombre}
        </div>
        <div className="text-[10px] text-center text-gray-600 mb-2.5 font-normal">{club.apodo}</div>
        <div className="flex justify-between text-[10.5px] py-1 border-b-2 border-dotted border-gray-400 uppercase">
          <span>Puesto</span><span>{club.hinchas > 0 ? rank + 'º' : '—'}</span>
        </div>
        <div className="flex justify-between text-[10.5px] py-1 border-b-2 border-dotted border-gray-400 uppercase">
          <span>De la cancha</span><span>{pf(value)}</span>
        </div>
        <div className="flex justify-between text-[10.5px] py-1 border-b-2 border-dotted border-gray-400 uppercase">
          <span>Hinchas</span><span>{nf(club.hinchas)}</span>
        </div>
        <div
          className="bg-yellow-300 border-[3px] border-black p-2 my-2 text-[10px] text-center uppercase leading-tight"
        >
          {arriba ? (
            <>
              {club.nombre} necesita <b className="text-red-700">{hinchas(arriba.hinchas - club.hinchas + 1)}</b> para pasar a {arriba.nombre}
            </>
          ) : club.hinchas > 0 ? (
            'Es la hinchada que más cancha llena. Defendela.'
          ) : (
            <>
              Todavía no metió ni un hincha. <b className="text-red-700">¡Poné el primero!</b>
            </>
          )}
        </div>
        <button
          onClick={onAdd}
          className="block w-full mt-1 bg-green-700 hover:bg-green-800 text-white border-[3px] border-black py-2 text-sm uppercase tracking-wider shadow-[3px_3px_0_rgba(0,0,0,0.55)]"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          Sumarme a {club.nombre}
        </button>
        <button
          onClick={onClose}
          className="block w-full text-center text-[10.5px] text-green-700 underline cursor-pointer uppercase mt-3"
        >
          « Volver al ranking
        </button>
      </div>
    </div>
  )
}
