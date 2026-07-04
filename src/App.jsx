// ── Composition root de la app ──
// Su única responsabilidad es ensamblar: instancia los hooks de datos (results
// live, tema), calcula el bracket derivado y renderiza los componentes en el
// orden correcto. Toda la lógica de negocio vive en `lib/`, la de React en
// `hooks/`, y la presentación en `components/`. Este archivo no debería crecer
// mucho más allá de esto.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeBracket } from './lib/bracket.js'
import { marcadorTexto, detalleDe } from './lib/matches.js'
import { useResults } from './hooks/useResults.js'
import { useLive } from './hooks/useLive.js'
import { useTheme } from './hooks/useTheme.js'
import { ActualizacionDisponible } from './components/ActualizacionDisponible.jsx'
import { PullToRefresh } from './components/PullToRefresh.jsx'
import { Header } from './components/Header.jsx'
import { ChampionBanner } from './components/ChampionBanner.jsx'
import { TabBar } from './components/TabBar.jsx'
import { LiveTicker } from './components/LiveTicker.jsx'
import { Hoy } from './components/Hoy.jsx'
import { Llaves } from './components/Llaves.jsx'
import { Amigos } from './components/Amigos.jsx'
import { Footer } from './components/Footer.jsx'

export default function App() {
  const { results, detalles, applyLive, pick, refetch } = useResults()
  const { live, refetch: refetchLive } = useLive()
  const { themeMode, cyclearTema, tituloTema } = useTheme()

  const [tab, setTab] = useState('hoy')
  const [vista, setVista] = useState('cuadro')

  // Publica la pestaña en <html> para que el CSS pueda ajustar el ticker /
  // latido según qué esté visible (ver styles.css > .live-ticker).
  useEffect(() => {
    document.documentElement.dataset.tab = tab
  }, [tab])

  // Estado derivado que casi todos los componentes reciben. useMemo evita
  // recomputar cuando ninguna de sus 3 fuentes cambia.
  const bracket = useMemo(
    () => computeBracket(results, live, detalles),
    [results, live, detalles]
  )
  const enVivoCount = bracket.resolved.filter((m) => m.live?.state === 'in').length

  // Al detectar que un partido terminó (ESPN dice 'post' con ganador), se
  // registra automáticamente ganador + marcador + snapshot con goles. Se
  // ejecuta solo cuando cambia el bracket — el propio applyLive evita
  // rerenders si no hay cambio real de estado.
  useEffect(() => {
    for (const m of bracket.resolved) {
      const evEnVivo = m.live && m.live !== detalles[m.id]
      if (evEnVivo && m.live.state === 'post' && m.live.winnerId) {
        const faltanGoles = (detalles[m.id]?.goals?.length ?? 0) < (m.live.goals?.length ?? 0)
        if (results[m.id] !== m.live.winnerId || faltanGoles) {
          applyLive(m.id, m.live.winnerId, marcadorTexto(m), detalleDe(m))
        }
      }
    }
  }, [bracket, applyLive])

  // Refresh del pull-to-refresh: re-consulta ambas fuentes sin recargar la
  // página (nada de parpadeo) y de paso verifica si hay una versión nueva
  // del service worker.
  const onRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchLive()])
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      await reg?.update()
    } catch {
      // sin service worker o sin permiso: no pasa nada
    }
  }, [refetch, refetchLive])

  // Handler del ticker: cambia a la pestaña Hoy y hace scroll a la card del
  // partido. Se usa setTimeout mínimo para dejar que Hoy monte antes.
  const scrollToMatch = (m) => {
    setTab('hoy')
    setTimeout(() => {
      document
        .getElementById(`match-${m.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }

  return (
    <div className="app">
      <PullToRefresh onRefresh={onRefresh} />
      <ActualizacionDisponible />
      <Header
        enVivoCount={enVivoCount}
        themeMode={themeMode}
        cyclearTema={cyclearTema}
        tituloTema={tituloTema}
      />
      <ChampionBanner championTeamId={bracket.champion} />
      <TabBar tab={tab} setTab={setTab} />
      <LiveTicker bracket={bracket} onVer={scrollToMatch} />

      {/* key={tab} fuerza remount del contenido al cambiar de pestaña, que
          dispara la animación de entrada definida en styles.css. */}
      <div className="tab-content" key={tab}>
        {tab === 'hoy' && <Hoy bracket={bracket} onPick={pick} />}
        {tab === 'llaves' && (
          <Llaves bracket={bracket} vista={vista} setVista={setVista} onPick={pick} />
        )}
        {tab === 'amigos' && <Amigos bracket={bracket} />}
      </div>

      <Footer />
    </div>
  )
}
