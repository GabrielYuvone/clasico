// Seed del Clásico Rosarino: La Lepra (Newell's) + El Canalla (Rosario Central).
//
// SEGURO: NO borra purchases. Solo hace upsert de los 2 clubes — si ya existen,
// los actualiza; si no, los crea. Las compras existentes quedan intactas.
// Para borrar todo y empezar de cero, usar `bun run db:push --accept-data-loss`
// (que es explícito y requiere el flag) o hacerlo a mano con un script aparte.
import { db } from '../src/lib/db'

async function main() {
  console.log('Upsert de los 2 clubes del Clásico Rosarino...')

  await db.club.upsert({
    where: { slug: 'lepra' },
    update: {
      nombre: "Newell's Old Boys",
      apodo: 'La Lepra',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      colorPrimario: '#C8102E',
      colorSecundario: '#111111',
    },
    create: {
      slug: 'lepra',
      nombre: "Newell's Old Boys",
      apodo: 'La Lepra',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      colorPrimario: '#C8102E',
      colorSecundario: '#111111',
    },
  })

  await db.club.upsert({
    where: { slug: 'canalla' },
    update: {
      nombre: 'Rosario Central',
      apodo: 'El Canalla',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      colorPrimario: '#0033A0',
      colorSecundario: '#FFD100',
    },
    create: {
      slug: 'canalla',
      nombre: 'Rosario Central',
      apodo: 'El Canalla',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      colorPrimario: '#0033A0',
      colorSecundario: '#FFD100',
    },
  })

  const total = await db.purchase.count()
  console.log('Listo. 2 clubes en la DB (La Lepra y El Canalla).')
  console.log(`Purchases existentes preservadas: ${total}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
