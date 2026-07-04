// ── useLive ──
// Sondea ESPN (o la simulación si ?simular) y expone el estado en vivo de los
// partidos. Detecta goles nuevos comparando contra el sondeo anterior; al
// caer uno, dispara vibración y parpadea el título de la pestaña.
//
// Cadencia adaptativa:
//  - Partido en curso: cada 10s (los goles caen casi al instante).
//  - Partido a punto de arrancar (<30 min) o recién terminado: cada 30s.
//  - Día tranquilo: cada 3 min.
// Al volver a la pestaña (focus / visibilitychange) hace un sondeo inmediato.

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLive } from '../live.js'
import { simLive } from '../simulacion.js'
import { TEAMS } from '../data.js'
import { ES_SIM } from '../lib/modes.js'
import { haptic } from '../haptics.js'

function pollDelay(data) {
  const events = Object.values(data)
  if (events.some((e) => e.state === 'in')) return 10_000
  const ahora = Date.now()
  const cerca = events.some((e) => {
    const kickoff = new Date(e.utc).getTime()
    return e.state === 'pre' && kickoff - ahora < 30 * 60_000 && kickoff - ahora > 0
  })
  if (cerca) return 30_000
  return 180_000
}

// Estado de módulo: título original y timer para restaurarlo. Vive fuera del
// hook porque el título es una propiedad global del documento y no debe
// reiniciarse en cada render/desmonte del hook.
const TITULO_ORIGINAL = document.title
let tituloTimer

function avisoDeGol(teamId, ev) {
  haptic.goal()
  const ids = Object.keys(ev.score)
  const marcador = `${ev.score[ids[0]]}-${ev.score[ids[1]]}`
  document.title = `⚽ ¡GOOOL de ${TEAMS[teamId].name}! ${marcador}`
  clearTimeout(tituloTimer)
  tituloTimer = setTimeout(() => {
    document.title = TITULO_ORIGINAL
  }, 15_000)
}

export function useLive() {
  const [live, setLive] = useState({})
  const prevRef = useRef({})
  const pollRef = useRef(null)

  useEffect(() => {
    let timer
    let active = true

    const poll = async () => {
      clearTimeout(timer)
      try {
        const data = ES_SIM ? simLive() : await fetchLive()
        if (!active) return
        // Detecta goles nuevos comparando marcador previo vs actual.
        for (const [pair, ev] of Object.entries(data)) {
          const antes = prevRef.current[pair]
          if (!antes || ev.state !== 'in') continue
          for (const id of Object.keys(ev.score)) {
            if (Number(ev.score[id]) > Number(antes.score?.[id] ?? 0)) avisoDeGol(id, ev)
          }
        }
        prevRef.current = data
        setLive(data)
        timer = setTimeout(poll, ES_SIM ? 1_000 : pollDelay(data))
      } catch {
        if (active) timer = setTimeout(poll, 30_000)
      }
    }

    pollRef.current = poll
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    poll()

    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  // Sondeo manual (usado por pull-to-refresh). Devuelve la Promise del poll
  // para que el llamador pueda esperar el fin.
  const refetch = useCallback(() => Promise.resolve(pollRef.current?.()), [])

  return { live, refetch }
}
