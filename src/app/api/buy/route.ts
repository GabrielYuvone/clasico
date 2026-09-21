import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CAPACIDAD = 100000
const MAX_POR_COMPRA = 2000

// POST /api/buy — sumar hinchas a un club. GRATIS, sin registro.
// Body: { slug: string, cantidad: number, nombre?: string, mensaje?: string }
export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }

  const slug = String(body.slug || '').trim()
  const cantidad = Math.floor(Number(body.cantidad) || 0)
  const nombre = body.nombre ? String(body.nombre).trim().slice(0, 40) : null
  const mensaje = body.mensaje ? String(body.mensaje).trim().slice(0, 140) : null

  if (!slug) return NextResponse.json({ ok: false, error: 'Falta el club' }, { status: 400 })
  if (!cantidad || cantidad < 1)
    return NextResponse.json({ ok: false, error: 'Cantidad inválida' }, { status: 400 })
  if (cantidad > MAX_POR_COMPRA)
    return NextResponse.json(
      { ok: false, error: `Máximo ${MAX_POR_COMPRA} por compra` },
      { status: 400 }
    )

  const club = await db.club.findUnique({ where: { slug } })
  if (!club) return NextResponse.json({ ok: false, error: 'Club inexistente' }, { status: 404 })

  // Control de aforo: no se puede vender más de la capacidad.
  const total = await db.purchase.aggregate({ _sum: { cantidad: true } })
  const ocupadas = total._sum.cantidad ?? 0
  const libres = Math.max(0, CAPACIDAD - ocupadas)
  if (cantidad > libres) {
    return NextResponse.json(
      { ok: false, error: `Solo quedan ${libres} lugares` },
      { status: 409 }
    )
  }

  const purchase = await db.purchase.create({
    data: { clubId: club.id, cantidad, nombre, mensaje },
    include: { club: true },
  })

  return NextResponse.json({
    ok: true,
    id: purchase.id,
    cantidad: purchase.cantidad,
    club: purchase.club.nombre,
    slug: purchase.club.slug,
    color: purchase.club.colorPrimario,
    color2: purchase.club.colorSecundario,
    nombre: purchase.nombre,
    mensaje: purchase.mensaje,
    fecha: purchase.createdAt.toISOString(),
  })
}
