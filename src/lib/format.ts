// Utilidades de formato, igualadas al español argentino de lapopular.online.

export function nf(n: number): string {
  return (n || 0).toLocaleString('es-AR')
}

export function pf(n: number): string {
  return String(n).replace('.', ',') + '%'
}

export function hinchas(n: number): string {
  return nf(n) + (n === 1 ? ' hincha' : ' hinchas')
}

export function timeAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'recién'
  if (m < 60) return 'hace ' + m + ' min'
  const h = Math.round(m / 60)
  if (h < 24) return 'hace ' + h + ' h'
  return 'hace ' + Math.round(h / 24) + ' d'
}

export function isHex(h?: string | null): h is string {
  return typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h)
}

export function shade(hex: string, amt: number): string {
  if (!isHex(hex)) return '#666'
  const r = parseInt(hex.substr(1, 2), 16)
  const g = parseInt(hex.substr(3, 2), 16)
  const b = parseInt(hex.substr(5, 2), 16)
  return 'rgb(' + Math.round(r * amt) + ',' + Math.round(g * amt) + ',' + Math.round(b * amt) + ')'
}

// Elige un color legible para SWATCHES y porcentajes sobre fondo claro:
// si el club tiene un color principal demasiado claro (blanco, amarillo),
// usa el secundario. Igual que el colorLegible() de lapopular.
export function colorLegible(c: { color: string; color2?: string }): string {
  if (isHex(c.color2) && c.color2.toLowerCase() !== c.color.toLowerCase()) {
    // Si el primario es muy claro (luminancia alta) y el secundario es oscuro,
    // usamos el secundario para que se vea sobre el panel crema.
    if (lum(c.color) > 0.7 && lum(c.color2) < lum(c.color)) return c.color2
  }
  return c.color
}

function lum(hex: string): number {
  if (!isHex(hex)) return 0
  const r = parseInt(hex.substr(1, 2), 16) / 255
  const g = parseInt(hex.substr(3, 2), 16) / 255
  const b = parseInt(hex.substr(5, 2), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}
