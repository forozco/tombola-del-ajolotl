// ── Composition root de la app ──
// Su única responsabilidad es ensamblar: instancia los hooks de datos (results
// live, tema), calcula el bracket derivado y renderiza los componentes en el
// orden correcto. Toda la lógica de negocio vive en `lib/`, la de React en
// `hooks/`, y la presentación en `components/`. Este archivo no debería crecer
// mucho más allá de esto.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { computeBracket } from './lib/bracket.js'
import { marcadorTexto, detalleDe } from './lib/matches.js'
import { useResults } from './hooks/useResults.js'
import { useLive } from './hooks/useLive.js'
import { useTheme } from './hooks/useTheme.js'
import { useRuta, rutaDe } from './hooks/useRuta.js'
import { useScrollPorRuta } from './hooks/useScrollPorRuta.js'
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
import { Creditos } from './components/Creditos.jsx'
import { ES_CREDITOS } from './lib/modes.js'

export default function App() {
  const { results, detalles, applyLive, pick, refetch } = useResults()
  const { live, refetch: refetchLive } = useLive()
  const { themeMode, cyclearTema, tituloTema } = useTheme()

  // Pestaña y vista viven en la URL (/, /camino, /camino/lista, /amigos):
  // un refresh o un link compartido caen en la misma vista. El scroll se
  // recuerda por ruta y se restaura al volver o recargar.
  const { tab, vista, setTab, setVista } = useRuta()
  useScrollPorRuta(rutaDe(tab, vista))

  // Publica la pestaña en <html> para que el CSS pueda ajustar el ticker /
  // latido según qué esté visible (ver styles.css > .live-ticker). El modo
  // Street Fighter (data-sf) retematiza TODA la app vía variables CSS.
  const esSF = (t, v) => t === 'llaves' && v === 'sf'
  useEffect(() => {
    document.documentElement.dataset.tab = tab
    if (esSF(tab, vista)) document.documentElement.dataset.sf = '1'
    else delete document.documentElement.dataset.sf
  }, [tab, vista])

  // Entrar o salir del modo Street Fighter cruza con un fundido de página
  // completa (View Transitions API). flushSync obliga a React a pintar el
  // nuevo estado dentro del snapshot de la transición; sin soporte del
  // navegador, cambia directo sin drama.
  const conFundido = useCallback((fn, cambiaModo) => {
    if (cambiaModo && document.startViewTransition) {
      document.startViewTransition(() => flushSync(fn))
    } else {
      fn()
    }
  }, [])
  const cambiarTab = useCallback(
    (t) => conFundido(() => setTab(t), esSF(t, vista) !== esSF(tab, vista)),
    [conFundido, setTab, tab, vista]
  )
  const cambiarVista = useCallback(
    (v) => conFundido(() => setVista(v), esSF(tab, v) !== esSF(tab, vista)),
    [conFundido, setVista, tab, vista]
  )

  // Estado derivado que casi todos los componentes reciben. useMemo evita
  // recomputar cuando ninguna de sus 3 fuentes cambia.
  const bracket = useMemo(
    () => computeBracket(results, live, detalles),
    [results, live, detalles]
  )
  const enVivoCount = bracket.resolved.filter((m) => m.live?.state === 'in').length

  // Página de créditos: se muestra automáticamente cuando ya pasó la ventana
  // "3h después de que terminó la final" (~5h post-kickoff, que cubre el
  // partido completo con ET+pens + 3h de grace). Antes de ese momento solo
  // se abre vía ?creditos (para preview) o desde el link del footer.
  //
  // Persistencia: la dismissión es solo de sesión. Al recargar, si ya pasó
  // el threshold, vuelve a abrirse — el usuario dijo "que quede permanente
  // después del final", así el archivo del torneo queda detrás pero la
  // página principal ES la de créditos.
  //
  // Threshold: kickoff de la final (2026-07-19T19:00Z) + 5h. Cubre 90 min
  // + medio tiempo + tiempo extra + penales + margen de celebración.
  const CREDITOS_AT_MS = new Date('2026-07-20T00:00:00Z').getTime()
  const yaEsPostFinal = () => Date.now() >= CREDITOS_AT_MS
  const [creditosAbierto, setCreditosAbierto] = useState(
    () => ES_CREDITOS || yaEsPostFinal()
  )

  // Si el usuario está mirando la app cuando cruza el threshold, la página
  // aparece sola sin necesidad de recargar. Chequeo cada 60s (cheap).
  useEffect(() => {
    if (creditosAbierto) return undefined
    const id = setInterval(() => {
      if (yaEsPostFinal()) setCreditosAbierto(true)
    }, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditosAbierto])

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

  // Contador que se bumpéa en cada pull-to-refresh. Las vistas del bracket
  // (Cuadro y Street Fighter) lo leen como dep de su useEffect de scroll
  // horizontal, así al hacer pull-to-refresh vuelven a anclar en la ronda
  // activa aunque el usuario se haya movido con el dedo.
  const [refreshTick, setRefreshTick] = useState(0)

  // Refresh del pull-to-refresh: re-consulta ambas fuentes sin recargar la
  // página (nada de parpadeo) y de paso verifica si hay una versión nueva
  // del service worker. El bump de refreshTick va al FINAL, después del
  // refetch — así la animación del bracket no compite con el rubber-band
  // de iOS mientras el gesto todavía está terminando.
  //
  // El chequeo del SW es fire-and-forget: `reg.update()` hace un fetch al
  // servidor por el SW y puede tardar 100-500ms según red — awaitearlo
  // extendía la duración percibida del pull-to-refresh sin dar feedback
  // al usuario. La detección de nueva versión sigue funcionando (dispara
  // el banner de "Actualización disponible") solo que sin bloquear.
  const onRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchLive()])
    setRefreshTick((t) => t + 1)
    navigator.serviceWorker
      ?.getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {})
  }, [refetch, refetchLive])

  // Handler del ticker: cambia a la pestaña Hoy y hace scroll a la card del
  // partido. Se usa setTimeout mínimo para dejar que Hoy monte antes.
  const scrollToMatch = (m) => {
    cambiarTab('hoy')
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
      <TabBar tab={tab} setTab={cambiarTab} />
      <LiveTicker bracket={bracket} onVer={scrollToMatch} />

      {/* key={tab} fuerza remount del contenido al cambiar de pestaña, que
          dispara la animación de entrada definida en styles.css. */}
      <div className="tab-content" key={tab}>
        {tab === 'hoy' && <Hoy bracket={bracket} onPick={pick} />}
        {tab === 'llaves' && (
          <Llaves
            bracket={bracket}
            vista={vista}
            setVista={cambiarVista}
            onPick={pick}
            refreshTick={refreshTick}
          />
        )}
        {tab === 'amigos' && <Amigos bracket={bracket} />}
      </div>

      <Footer />

      {creditosAbierto ? <Creditos bracket={bracket} /> : null}
    </div>
  )
}
