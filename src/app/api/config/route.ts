import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/config — configuración del estadio.
// precio: precio por hincha (ARS). 0 = gratis.
// aliasMP: alias de Mercado Pago para recibir pagos.
//   El botón "pagar" abre https://mpago.la/<alias>?amount=<precio*qty> en una
//   nueva pestaña. El visitante paga, vuelve y confirma; el botón "soy amigo"
//   salta el pago (modo prueba / amigos / preview).
export async function GET() {
  const total = await db.purchase.aggregate({ _sum: { cantidad: true } })
  const ocupadas = total._sum.cantidad ?? 0
  const capacidad = 100000
  const libres = Math.max(0, capacidad - ocupadas)

  return NextResponse.json({
    precio: 100, // ARS por hincha
    aliasMP: 'gabrielyuvone.mp',
    capacidad,
    maxPorCompra: 2000,
    ocupadas,
    libres,
    cobraDeVerdad: true, // hay un botón de pago real
    permiteAmigo: true,  // pero también existe el botón "soy amigo"
  })
}
