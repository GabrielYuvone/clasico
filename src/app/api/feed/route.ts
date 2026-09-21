import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/feed — últimas compras pagadas (hasta 30), para el feed de actividad.
// Las pendientes no se muestran: todavía no son hinchas en la cancha.
export async function GET() {
  const purchases = await db.purchase.findMany({
    where: { estado: 'pagada' },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: { club: true },
  })

  const out = purchases.map((p) => ({
    id: p.id,
    nombre: p.nombre || 'Anónimo',
    mensaje: p.mensaje,
    cantidad: p.cantidad,
    club: p.club.nombre,
    slug: p.club.slug,
    color: p.club.colorPrimario,
    color2: p.club.colorSecundario,
    amigo: p.amigo,
    fecha: (p.approvedAt || p.createdAt).toISOString(),
  }))

  return NextResponse.json(out)
}
