// Pull-to-refresh custom para PWA en iOS (Safari no expone el gesto nativo).
// Al jalar desde arriba con la lista en scroll top, aparece un indicador y
// al cruzar el umbral se dispara un refresh suave (re-consulta datos sin
// recargar la página, así no parpadea). El indicador ocupa altura real y
// empuja el contenido — no se encima.

import { useEffect, useRef, useState } from 'react'
import { haptic } from '../haptics.js'

const UMBRAL = 66
const MAX = 88

export function PullToRefresh({ onRefresh }) {
  const [dist, setDist] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const distRef = useRef(0)
  const refreshingRef = useRef(false)
  // Recuerda si ya cruzaste el umbral en este arrastre para vibrar solo al
  // PASAR por primera vez (mimic del "tick" nativo de iOS), no cada frame.
  const cruzadoRef = useRef(false)

  useEffect(() => {
    const onStart = (e) => {
      startY.current =
        window.scrollY <= 0 && e.touches.length === 1 && !refreshingRef.current
          ? e.touches[0].clientY
          : null
      cruzadoRef.current = false
    }
    const onMove = (e) => {
      if (startY.current == null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0 || window.scrollY > 0) {
        startY.current = null
        if (distRef.current) {
          distRef.current = 0
          setDist(0)
          setDragging(false)
        }
        return
      }
      setDragging(true)
      const d = Math.min(dy * 0.5, MAX) // resistencia elástica
      distRef.current = d
      setDist(d)
      if (d >= UMBRAL && !cruzadoRef.current) {
        cruzadoRef.current = true
        haptic.medium()
      } else if (d < UMBRAL) {
        cruzadoRef.current = false
      }
      if (d > 4 && e.cancelable) e.preventDefault() // frena el scroll mientras se jala
    }
    const onEnd = () => {
      if (startY.current == null) return
      startY.current = null
      setDragging(false)
      if (distRef.current >= UMBRAL) {
        refreshingRef.current = true
        setRefreshing(true)
        setDist(UMBRAL)
        // Mínimo 700ms de spinner para que el usuario sienta que "pasó algo"
        // incluso si la re-consulta devuelve instantánea.
        const minimo = new Promise((r) => setTimeout(r, 700))
        Promise.all([Promise.resolve(onRefresh?.()), minimo]).finally(() => {
          refreshingRef.current = false
          setRefreshing(false)
          distRef.current = 0
          setDist(0)
          haptic.success()
        })
      } else {
        distRef.current = 0
        setDist(0)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh])

  const alto = refreshing ? UMBRAL : dist
  const listo = dist >= UMBRAL
  return (
    <div
      className="ptr"
      style={{ height: alto, transition: dragging ? 'none' : 'height 0.28s ease' }}
      aria-hidden={alto === 0}
    >
      <div className="ptr-inner" style={{ opacity: Math.min(dist / UMBRAL, 1) }}>
        <span className={`ptr-spinner${refreshing ? ' spinning' : ''}`}>
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: refreshing ? undefined : `rotate(${dist * 3}deg)` }}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
        <span className="ptr-text">
          {refreshing ? 'Actualizando…' : listo ? 'Suelta para actualizar' : 'Jala para actualizar'}
        </span>
      </div>
    </div>
  )
}
