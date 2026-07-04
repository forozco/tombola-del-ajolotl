// ── Modos de la app ──
// Se resuelven una vez al cargar (no reaccionan a cambios de URL en runtime).
//  - ?admin: puerta de emergencia para corregir un resultado a mano.
//  - ?simular: recorre un torneo ficticio en ~4 min sin tocar Supabase.

import { simNow } from '../simulacion.js'

const params = new URLSearchParams(window.location.search)

export const ES_ADMIN = params.has('admin')
export const ES_SIM = params.has('simular')

// El "ahora" de la app: reloj real, o reloj virtual del demo (los días del
// calendario avanzan conforme corre la simulación).
export const AHORA = () => (ES_SIM ? simNow() : Date.now())
