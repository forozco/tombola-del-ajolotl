// ── useScrollPorRuta ──
// Recuerda la posición de scroll por ruta y la restaura al volver a la
// pestaña, al usar back/forward o al refrescar. Una ruta nunca visitada
// arranca arriba (los elementos siempre quedan a la vista al entrar).
//
// Se guarda en sessionStorage (no localStorage) porque la posición de scroll
// solo tiene sentido dentro de la misma sesión de navegación. El guardado es
// continuo pero barato: listener passive + throttle con requestAnimationFrame.

import { useEffect, useLayoutEffect, useRef } from 'react'

const SCROLL_KEY = 'tombola-ajolotl-scroll-v1'

function leerPosiciones() {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY)) ?? {}
  } catch {
    return {}
  }
}

function guardarPosicion(ruta, y) {
  try {
    const all = leerPosiciones()
    all[ruta] = y
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(all))
  } catch {
    // sessionStorage lleno o bloqueado (modo privado): sin memoria de scroll
  }
}

export function useScrollPorRuta(rutaKey) {
  const rutaActual = useRef(rutaKey)

  useEffect(() => {
    // El navegador no debe pelear con nuestra restauración manual al recargar.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        guardarPosicion(rutaActual.current, window.scrollY)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Antes del paint (sin parpadeo): actualiza la ruta activa y restaura su
  // scroll guardado. Corre también al montar, que es lo que cubre el refresh.
  useLayoutEffect(() => {
    rutaActual.current = rutaKey
    window.scrollTo(0, leerPosiciones()[rutaKey] ?? 0)
  }, [rutaKey])
}
