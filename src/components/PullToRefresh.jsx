// Pull-to-refresh custom para PWA en iOS (Safari no expone el gesto nativo).
// Al jalar desde arriba con la lista en scroll top, aparece un indicador y
// al cruzar el umbral se dispara un refresh suave (re-consulta datos sin
// recargar la página, así no parpadea). El indicador ocupa altura real y
// empuja el contenido — no se encima.
//
// Optimización para iOS: durante el drag manipulamos el DOM directo con
// refs en vez de disparar setState en cada touchmove. En ProMotion iPhones
// touchmove va a 120Hz — un setState por evento = 120 renders/segundo, lo
// que se sentía "entrecortado" al re-renderizar el subtree por frame.
// Solo re-renderizamos en las transiciones importantes (arrancar/soltar,
// cruzar el umbral) y para el estado de refreshing.

import { useEffect, useRef, useState } from 'react'
import { haptic } from '../haptics.js'

const UMBRAL = 66
const MAX = 88
// Duración/curva de la animación de vuelta (soltó sin cruzar el umbral).
// Antes: 280ms `ease`. Ahora: 200ms con la curva de iOS del app design.
const VUELTA_MS = 200
const CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)'
// Mínimo que el spinner queda visible aunque la re-consulta sea instantánea.
// Antes 700ms se sentía pesado; 450ms alcanza para percibir feedback.
const SPINNER_MIN_MS = 450

export function PullToRefresh({ onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)
  // "listo" solo cambia el texto ("Jala..." vs "Suelta..."). Como bool basta
  // — no dispara re-render en cada touchmove como sí lo hacía `dist`.
  const [listo, setListo] = useState(false)

  // Estado del gesto — todo en refs para no re-renderizar en cada frame.
  const startY = useRef(null)
  const distRef = useRef(0)
  const refreshingRef = useRef(false)
  const listoRef = useRef(false)
  const cruzadoRef = useRef(false)

  // Refs a nodos para tocar estilo directo sin pasar por React.
  const wrapperRef = useRef(null)
  const innerRef = useRef(null)
  const svgRef = useRef(null)

  // Aplica un valor de "dist" al DOM sin React. Height + opacity del indicador
  // + rotación del spinner mientras se jala.
  const pintarDist = (d) => {
    distRef.current = d
    const w = wrapperRef.current
    if (w) w.style.height = `${d}px`
    if (innerRef.current) innerRef.current.style.opacity = String(Math.min(d / UMBRAL, 1))
    if (svgRef.current && !refreshingRef.current) {
      svgRef.current.style.transform = `rotate(${d * 3}deg)`
    }
    const nowListo = d >= UMBRAL
    if (nowListo !== listoRef.current) {
      listoRef.current = nowListo
      setListo(nowListo)
      if (nowListo) haptic.medium()
    }
  }

  useEffect(() => {
    const w = wrapperRef.current
    // Durante el drag, sin transición (el height sigue al dedo).
    if (w) w.style.transition = 'none'

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
        if (distRef.current) pintarDist(0)
        startY.current = null
        return
      }
      const d = Math.min(dy * 0.5, MAX) // resistencia elástica
      pintarDist(d)
      if (d > 4 && e.cancelable) e.preventDefault() // frena el scroll mientras se jala
    }

    const onEnd = () => {
      if (startY.current == null) return
      startY.current = null
      const finalDist = distRef.current

      if (finalDist >= UMBRAL) {
        // Cruzó → arranca refresh. Height se queda en UMBRAL con transición
        // corta desde donde estaba (usualmente iguales, cambio imperceptible).
        refreshingRef.current = true
        setRefreshing(true)
        if (w) {
          w.style.transition = `height ${VUELTA_MS}ms ${CURVA}`
          w.style.height = `${UMBRAL}px`
        }
        distRef.current = UMBRAL

        const minimo = new Promise((r) => setTimeout(r, SPINNER_MIN_MS))
        Promise.all([Promise.resolve(onRefresh?.()), minimo]).finally(() => {
          refreshingRef.current = false
          setRefreshing(false)
          if (w) {
            w.style.transition = `height ${VUELTA_MS}ms ${CURVA}`
            w.style.height = '0px'
          }
          distRef.current = 0
          listoRef.current = false
          setListo(false)
          haptic.success()
        })
      } else {
        // No cruzó → vuelta al 0 con transición corta.
        if (w) {
          w.style.transition = `height ${VUELTA_MS}ms ${CURVA}`
          w.style.height = '0px'
        }
        distRef.current = 0
        listoRef.current = false
        setListo(false)
        // Restaurar 'none' tras terminar la vuelta para el siguiente drag.
        setTimeout(() => {
          if (w && !refreshingRef.current && distRef.current === 0) {
            w.style.transition = 'none'
          }
        }, VUELTA_MS + 20)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh])

  return (
    <div
      ref={wrapperRef}
      className="ptr"
      style={{ height: refreshing ? UMBRAL : 0, willChange: 'height' }}
      aria-hidden={!refreshing}
    >
      <div ref={innerRef} className="ptr-inner">
        <span className={`ptr-spinner${refreshing ? ' spinning' : ''}`}>
          <svg
            ref={svgRef}
            viewBox="0 0 24 24"
            width="19"
            height="19"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
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
