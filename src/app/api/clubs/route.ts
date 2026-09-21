import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/clubs — lista de clubes con su conteo de hinchas (suma de purchases)
// ordenado por nombre. El front vuelve a ordenar por hinchas para el ranking.
export async function GET() {
  const clubs = await db.club.findMany({
    include: {
      purchases: { select: { cantidad: true } },
    },
    orderBy: { nombre: 'asc' },
  })

  const out = clubs.map((c) => {
    const hinchas = c.purchases.reduce((s, p) => s + p.cantidad, 0)
    return {
      slug: c.slug,
      nombre: c.nombre,
      apodo: c.apodo,
      liga: c.liga,
      ciudad: c.ciudad,
      provincia: c.provincia,
      color: c.colorPrimario,
      color2: c.colorSecundario,
      hinchas,
    }
  })

  return NextResponse.json(out)
}
