import { db } from '../src/lib/db'

// Lista de clubes de fútbol argentino (basada en la disponible en
// lapopular.online, sin los escudos — usamos un swatch con los colores).
// El "color" es el que va a pintar las butacas en el estadio.
type ClubSeed = {
  slug: string
  nombre: string
  apodo: string
  liga: string
  ciudad: string
  provincia: string
  colorPrimario: string
  colorSecundario: string
}

const CLUBES: ClubSeed[] = [
  { slug: 'boca', nombre: 'Boca Juniors', apodo: 'Xeneize', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#00327D', colorSecundario: '#FFD200' },
  { slug: 'river', nombre: 'River Plate', apodo: 'El Millonario', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#E4032E', colorSecundario: '#FFFFFF' },
  { slug: 'independiente', nombre: 'Independiente', apodo: 'El Rojo', liga: 'Liga Profesional', ciudad: 'Avellaneda', provincia: 'Buenos Aires', colorPrimario: '#E2001A', colorSecundario: '#FFFFFF' },
  { slug: 'racing', nombre: 'Racing Club', apodo: 'La Academia', liga: 'Liga Profesional', ciudad: 'Avellaneda', provincia: 'Buenos Aires', colorPrimario: '#6CACE4', colorSecundario: '#FFFFFF' },
  { slug: 'sanlorenzo', nombre: 'San Lorenzo', apodo: 'El Ciclón', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#0033A0', colorSecundario: '#C8102E' },
  { slug: 'huracan', nombre: 'Huracán', apodo: 'El Globo', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#E2001A', colorSecundario: '#FFFFFF' },
  { slug: 'velez', nombre: 'Vélez Sarsfield', apodo: 'El Fortín', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#002F87', colorSecundario: '#FFFFFF' },
  { slug: 'estudianteslp', nombre: 'Estudiantes de La Plata', apodo: 'El Pincha', liga: 'Liga Profesional', ciudad: 'La Plata', provincia: 'Buenos Aires', colorPrimario: '#D50032', colorSecundario: '#FFFFFF' },
  { slug: 'gimnasialp', nombre: 'Gimnasia y Esgrima La Plata', apodo: 'El Lobo', liga: 'Liga Profesional', ciudad: 'La Plata', provincia: 'Buenos Aires', colorPrimario: '#14213D', colorSecundario: '#FFFFFF' },
  { slug: 'newells', nombre: "Newell's Old Boys", apodo: 'La Lepra', liga: 'Liga Profesional', ciudad: 'Rosario', provincia: 'Santa Fe', colorPrimario: '#E2001A', colorSecundario: '#000000' },
  { slug: 'central', nombre: 'Rosario Central', apodo: 'Canalla', liga: 'Liga Profesional', ciudad: 'Rosario', provincia: 'Santa Fe', colorPrimario: '#002B7F', colorSecundario: '#FFD100' },
  { slug: 'tigre', nombre: 'Tigre', apodo: 'El Matador', liga: 'Liga Profesional', ciudad: 'Victoria', provincia: 'Buenos Aires', colorPrimario: '#0038A8', colorSecundario: '#ED1C24' },
  { slug: 'lanus', nombre: 'Lanús', apodo: 'El Granate', liga: 'Liga Profesional', ciudad: 'Lanús', provincia: 'Buenos Aires', colorPrimario: '#7B1030', colorSecundario: '#FFFFFF' },
  { slug: 'argentinos', nombre: 'Argentinos Juniors', apodo: 'El Bicho', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#E30613', colorSecundario: '#FFFFFF' },
  { slug: 'platense', nombre: 'Platense', apodo: 'El Calamar', liga: 'Liga Profesional', ciudad: 'Vicente López', provincia: 'Buenos Aires', colorPrimario: '#6F4E37', colorSecundario: '#FFFFFF' },
  { slug: 'banfield', nombre: 'Banfield', apodo: 'El Taladro', liga: 'Liga Profesional', ciudad: 'Banfield', provincia: 'Buenos Aires', colorPrimario: '#00874E', colorSecundario: '#FFFFFF' },
  { slug: 'defensa', nombre: 'Defensa y Justicia', apodo: 'El Halcón', liga: 'Liga Profesional', ciudad: 'Florencio Varela', provincia: 'Buenos Aires', colorPrimario: '#007A3D', colorSecundario: '#FFD100' },
  { slug: 'belgrano', nombre: 'Belgrano', apodo: 'El Pirata', liga: 'Liga Profesional', ciudad: 'Córdoba', provincia: 'Córdoba', colorPrimario: '#6CACE4', colorSecundario: '#FFFFFF' },
  { slug: 'talleres', nombre: 'Talleres', apodo: 'La T', liga: 'Liga Profesional', ciudad: 'Córdoba', provincia: 'Córdoba', colorPrimario: '#002F6C', colorSecundario: '#FFFFFF' },
  { slug: 'instituto', nombre: 'Instituto', apodo: 'La Gloria', liga: 'Liga Profesional', ciudad: 'Córdoba', provincia: 'Córdoba', colorPrimario: '#D2232A', colorSecundario: '#FFFFFF' },
  { slug: 'union', nombre: 'Unión', apodo: 'El Tatengue', liga: 'Liga Profesional', ciudad: 'Santa Fe', provincia: 'Santa Fe', colorPrimario: '#ED1C24', colorSecundario: '#FFFFFF' },
  { slug: 'colon', nombre: 'Colón', apodo: 'El Sabalero', liga: 'Primera Nacional', ciudad: 'Santa Fe', provincia: 'Santa Fe', colorPrimario: '#ED1C24', colorSecundario: '#000000' },
  { slug: 'centralcordoba', nombre: 'Central Córdoba (SdE)', apodo: 'El Ferroviario', liga: 'Liga Profesional', ciudad: 'Santiago del Estero', provincia: 'Santiago del Estero', colorPrimario: '#000000', colorSecundario: '#FFFFFF' },
  { slug: 'godoycruz', nombre: 'Godoy Cruz', apodo: 'El Tomba', liga: 'Liga Profesional', ciudad: 'Mendoza', provincia: 'Mendoza', colorPrimario: '#002F6C', colorSecundario: '#FFFFFF' },
  { slug: 'riestra', nombre: 'Deportivo Riestra', apodo: 'Los Malevos', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#000000', colorSecundario: '#FFFFFF' },
  { slug: 'sarmiento', nombre: 'Sarmiento', apodo: 'El Verde', liga: 'Liga Profesional', ciudad: 'Junín', provincia: 'Buenos Aires', colorPrimario: '#007A3D', colorSecundario: '#FFFFFF' },
  { slug: 'gimnasiamza', nombre: 'Gimnasia de Mendoza', apodo: 'El Lobo Mendocino', liga: 'Liga Profesional', ciudad: 'Mendoza', provincia: 'Mendoza', colorPrimario: '#000000', colorSecundario: '#FFFFFF' },
  { slug: 'estudiantesrc', nombre: 'Estudiantes de Río Cuarto', apodo: 'El Celeste', liga: 'Liga Profesional', ciudad: 'Río Cuarto', provincia: 'Córdoba', colorPrimario: '#6CACE4', colorSecundario: '#000000' },
  { slug: 'atltucuman', nombre: 'Atlético Tucumán', apodo: 'El Decano', liga: 'Liga Profesional', ciudad: 'San Miguel de Tucumán', provincia: 'Tucumán', colorPrimario: '#6CACE4', colorSecundario: '#FFFFFF' },
  { slug: 'aldosivi', nombre: 'Aldosivi', apodo: 'El Tiburón', liga: 'Liga Profesional', ciudad: 'Mar del Plata', provincia: 'Buenos Aires', colorPrimario: '#00954C', colorSecundario: '#FFD100' },
  { slug: 'barracas', nombre: 'Barracas Central', apodo: 'El Guapo', liga: 'Liga Profesional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#EE1C25', colorSecundario: '#FFFFFF' },
  { slug: 'chicago', nombre: 'Chicago', apodo: 'El Torito', liga: 'Primera Nacional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#000000', colorSecundario: '#007A33' },
  { slug: 'allboys', nombre: 'All Boys', apodo: 'El Albo', liga: 'Primera Nacional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#FFFFFF', colorSecundario: '#000000' },
  { slug: 'ferro', nombre: 'Ferro Carril Oeste', apodo: 'El Verde', liga: 'Primera Nacional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#007A33', colorSecundario: '#FFFFFF' },
  { slug: 'chacarita', nombre: 'Chacarita Juniors', apodo: 'El Funebrero', liga: 'Primera Nacional', ciudad: 'San Martín', provincia: 'Buenos Aires', colorPrimario: '#ED1C24', colorSecundario: '#000000' },
  { slug: 'losandes', nombre: 'Los Andes', apodo: 'Mil Rayitas', liga: 'Primera Nacional', ciudad: 'Lomas de Zamora', provincia: 'Buenos Aires', colorPrimario: '#ED1C24', colorSecundario: '#FFFFFF' },
  { slug: 'quilmes', nombre: 'Quilmes', apodo: 'El Cervecero', liga: 'Primera Nacional', ciudad: 'Quilmes', provincia: 'Buenos Aires', colorPrimario: '#002F6C', colorSecundario: '#FFFFFF' },
  { slug: 'temperley', nombre: 'Temperley', apodo: 'El Gasolero', liga: 'Primera Nacional', ciudad: 'Temperley', provincia: 'Buenos Aires', colorPrimario: '#6CACE4', colorSecundario: '#FFFFFF' },
  { slug: 'atlanta', nombre: 'Atlanta', apodo: 'El Bohemio', liga: 'Primera Nacional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#FFD100', colorSecundario: '#002F6C' },
  { slug: 'moron', nombre: 'Deportivo Morón', apodo: 'El Gallo', liga: 'Primera Nacional', ciudad: 'Morón', provincia: 'Buenos Aires', colorPrimario: '#ED1C24', colorSecundario: '#FFFFFF' },
  { slug: 'almagro', nombre: 'Almagro', apodo: 'El Tricolor', liga: 'Primera Nacional', ciudad: 'Buenos Aires', provincia: 'CABA', colorPrimario: '#002F6C', colorSecundario: '#FFFFFF' },
  { slug: 'tristansuarez', nombre: 'Tristán Suárez', apodo: 'El Lechero', liga: 'Primera Nacional', ciudad: 'Ezeiza', provincia: 'Buenos Aires', colorPrimario: '#002F6C', colorSecundario: '#FFFFFF' },
  { slug: 'patronato', nombre: 'Patronato', apodo: 'El Patrón', liga: 'Primera Nacional', ciudad: 'Paraná', provincia: 'Entre Ríos', colorPrimario: '#ED1C24', colorSecundario: '#000000' },
  { slug: 'gimnasiajujuy', nombre: 'Gimnasia de Jujuy', apodo: 'El Lobo Jujeño', liga: 'Primera Nacional', ciudad: 'San Salvador de Jujuy', provincia: 'Jujuy', colorPrimario: '#6CACE4', colorSecundario: '#FFFFFF' },
  { slug: 'sanmartintuc', nombre: 'San Martín (Tucumán)', apodo: 'El Santo', liga: 'Primera Nacional', ciudad: 'San Miguel de Tucumán', provincia: 'Tucumán', colorPrimario: '#ED1C24', colorSecundario: '#FFFFFF' },
  { slug: 'chacoforever', nombre: 'Chaco For Ever', apodo: 'Albinegro', liga: 'Primera Nacional', ciudad: 'Resistencia', provincia: 'Chaco', colorPrimario: '#000000', colorSecundario: '#FFFFFF' },
]

async function main() {
  console.log(`Seedeando ${CLUBES.length} clubes...`)
  for (const c of CLUBES) {
    await db.club.upsert({
      where: { slug: c.slug },
      update: {
        nombre: c.nombre,
        apodo: c.apodo,
        liga: c.liga,
        ciudad: c.ciudad,
        provincia: c.provincia,
        colorPrimario: c.colorPrimario,
        colorSecundario: c.colorSecundario,
      },
      create: {
        slug: c.slug,
        nombre: c.nombre,
        apodo: c.apodo,
        liga: c.liga,
        ciudad: c.ciudad,
        provincia: c.provincia,
        colorPrimario: c.colorPrimario,
        colorSecundario: c.colorSecundario,
      },
    })
  }
  console.log('Listo.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
