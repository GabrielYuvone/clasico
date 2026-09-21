import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/config — configuración del estadio.
//   precio: precio por hincha (ARS).
//   aliasMP: alias de Mercado Pago (legacy, ya no se usa en el flujo automático).
//   permiteAmigo: si true, el botón "soy amigo" aparece y mete hinchas sin pago.
//   pendientes: cuántas compras están esperando webhook de MP (modo dev / debug).
//   ocupadas/libres: solo cuentan las pagadas.
//   mpReady: si MP_ACCESS_TOKEN está configurado (flujo automático disponible).
export async function GET() {
  const [pagadasAgg, pendientesCount] = await Promise.all([
    db.purchase.aggregate({ _sum: { cantidad: true }, where: { estado: 'pagada' } }),
    db.purchase.count({ where: { estado: 'pendiente' } }),
  ])
  const ocupadas = pagadasAgg._sum.cantidad ?? 0
  const capacidad = 100000
  const libres = Math.max(0, capacidad - ocupadas)

  return NextResponse.json({
    precio: 100, // ARS por hincha
    aliasMP: 'gabrielyuvone.mp',
    capacidad,
    maxPorCompra: 2000,
    ocupadas,
    libres,
    cobraDeVerdad: true,
    permiteAmigo: true,
    pendientes: pendientesCount,
    mpReady: Boolean(process.env.MP_ACCESS_TOKEN),
  })
}
