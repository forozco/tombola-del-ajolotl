// ── useRuta ──
// Rutas de la SPA con la History API, sin dependencias nuevas:
//   /              → pestaña Hoy
//   /camino        → El Camino, vista cuadro (Bracket)
//   /camino/lista  → El Camino, vista lista
//   /amigos        → Coonstl
//
// La URL es la fuente de verdad: un refresh o un link compartido cae en la
// misma pestaña/vista. Cambiar de pestaña hace pushState (back/forward del
// navegador navegan entre pestañas); el toggle cuadro/lista hace replaceState
// para no llenar el historial con cada toque del segmentado.
//
// Devuelve la misma forma que tenían los useState de App:
//   { tab, vista, setTab, setVista }

import { useCallback, useEffect, useRef, useState } from 'react'

const TITULOS = { hoy: 'Hoy', llaves: 'El Camino', amigos: 'Coonstl' }

export function parseRuta(pathname) {
  if (pathname.startsWith('/camino')) {
    return { tab: 'llaves', vista: pathname.includes('/lista') ? 'lista' : 'cuadro' }
  }
  if (pathname.startsWith('/amigos')) return { tab: 'amigos', vista: 'cuadro' }
  return { tab: 'hoy', vista: 'cuadro' }
}

export function rutaDe(tab, vista) {
  if (tab === 'llaves') return vista === 'lista' ? '/camino/lista' : '/camino'
  if (tab === 'amigos') return '/amigos'
  return '/'
}

export function useRuta() {
  const [ruta, setRuta] = useState(() => parseRuta(window.location.pathname))
  // Última vista elegida en El Camino: al salir a otra pestaña y volver, se
  // conserva sin ensuciar la URL de las demás pestañas.
  const vistaMem = useRef(ruta.vista)

  // Normaliza rutas desconocidas (p. ej. /hoy o typos) a su forma canónica
  // sin agregar entrada al historial.
  useEffect(() => {
    const canonica = rutaDe(ruta.tab, ruta.vista)
    if (canonica !== window.location.pathname) {
      window.history.replaceState(null, '', canonica)
    }
    // Solo al montar: después la URL se mantiene en sync en los setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Back/forward del navegador (y gesto de swipe en desktop).
  useEffect(() => {
    const onPop = () => {
      const next = parseRuta(window.location.pathname)
      if (next.tab === 'llaves') vistaMem.current = next.vista
      setRuta(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Título del documento por pestaña (tabs del navegador / historial).
  useEffect(() => {
    document.title = `Tómbola del Ajolotl · ${TITULOS[ruta.tab]}`
  }, [ruta.tab])

  const setTab = useCallback((tab) => {
    const actual = parseRuta(window.location.pathname)
    if (actual.tab === tab) return
    const next = { tab, vista: vistaMem.current }
    window.history.pushState(null, '', rutaDe(next.tab, next.vista))
    setRuta(next)
  }, [])

  const setVista = useCallback((vista) => {
    const actual = parseRuta(window.location.pathname)
    if (actual.vista === vista) return
    vistaMem.current = vista
    const next = { tab: actual.tab, vista }
    window.history.replaceState(null, '', rutaDe(next.tab, next.vista))
    setRuta(next)
  }, [])

  return { tab: ruta.tab, vista: ruta.vista, setTab, setVista }
}
