// Estadio en VISTA AEREA: cuenco ovalado de hinchas alrededor de la cancha,
// tres bandejas separadas por pasillos de hormigón, vomitorios radiales y una
// fachada exterior chunky. Colores planos, sin degradados, bordes duros.
// Portado a TypeScript desde estadio.js (lapopular.online).
//
// Cámara: mira desde arriba y de frente (elevación ELEV). Todo se arma en
// coordenadas de mundo (x, y en el piso; z hacia arriba) y se proyecta:
//   sx = x                  sy = y*sin(E) - z*cos(E)
// y se dibuja de atrás hacia adelante con clave de profundidad y*cos(E) + z*sin(E).

export type ClubView = {
  slug: string
  nombre: string
  apodo?: string
  color: string // hex #RRGGBB
  color2?: string
  count: number
}

export type EstadioResult = {
  width: number
  height: number
  totalCells: number
  clubAt: (cx: number, cy: number) => ClubView | null
}

// ---------- geometría (unidades ~ metros) ----------
const PW = 105, PH = 68
const A_IN = 62, B_IN = 46
const A_OUT = 179, B_OUT = 132
const TIERS = [8, 9, 10]
const WALK = 1.7
const NCOL = 216
const NSEC = 24
const Z0 = 3.0
const RISE = 0.42
const SALTO = 1.8
const FACADE_Z = -17
const N_IN = 3.2, N_OUT = 2.15
// Elevación de la cámara. Más alta = vista más cenital (más "desde arriba"),
// más baja = vista más lateral (más perspectiva de las tribunas).
// 90° = cenital pura (vista 100% desde arriba, sin ver las bandejas).
// 40° = la original de lapopular.online (perspectiva marcada).
// 80° = vista "dron muy alto" — casi cenital, el medio y medio se ve clarísimo
//       y los colores de cada mitad saltan a la vista. Las bandejas se ven
//       casi como anillos concéntricos vistos desde arriba.
const ELEV = 80 * Math.PI / 180
const S = 3.1
const PAD = 10

const SIN = Math.sin(ELEV), COS = Math.cos(ELEV), TAU = Math.PI * 2

// ---------- paleta ----------
const C_GRASS_A = '#2f8036', C_GRASS_B = '#2a7431'
const C_LINE = '#eaf2ea'
const C_PERIM = '#1e3a2b'
const C_EMPTY = '#a8b3c3', C_EMPTY_B = '#98a4b6'
const C_GAP = '#4b5464'
const C_WALK = '#c8ccd3', C_WALK_R = '#9aa1ac'
const C_STAIR = '#d6dae0', C_STAIR_R = '#a8aeb8'
const C_WALL = '#b7bcc5', C_WALL_D = '#a9aeb8', C_WALL_B = '#7d838d'
const C_TUNNEL = '#2b3038'
const C_GOAL = '#f4f7f4'
const C_CELESTE = '#74acdf', C_SOL = '#f6b40e'
const INK = '#000'

function shade(hex: string, amt: number): string {
  if (typeof hex !== 'string' || hex.charAt(0) !== '#') return '#666'
  const r = parseInt(hex.substr(1, 2), 16)
  const g = parseInt(hex.substr(3, 2), 16)
  const b = parseInt(hex.substr(5, 2), 16)
  return 'rgb(' + Math.round(r * amt) + ',' + Math.round(g * amt) + ',' + Math.round(b * amt) + ')'
}
function isHex(h?: string | null): h is string {
  return typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)
}

// ---------- perfil radial ----------
type Band =
  | { kind: 'walk'; u0: number; u1: number; z: number; tier: number }
  | { kind: 'seat'; u0: number; u1: number; z: number; tier: number; row: number }

const bands: Band[] = []
let uTotal = 0
;(function buildBands() {
  let u = 0, z = Z0, row = 0
  TIERS.forEach((nrows, ti) => {
    if (ti > 0) {
      z += SALTO
      bands.push({ kind: 'walk', u0: u, u1: u + WALK, z, tier: ti })
      u += WALK
      z += SALTO * 0.4
    }
    for (let r = 0; r < nrows; r++) {
      bands.push({ kind: 'seat', u0: u, u1: u + 1, z, tier: ti, row: row++ })
      z += RISE; u += 1
    }
  })
  uTotal = u
})()
const Z_TOP = (bands[bands.length - 1] as any).z + RISE

function ax(u: number) { return A_IN + (A_OUT - A_IN) * (u / uTotal) }
function by(u: number) { return B_IN + (B_OUT - B_IN) * (u / uTotal) }
function nx(u: number) { return N_IN + (N_OUT - N_IN) * (u / uTotal) }

// Discorectángulo (stadium shape): rectángulo con semicírculos en los extremos.
// Esta es la forma REAL de un estadio de fútbol: dos tribunas laterales rectas
// y largas (los lados largos del rectángulo, paralelos al eje Y) y dos
// cabeceras curvas en los extremos (los semicírculos, paralelos al eje X).
//
// Para cada ángulo th, calculamos el punto en el perímetro:
//   - En el rango |cos(th)| < B/A: el punto está en uno de los lados rectos
//     (perpendicular al eje Y), a distancia B/2 del eje X.
//   - En el rango |cos(th)| >= B/A: el punto está en uno de los semicírculos,
//     cuyo centro está a distancia (A-B)/2 del origen y radio B/2.
//
// A es el "largo total" del estadio (eje X), B es el "ancho total" (eje Y).
// Las tribunas largas (rectas) tienen longitud A-B y se ven a los costados;
// las cabeceras (curvas) tienen radio B/2 y se ven en los extremos.
function ptRing(u: number, th: number) {
  const a = ax(u), b = by(u)
  const c = Math.cos(th), s = Math.sin(th)
  // Posición X del centro del semicírculo. Si c > 0, el centro está a la
  // derecha; si c < 0, a la izquierda.
  const halfStraight = (a - b) / 2
  const circleCenter = c >= 0 ? halfStraight : -halfStraight
  // Si |c| * a < b, el ángulo cae en el tramo recto: el punto es (c*a/2, ±b/2).
  // Sino, cae en el semicírculo: punto en el círculo de centro (circleCenter, 0)
  // radio b/2, en la dirección (c, s).
  if (Math.abs(c) * a < b) {
    return { x: (a / 2) * c, y: (b / 2) * (s >= 0 ? 1 : -1) }
  }
  return { x: circleCenter + (b / 2) * c, y: (b / 2) * s }
}

// ---------- hinchas ----------
type Seat = {
  u0: number; u1: number; z: number; row: number; tier: number
  col: number; sec: number; stair: boolean
}
const COLS_SEC = NCOL / NSEC
const seats: Seat[] = []
bands.forEach((b) => {
  if (b.kind !== 'seat') return
  for (let i = 0; i < NCOL; i++) {
    seats.push({
      u0: b.u0, u1: b.u1, z: b.z, row: b.row, tier: b.tier,
      col: i, sec: Math.floor(i / COLS_SEC), stair: (i % COLS_SEC) === 0,
    })
  }
})
// Orden de venta: sector por sector y de abajo hacia arriba.
seats.sort((p, q) => (p.sec - q.sec) || (p.row - q.row) || (p.col - q.col))

// ---------- encuadre ----------
let OX = 0, OY = 0
function proj(x: number, y: number, z: number) {
  return { sx: OX + x * S, sy: OY + (y * SIN - z * COS) * S }
}

let WIDTH = 0, HEIGHT = 0
;(function computeEncuadre() {
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9
  const caps: [number, number][] = [[0, Z0], [uTotal, Z_TOP], [uTotal, FACADE_Z]]
  for (let i = 0; i <= 180; i++) {
    const th = (i / 180) * TAU
    for (const [u, z] of caps) {
      const p = ptRing(u, th), q = proj(p.x, p.y, z)
      if (q.sx < bx0) bx0 = q.sx
      if (q.sx > bx1) bx1 = q.sx
      if (q.sy < by0) by0 = q.sy
      if (q.sy > by1) by1 = q.sy
    }
  }
  WIDTH = Math.ceil(bx1 - bx0) + PAD * 2
  HEIGHT = Math.ceil(by1 - by0) + PAD * 2
  OX = Math.round(-bx0) + PAD
  OY = Math.round(-by0) + PAD
})()

// ---------- primitivas ----------
type P = { sx: number; sy: number }
function quad(ctx: CanvasRenderingContext2D, pts: P[], fill: string | null, stroke?: string | null, lw?: number) {
  ctx.beginPath()
  ctx.moveTo(pts[0].sx, pts[0].sy)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy)
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 0.6; ctx.stroke() }
}

const JUNTA = 0.95
function cellPts(u0: number, u1: number, t0: number, t1: number, z: number, inset: boolean): P[] {
  const p1 = ptRing(u0, t0), p2 = ptRing(u1, t0), p3 = ptRing(u1, t1), p4 = ptRing(u0, t1)
  const q = [proj(p1.x, p1.y, z), proj(p2.x, p2.y, z), proj(p3.x, p3.y, z), proj(p4.x, p4.y, z)]
  if (!inset) return q
  const cx = (q[0].sx + q[1].sx + q[2].sx + q[3].sx) / 4
  const cy = (q[0].sy + q[1].sy + q[2].sy + q[3].sy) / 4
  return q.map((p) => {
    const dx = cx - p.sx, dy = cy - p.sy, len = Math.hypot(dx, dy) || 1
    const k = Math.min(JUNTA, len * 0.34) / len
    return { sx: p.sx + dx * k, sy: p.sy + dy * k }
  })
}

function riserPts(u: number, t0: number, t1: number, z: number, h: number): P[] {
  const p1 = ptRing(u, t0), p2 = ptRing(u, t1)
  return [proj(p1.x, p1.y, z), proj(p2.x, p2.y, z), proj(p2.x, p2.y, z - h), proj(p1.x, p1.y, z - h)]
}

// ---------- reparto de hinchas: CLÁSICO ROSARINO ----------
//
// El estadio está dividido en dos mitades a lo largo del eje Y (vista aérea):
//   - Lado IZQUIERDO (cos(ángulo) < 0): La Lepra (rojo y negro, Newell's).
//   - Lado DERECHO (cos(ángulo) > 0): Canalla (azul y amarillo, Rosario Central).
//
// Cada club primero llena las butacas LIBRES de su propia mitad, de abajo
// hacia arriba, sector por sector (orden de venta original). Si un club
// supera su mitad (tiene más hinchas que butacas libres de su lado), sus
// excedentes "invaden" el lado del otro, ocupando las butacas libres que
// quedaron del lado contrario.

// Para cada butaca, el "lado" (1 = Lepra, 2 = Canalla). Lo precalculamos
// usando el COSENO del ángulo central: cos > 0 → derecha en pantalla → Canalla,
// cos < 0 → izquierda en pantalla → La Lepra.
//
// La cancha se ve en pantalla con el LARGO en Y (vertical) y el ANCHO en X
// (horizontal) — el óvalo del estadio está parado, no acostado. Por eso
// dividir con cos(tm) (que separa las cabeceras este/oeste del espacio en
// izquierda/derecha de la pantalla) SÍ se ve como "medio y medio" clásico:
// La Lepra a la izquierda, Canalla a la derecha, divididos por una línea
// vertical al medio de la cancha.
//
// Las butacas justo en el eje (cos ≈ 0, sobre las cabeceras norte/sur) las
// repartimos por columna par/impar para que la división no deje una raya rara.
const SEAT_SIDE: number[] = seats.map((s) => {
  const dcol = TAU / NCOL
  const tm = s.col * dcol + dcol / 2
  const cosT = Math.cos(tm)
  if (cosT > 0.05) return 2 // Canalla (lado derecho en pantalla)
  if (cosT < -0.05) return 1 // Lepra (lado izquierdo en pantalla)
  return s.col % 2 === 0 ? 1 : 2
})

function allocate(clubs: ClubView[], capacity: number): (ClubView | null)[] {
  const out: (ClubView | null)[] = new Array(seats.length).fill(null)

  // Identificamos los 2 clubes del clásico por slug (con fallback por nombre).
  const lepra = clubs.find((c) => c.slug === 'lepra' || c.nombre.toLowerCase().includes('newell')) || null
  const canalla = clubs.find((c) => c.slug === 'canalla' || c.nombre.toLowerCase().includes('central')) || null

  // Fallback al allocator viejo si no encontramos ninguno del clásico.
  if (!lepra && !canalla) {
    const libres: number[] = []
    seats.forEach((s, i) => { if (!s.stair) libres.push(i) })
    let p = 0
    clubs.forEach((c) => {
      if (!c.count) return
      let n = Math.round((c.count / capacity) * libres.length)
      if (n < 1) n = 1
      if (p + n > libres.length) n = libres.length - p
      for (let k = 0; k < n; k++) out[libres[p++]] = c
    })
    return out
  }

  // Cuántas butacas pinta cada club (proporcional al count, mínimo 1 si > 0).
  const totalLibres = seats.filter((s) => !s.stair).length
  const calcN = (count: number): number => {
    if (!count) return 0
    const n = Math.round((count / capacity) * totalLibres)
    return Math.max(n, 1)
  }
  const nLepra = lepra ? calcN(lepra.count) : 0
  const nCanalla = canalla ? calcN(canalla.count) : 0

  const esLibre = (i: number) => !seats[i].stair && out[i] === null

  // Llena las butacas del `lado` con `club`, hasta `n`. Devuelve cuántas
  // faltaron (las que no entraron porque se acabó el lado).
  function llenarLado(lado: number, club: ClubView, n: number): number {
    let restantes = n
    for (let i = 0; i < seats.length && restantes > 0; i++) {
      if (SEAT_SIDE[i] === lado && esLibre(i)) {
        out[i] = club
        restantes--
      }
    }
    return restantes
  }

  // 1. Cada club llena su propia mitad.
  const restanLepra = lepra ? llenarLado(1, lepra, nLepra) : 0
  const restanCanalla = canalla ? llenarLado(2, canalla, nCanalla) : 0

  // 2. Si un club tiene excedentes, invade la otra mitad (solo butacas libres).
  if (restanLepra > 0 && lepra) {
    let restantes = restanLepra
    for (let i = 0; i < seats.length && restantes > 0; i++) {
      if (SEAT_SIDE[i] === 2 && esLibre(i)) { out[i] = lepra; restantes-- }
    }
  }
  if (restanCanalla > 0 && canalla) {
    let restantes = restanCanalla
    for (let i = 0; i < seats.length && restantes > 0; i++) {
      if (SEAT_SIDE[i] === 1 && esLibre(i)) { out[i] = canalla; restantes-- }
    }
  }

  return out
}

// ---------- cancha ----------
function drawPitch(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.translate(OX, OY)
  ctx.scale(S, S * SIN)

  ctx.beginPath()
  for (let k = 0; k <= 120; k++) {
    const q = ptRing(0, (k / 120) * TAU)
    if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y)
  }
  ctx.closePath()
  ctx.fillStyle = C_PERIM; ctx.fill()

  const hx = PW / 2, hy = PH / 2, franjas = 8, fw = PW / franjas
  for (let i = 0; i < franjas; i++) {
    ctx.fillStyle = i % 2 ? C_GRASS_A : C_GRASS_B
    ctx.fillRect(-hx + i * fw, -hy, fw + 0.4, PH)
  }

  ctx.strokeStyle = C_LINE
  ctx.lineWidth = 0.9
  ctx.strokeRect(-hx, -hy, PW, PH)
  ctx.beginPath(); ctx.moveTo(0, -hy); ctx.lineTo(0, hy); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(0, 0, 9.15, 9.15, 0, 0, TAU); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(0, 0, 1, 1, 0, 0, TAU); ctx.fillStyle = C_LINE; ctx.fill()
  ctx.strokeRect(-hx, -20.2, 16.5, 40.3)
  ctx.strokeRect(hx - 16.5, -20.2, 16.5, 40.3)
  ctx.strokeRect(-hx, -9.2, 5.5, 18.3)
  ctx.strokeRect(hx - 5.5, -9.2, 5.5, 18.3)
  ctx.restore()

  ;[-1, 1].forEach((s) => {
    const gx = s * PW / 2
    const a = proj(gx, -3.66, 0), b = proj(gx, 3.66, 0)
    const a2 = proj(gx, -3.66, 2.44), b2 = proj(gx, 3.66, 2.44)
    quad(ctx, [a, b, b2, a2], 'rgba(255,255,255,0.20)', C_GOAL, 1.3)
  })

  const corners: [number, number][] = [
    [-PW / 2, -PH / 2], [PW / 2, -PH / 2], [PW / 2, PH / 2], [-PW / 2, PH / 2],
  ]
  for (const [cx, cy] of corners) {
    const base = proj(cx, cy, 0), top = proj(cx, cy, 2.6)
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(base.sx, base.sy); ctx.lineTo(top.sx, top.sy); ctx.stroke()
    const w = 8, h = 6, x = top.sx, y = top.sy
    ctx.fillStyle = C_CELESTE; ctx.fillRect(x, y, w, h / 3)
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y + h / 3, w, h / 3)
    ctx.fillStyle = C_SOL; ctx.fillRect(x + w / 2 - 1, y + h / 3 + 0.7, 2, h / 3 - 1.4)
    ctx.fillStyle = C_CELESTE; ctx.fillRect(x, y + 2 * h / 3, w, h / 3)
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7; ctx.strokeRect(x, y, w, h)
  }
}

// ---------- fachada exterior ----------
function drawFacade(ctx: CanvasRenderingContext2D) {
  const N = 132
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * TAU, t1 = ((i + 1) / N) * TAU
    const th = (t0 + t1) / 2
    if (Math.sin(th) <= 0) continue
    const p1 = ptRing(uTotal, t0), p2 = ptRing(uTotal, t1)
    const top1 = proj(p1.x, p1.y, Z_TOP), top2 = proj(p2.x, p2.y, Z_TOP)
    const b1 = proj(p1.x, p1.y, FACADE_Z), b2 = proj(p2.x, p2.y, FACADE_Z)
    quad(ctx, [top1, top2, b2, b1], (i % 2) ? C_WALL : C_WALL_D, INK, 0.35)
    const z1 = proj(p1.x, p1.y, FACADE_Z + 6), z2 = proj(p2.x, p2.y, FACADE_Z + 6)
    quad(ctx, [z1, z2, b2, b1], C_WALL_B, null)
  }
  ctx.beginPath()
  for (let k = 0; k <= 160; k++) {
    const q = ptRing(uTotal, (k / 160) * TAU), r = proj(q.x, q.y, Z_TOP)
    if (k === 0) ctx.moveTo(r.sx, r.sy); else ctx.lineTo(r.sx, r.sy)
  }
  ctx.closePath(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke()

  const g0 = ptRing(uTotal, Math.PI / 2 - 0.075), g1 = ptRing(uTotal, Math.PI / 2 + 0.075)
  quad(ctx, [
    proj(g0.x, g0.y, FACADE_Z + 15), proj(g1.x, g1.y, FACADE_Z + 15),
    proj(g1.x, g1.y, FACADE_Z), proj(g0.x, g0.y, FACADE_Z),
  ], C_TUNNEL, INK, 1)
}

// ---------- render principal ----------
export function renderEstadio(canvas: HTMLCanvasElement, opts: { clubs: ClubView[]; capacity: number }): EstadioResult {
  const { clubs, capacity } = opts
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)
  canvas.width = WIDTH * dpr
  canvas.height = HEIGHT * dpr
  canvas.style.width = '100%'
  canvas.style.maxWidth = WIDTH + 'px'

  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, WIDTH, HEIGHT)

  const owners = allocate(clubs, capacity)

  const hit = document.createElement('canvas')
  hit.width = WIDTH; hit.height = HEIGHT
  const hctx = hit.getContext('2d', { willReadFrequently: true })!

  type Item =
    | { k: 'seat'; i: number; s: Seat; t0: number; t1: number; tm: number; d: number }
    | { k: 'walk'; b: Band; t0: number; t1: number; tm: number; d: number }
    | { k: 'pitch'; d: number }
    | { k: 'facade'; d: number }
  const items: Item[] = []
  const dcol = TAU / NCOL
  seats.forEach((s, i) => {
    const t0 = s.col * dcol, t1 = t0 + dcol, tm = t0 + dcol / 2
    const p = ptRing((s.u0 + s.u1) / 2, tm)
    items.push({ k: 'seat', i, s, t0, t1, tm, d: p.y * COS + s.z * SIN })
  })
  bands.forEach((b) => {
    if (b.kind !== 'walk') return
    const N = 132
    for (let j = 0; j < N; j++) {
      const t0 = (j / N) * TAU, t1 = ((j + 1) / N) * TAU, tm = (t0 + t1) / 2
      const p = ptRing((b.u0 + b.u1) / 2, tm)
      items.push({ k: 'walk', b, t0, t1, tm, d: p.y * COS + b.z * SIN })
    }
  })
  items.push({ k: 'pitch', d: 0 })
  items.push({ k: 'facade', d: B_OUT * COS + FACADE_Z * SIN })

  items.sort((p, q) => p.d - q.d)

  for (const it of items) {
    if (it.k === 'pitch') { drawPitch(ctx); continue }
    if (it.k === 'facade') { drawFacade(ctx); continue }

    if (it.k === 'walk') {
      const b = it.b
      if (Math.sin(it.tm) < 0) {
        quad(ctx, riserPts(b.u0, it.t0, it.t1, b.z, SALTO * 1.6), C_WALK_R, null)
      }
      quad(ctx, cellPts(b.u0, b.u1, it.t0, it.t1, b.z, false), C_WALK, null)
      continue
    }

    const s = it.s
    quad(ctx, cellPts(s.u0, s.u1, it.t0, it.t1, s.z, false), C_GAP, null)

    let top: string, side: string
    if (s.stair) {
      top = C_STAIR; side = C_STAIR_R
    } else {
      const club = owners[it.i]
      if (club) {
        // Patrón DAMERO: si el club tiene color2, alternamos entre el primario
        // y el secundario en patrón de tablero de ajedrez (damero). El patrón
        // es (row + col) % 2 == 0 → primario, == 1 → secundario. Así cada
        // butaca está rodeada de butacas del otro color, como un tablero.
        // Esto da el efecto "medio y medio" clásico de las tribunas argentinas:
        // La Lepra rojo/negro, El Canalla azul/amarillo.
        const primario = isHex(club.color) ? club.color : '#8a8a8a'
        const secundario = isHex(club.color2) ? club.color2! : null
        if (secundario) {
          // Damero: alternar primario/secundario por (row + col) par/impar.
          top = (s.row + s.col) % 2 === 0 ? primario : secundario
        } else {
          top = primario
        }
        side = shade(top, 0.62)
      } else {
        top = (s.row % 2) ? C_EMPTY : C_EMPTY_B
        side = shade(top, 0.7)
      }
    }
    if (Math.sin(it.tm) < 0) {
      quad(ctx, riserPts(s.u0, it.t0, it.t1, s.z, RISE + 1.1), side, null)
    }
    quad(ctx, cellPts(s.u0, s.u1, it.t0, it.t1, s.z, true), top, null)

    const id = it.i + 1
    hctx.fillStyle = 'rgb(' + ((id >> 16) & 255) + ',' + ((id >> 8) & 255) + ',' + (id & 255) + ')'
    const pts = cellPts(s.u0, s.u1, it.t0, it.t1, s.z, false)
    hctx.beginPath()
    hctx.moveTo(pts[0].sx, pts[0].sy)
    for (let m = 1; m < 4; m++) hctx.lineTo(pts[m].sx, pts[m].sy)
    hctx.closePath(); hctx.fill()
  }

  return {
    width: WIDTH,
    height: HEIGHT,
    totalCells: seats.length,
    clubAt: (cx: number, cy: number): ClubView | null => {
      if (cx < 0 || cy < 0 || cx >= WIDTH || cy >= HEIGHT) return null
      const d = hctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data
      const id = (d[0] << 16) | (d[1] << 8) | d[2]
      return id ? (owners[id - 1] || null) : null
    },
  }
}

export const TOTAL_CELLS = seats.length
export const ESTADIO_WIDTH = WIDTH
export const ESTADIO_HEIGHT = HEIGHT
