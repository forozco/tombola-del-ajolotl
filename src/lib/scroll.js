// Animación custom de scroll horizontal con ease-out cubic. En iOS, el
// `scrollTo({ behavior: 'smooth' })` nativo es lento (~600ms) y compite
// con otras animaciones del sistema — se ve pesado. Con rAF controlamos
// duración (320ms se siente natural sin arrastrar), curva (arranque
// rápido, frenado suave) y cancelación limpia.
//
// Devuelve un cancel() para abortar la animación si se dispara otra
// antes de que termine.

export function scrollHorizontalSuave(el, targetLeft, duration = 320) {
  const start = el.scrollLeft
  const delta = targetLeft - start
  if (Math.abs(delta) < 2) return () => {}
  const t0 = performance.now()
  let raf = 0
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration)
    el.scrollLeft = start + delta * ease(p)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
