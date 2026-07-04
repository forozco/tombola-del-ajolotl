// ── Función serverless: detecta eventos del Mundial y envía Web Push ──
// Pensada para correr cada minuto durante los partidos, disparada por un
// cron (Vercel Cron en plan Pro con CRON_SECRET, o un cron externo tipo
// cron-job.org pegándole a /api/notify?secret=NOTIFY_SECRET).
//
// Flujo por corrida:
//   1. Trae el scoreboard de ESPN (reutiliza fetchLive de src/live.js).
//   2. Lo compara contra el snapshot de la corrida anterior (tabla
//      notify_state en Supabase) y arma los avisos: arrancó / gol / final.
//   3. Si hay avisos, los manda por Web Push a todas las suscripciones de
//      la tabla push_subs; las que ya murieron (404/410) se purgan.
//
// La primera corrida (sin snapshot previo) solo guarda estado, sin avisar:
// evita spamear con todo lo que ya pasó.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { fetchLive } from '../src/live.js'
import { TEAMS } from '../src/data.js'

const nombre = (id) => TEAMS[id]?.name ?? id ?? '—'

// key es el pairKey de live.js: 'can|mar' (ids ordenados alfabéticamente)
function marcador(key, ev) {
  const [a, b] = key.split('|')
  return `${nombre(a)} ${ev.score?.[a] ?? 0}–${ev.score?.[b] ?? 0} ${nombre(b)}`
}

function avisosDe(prev, live) {
  const avisos = []
  for (const [key, ev] of Object.entries(live)) {
    const antes = prev[key]
    // Partido que no habíamos visto: se registra en el snapshot pero no se
    // avisa nada (puede venir ya empezado si el cron estuvo caído).
    if (!antes) continue
    const [a, b] = key.split('|')

    if (antes.state === 'pre' && ev.state === 'in') {
      avisos.push({
        title: '🟢 Arrancó el partido',
        body: `${nombre(a)} vs ${nombre(b)} ya se está jugando`,
        tag: key,
      })
    }

    const golesAhora = ev.goals?.length ?? 0
    if (ev.state !== 'pre' && golesAhora > (antes.goals ?? 0)) {
      const gol = ev.goals[golesAhora - 1]
      const quien = gol.ownGoal
        ? `Autogol a favor de ${nombre(gol.teamId)}`
        : `Gol de ${nombre(gol.teamId)}`
      avisos.push({
        title: `⚽ ${quien}`,
        body: `${marcador(key, ev)} · ${gol.minute} ${gol.player}`,
        tag: key,
      })
    }

    if (antes.state !== 'post' && ev.state === 'post') {
      const extra =
        ev.finish === 'pens'
          ? ` · penales ${ev.shootout?.[a] ?? '?'}–${ev.shootout?.[b] ?? '?'}`
          : ev.finish === 'aet'
            ? ' · tiempo extra'
            : ''
      avisos.push({
        title: '🏁 Final',
        body: `${marcador(key, ev)}${extra}`,
        tag: key,
      })
    }
  }
  return avisos
}

export default async function handler(req, res) {
  // Acepta el Bearer que manda Vercel Cron (CRON_SECRET) o ?secret= para
  // crons externos. Sin secreto configurado, el endpoint queda cerrado.
  const bearerOk =
    process.env.CRON_SECRET &&
    req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
  const queryOk =
    process.env.NOTIFY_SECRET && req.query.secret === process.env.NOTIFY_SECRET
  if (!bearerOk && !queryOk) {
    return res.status(401).json({ error: 'no autorizado' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const live = await fetchLive()

  const { data: fila, error: errorEstado } = await supabase
    .from('notify_state')
    .select('snapshot')
    .eq('id', 'espn')
    .maybeSingle()
  if (errorEstado) {
    return res.status(500).json({ error: `notify_state: ${errorEstado.message}` })
  }
  const prev = fila?.snapshot ?? null

  // Snapshot mínimo: solo lo necesario para detectar transiciones
  const snapshot = {}
  for (const [key, ev] of Object.entries(live)) {
    snapshot[key] = { state: ev.state, goals: ev.goals?.length ?? 0 }
  }
  await supabase
    .from('notify_state')
    .upsert({ id: 'espn', snapshot, updated_at: new Date().toISOString() })

  const avisos = prev ? avisosDe(prev, live) : []
  if (!avisos.length) {
    return res.json({ ok: true, avisos: 0, primeraCorrida: !prev })
  }

  const { data: subs, error: errorSubs } = await supabase
    .from('push_subs')
    .select('endpoint, sub')
  if (errorSubs) {
    return res.status(500).json({ error: `push_subs: ${errorSubs.message}` })
  }
  if (!subs?.length) return res.json({ ok: true, avisos: avisos.length, enviados: 0 })

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:ferbyo@gmail.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  let enviados = 0
  const muertas = []
  await Promise.all(
    subs.map(async ({ endpoint, sub }) => {
      for (const aviso of avisos) {
        try {
          await webpush.sendNotification(
            sub,
            JSON.stringify({ ...aviso, url: '/' }),
            // TTL corto: un gol avisado media hora tarde ya no sirve
            { TTL: 1800, urgency: 'high' }
          )
          enviados++
        } catch (err) {
          // 404/410 = la suscripción ya no existe (app desinstalada, permiso
          // revocado): se purga y no se le intentan los demás avisos
          if (err.statusCode === 404 || err.statusCode === 410) {
            muertas.push(endpoint)
            break
          }
        }
      }
    })
  )
  if (muertas.length) {
    await supabase.from('push_subs').delete().in('endpoint', muertas)
  }

  res.json({ ok: true, avisos: avisos.length, enviados, purgadas: muertas.length })
}
