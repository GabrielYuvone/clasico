'use client'

import { useEffect, useRef } from 'react'
import { renderEstadio, type ClubView, type EstadioResult } from '@/lib/stadium/estadio'

type Props = {
  clubs: ClubView[]
  capacity: number
  onSelectClub?: (c: ClubView) => void
}

export default function Stadium({ clubs, capacity, onSelectClub }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<EstadioResult | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    viewRef.current = renderEstadio(canvas, { clubs, capacity })

    function onClick(ev: MouseEvent) {
      if (!onSelectClub) return
      const r = canvas.getBoundingClientRect()
      const k = viewRef.current!.width / r.width
      const c = viewRef.current!.clubAt((ev.clientX - r.left) * k, (ev.clientY - r.top) * k)
      if (c) onSelectClub(c)
    }
    function onMove(ev: MouseEvent) {
      const r = canvas.getBoundingClientRect()
      const k = viewRef.current!.width / r.width
      const c = viewRef.current!.clubAt((ev.clientX - r.left) * k, (ev.clientY - r.top) * k)
      canvas.title = c
        ? c.nombre + (c.apodo ? ' — ' + c.apodo : '') + '\n' + c.count.toLocaleString('es-AR') + (c.count === 1 ? ' hincha' : ' hinchas')
        : ''
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mousemove', onMove)
    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousemove', onMove)
    }
  }, [clubs, capacity, onSelectClub])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-auto cursor-pointer rounded-md"
      aria-label="Estadio visto desde arriba, tribunas pintadas con los colores de cada club"
    />
  )
}
