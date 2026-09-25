// Recrear una purchase a mano (para recuperar pagos reales que se perdieron
// de la DB por error, o para ajustar manualmente).
//
// Uso:
//   bun run scripts/recover-purchase.ts --club <slug> --cantidad <n> [--nombre <nombre>] [--mensaje <msg>] [--fecha <ISO>]
//
// Ejemplo:
//   bun run scripts/recover-purchase.ts --club lepra --cantidad 1 --nombre "Gabriel" --mensaje "Vamos Lepra"
//
// Crea la purchase con estado="pagada", amigo=false, mpStatus="approved",
// mpPaymentId="recovered-<timestamp>", y approvedAt=ahora (o la fecha que pases).
import { db } from '../src/lib/db'

async function main() {
  const args = process.argv.slice(2)
  const get = (k: string): string | null => {
    const i = args.indexOf(`--${k}`)
    return i >= 0 ? args[i + 1] : null
  }
  const clubSlug = get('club')
  const cantidad = Number(get('cantidad'))
  const nombre = get('nombre')
  const mensaje = get('mensaje')
  const fechaStr = get('fecha')

  if (!clubSlug || !cantidad) {
    console.log('Uso: bun run scripts/recover-purchase.ts --club <slug> --cantidad <n> [--nombre <nombre>] [--mensaje <msg>] [--fecha <ISO>]')
    console.log('Ej: bun run scripts/recover-purchase.ts --club lepra --cantidad 1 --nombre "Gabriel"')
    process.exit(1)
  }

  const club = await db.club.findUnique({ where: { slug: clubSlug } })
  if (!club) {
    console.error(`Club "${clubSlug}" no existe. Slugs válidos: lepra, canalla.`)
    process.exit(1)
  }

  const fecha = fechaStr ? new Date(fechaStr) : new Date()
  const purchase = await db.purchase.create({
    data: {
      clubId: club.id,
      cantidad,
      nombre: nombre || null,
      mensaje: mensaje || null,
      estado: 'pagada',
      amigo: false,
      mpStatus: 'approved',
      mpPaymentId: `recovered-${Date.now()}`,
      approvedAt: fecha,
      createdAt: fecha,
    },
    include: { club: true },
  })

  console.log(`✔ Purchase recreada:`)
  console.log(`  Club: ${purchase.club.nombre} (${purchase.club.apodo})`)
  console.log(`  Cantidad: ${purchase.cantidad} hinchas`)
  console.log(`  Nombre: ${purchase.nombre || '—'}`)
  console.log(`  Mensaje: ${purchase.mensaje || '—'}`)
  console.log(`  Fecha: ${purchase.createdAt.toISOString()}`)
  console.log(`  ID interno: ${purchase.id}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
