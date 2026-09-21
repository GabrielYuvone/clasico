import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/config — configuración del estadio.
// En modo prueba: precio 0, no se cobra, no se requiere registro.
export async function GET() {
  const total = await db.purchase.aggregate({ _sum: { cantidad: true } })
  const ocupadas = total._sum.cantidad ?? 0
  const capacidad = 100000
  const libres = Math.max(0, capacidad - ocupadas)

  return NextResponse.json({
    precio: 0,
    capacidad,
    maxPorCompra: 2000,
    ocupadas,
    libres,
    cobraDeVerdad: false,
    modoPrueba: true,
  })
}
