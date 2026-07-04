// ── useTheme ──
// Preferencia de tema con 3 modos: 'system' (sigue al dispositivo), 'light'
// o 'dark'. Publica data-theme en <html> (para que styles.css seleccione la
// paleta) y guarda la elección en localStorage — excepto 'system', que se
// representa borrando la clave.
//
// Además, si el usuario cambia el tema del sistema operativo (Mac/iOS/Android)
// mientras la app está abierta, adopta ese modo al vuelo aunque tuvieras uno
// fijo. Con addListener de respaldo para Safari/iOS antiguos.
//
// Devuelve:
//  - themeMode: 'system' | 'light' | 'dark' (elección del usuario)
//  - themeAplicado: 'light' | 'dark' (resuelto contra el sistema)
//  - cyclearTema(): pasa al siguiente modo (system → light → dark → system)
//  - tituloTema: label accesible del botón

import { useEffect, useState } from 'react'
import { THEME_KEY, loadThemeMode } from '../lib/storage.js'

const systemPrefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches

const SIGUIENTE = { system: 'light', light: 'dark', dark: 'system' }

const TITULO = {
  system: 'Tema: automático (sigue tu dispositivo)',
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState(loadThemeMode)
  const [sysDark, setSysDark] = useState(systemPrefersDark)
  const themeAplicado = themeMode === 'system' ? (sysDark ? 'dark' : 'light') : themeMode

  useEffect(() => {
    document.documentElement.dataset.theme = themeAplicado
    if (themeMode === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, themeMode)
  }, [themeAplicado, themeMode])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      setSysDark(e.matches)
      setThemeMode('system')
    }
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  const cyclearTema = () => setThemeMode(SIGUIENTE[themeMode])
  const tituloTema = TITULO[themeMode]

  return { themeMode, themeAplicado, cyclearTema, tituloTema }
}
