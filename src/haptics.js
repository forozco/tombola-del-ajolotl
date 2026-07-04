// ── Retroalimentación háptica (vibración) ──
// Patrones cortos usados en toques de navegación y confirmaciones. Filosofía:
// nunca vibrar más de 30ms para taps (sería intrusivo) y reservar la vibración
// larga para eventos importantes (gol).
//
// Soporte:
//  - Android Chrome/Firefox: SÍ (usa el motor de vibración del teléfono)
//  - iOS Safari / PWA: NO — Apple no expone Web Vibration API. Esto degrada
//    silenciosamente (navigator.vibrate no existe) sin romper nada.
//  - Se respeta prefers-reduced-motion.

const hayApi = () => typeof navigator !== 'undefined' && 'vibrate' in navigator

const permitido = () => {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

const vibrar = (patron) => {
  if (hayApi() && permitido()) navigator.vibrate(patron)
}

export const haptic = {
  soft: () => vibrar(10), // tap de navegación (tab, toggle, chevron)
  medium: () => vibrar(20), // cruzar un umbral (pull-to-refresh listo)
  success: () => vibrar([15, 30, 15]), // acción confirmada (refresh terminó)
  goal: () => vibrar([200, 100, 200]), // ¡GOL! (ya existía en avisoDeGol)
}
