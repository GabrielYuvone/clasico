// Limpia la DB y la deja solo con los 2 clubes del Clásico Rosarino.
import { db } from '../src/lib/db'

async function main() {
  console.log('Borrando purchases y clubes anteriores...')
  await db.purchase.deleteMany({})
  await db.club.deleteMany({})

  console.log('Creando los 2 clubes del Clásico Rosarino...')
  await db.club.create({
    data: {
      slug: 'lepra',
      nombre: "Newell's Old Boys",
      apodo: 'La Lepra',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      // Rojo y negro (Newell's). El rojo es el primario para pintar butacas.
      colorPrimario: '#C8102E',
      colorSecundario: '#111111',
    },
  })

  await db.club.create({
    data: {
      slug: 'canalla',
      nombre: 'Rosario Central',
      apodo: 'El Canalla',
      liga: 'Clásico Rosarino',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      // Azul y amarillo (Central). El azul es el primario para pintar butacas.
      colorPrimario: '#0033A0',
      colorSecundario: '#FFD100',
    },
  })

  console.log('Listo. Solo 2 clubes en la DB: La Lepra y Canalla.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
