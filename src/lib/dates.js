// ── Utilidades de fecha/hora ──
// Todos los horarios de la app se muestran en la zona local del dispositivo
// a partir de timestamps UTC de la data. La jornada de "Hoy" tiene su propia
// regla (jornadaHoy) para no saltar de golpe a medianoche.

import { AHORA } from './modes.js'

const pad = (n) => String(n).padStart(2, '0')

// Fecha local en formato YYYY-MM-DD (útil para comparar contra match.date).
export function todayStr(ms = AHORA()) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localDateStr(utc) {
  return todayStr(new Date(utc).getTime())
}

export function localTimeStr(utc) {
  return new Date(utc).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fechaLarga(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function fechaCorta(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// La jornada que se muestra en "Hoy": se activa 2h antes del primer partido
// y la activa es la más reciente que ya entró. Así los partidos siguen
// visibles toda la jornada y hasta ~2h antes del primer del día siguiente
// (no desaparecen de golpe a medianoche). Zona-agnóstico: cada día se agrupa
// por la hora local del dispositivo y el margen se compara contra UTC.
const ROLLOVER_MS = 2 * 3_600_000

export function jornadaHoy(matches, ahora) {
  const dias = [...new Set(matches.map((m) => m.date))].sort()
  const inicioDe = (d) =>
    Math.min(...matches.filter((m) => m.date === d).map((m) => new Date(m.utc).getTime()))
  let activa = dias[0]
  for (const d of dias) {
    if (inicioDe(d) - ahora <= ROLLOVER_MS) activa = d
    else break
  }
  return activa
}

// Abreviatura de la zona horaria del dispositivo (p. ej. "GMT-6"). Se muestra
// en el footer para dejar claro que los horarios son locales de cada quien.
export function zonaHoraria() {
  try {
    const parts = new Intl.DateTimeFormat('es-MX', {
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}
