// Aprobar una compra pendiente.
//
// Uso:
//   bun run scripts/approve.ts <operacion>
//   bun run scripts/approve.ts <operacion1> <operacion2> ...
//   bun run scripts/approve.ts --list              # ver pendientes
//   bun run scripts/approve.ts --all              # aprobar todas las pendientes
//   bun run scripts/approve.ts --reject <id>       # rechazar una por id interno
//
// El admin verifica en su cuenta de Mercado Pago que llegó el pago con ese
// número de operación, y después corre este script para marcar la compra
// como "pagada". Recién ahí los hinchas pintan en la cancha.
import { db } from '../src/lib/db'

async function list() {
  const rows = await db.purchase.findMany({
    where: { estado: 'pendiente' },
    orderBy: { createdAt: 'desc' },
    include: { club: true },
  })
  if (!rows.length) {
    console.log('No hay compras pendientes.')
    return
  }
  console.log(`Pendientes: ${rows.length}`)
  for (const r of rows) {
    console.log(
      `  op=${r.operacion}  ${r.cantidad} hinchas  ${r.club.nombre}  nombre=${r.nombre || '—'}  id=${r.id}`
    )
  }
}

async function approve(operacion: string) {
  // Tomamos la pendiente MÁS RECIENTE con esa operación (por si el comprador
  // reintentó y generó varias órdenes con el mismo número — MP rara vez
  // repite, pero por las dudas).
  const row = await db.purchase.findFirst({
    where: { operacion, estado: 'pendiente' },
    orderBy: { createdAt: 'desc' },
    include: { club: true },
  })
  if (!row) {
    console.log(`No hay pendiente con operación "${operacion}".`)
    return
  }
  await db.purchase.update({
    where: { id: row.id },
    data: { estado: 'pagada', approvedAt: new Date() },
  })
  console.log(`✔ Aprobada: ${row.cantidad} hinchas para ${row.club.nombre} (op ${operacion}).`)
}

async function approveAll() {
  const rows = await db.purchase.findMany({ where: { estado: 'pendiente' }, include: { club: true } })
  if (!rows.length) {
    console.log('No hay pendientes.')
    return
  }
  for (const r of rows) {
    await db.purchase.update({
      where: { id: r.id },
      data: { estado: 'pagada', approvedAt: new Date() },
    })
    console.log(`✔ ${r.cantidad} hinchas → ${r.club.nombre} (op ${r.operacion})`)
  }
}

async function reject(id: string) {
  const r = await db.purchase.update({
    where: { id },
    data: { estado: 'rechazada' },
    include: { club: true },
  })
  console.log(`✗ Rechazada: ${r.cantidad} hinchas para ${r.club.nombre} (id ${id}).`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === '--list') {
    await list()
    return
  }
  if (args[0] === '--all') {
    await approveAll()
    return
  }
  if (args[0] === '--reject') {
    if (!args[1]) { console.log('Falta el id. Uso: --reject <id>'); process.exit(1) }
    await reject(args[1])
    return
  }
  for (const op of args) await approve(op)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
