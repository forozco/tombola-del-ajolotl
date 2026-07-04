// ── Web Push: lado cliente ──
// Alta/baja de la suscripción push del navegador y su registro en Supabase
// (tabla push_subs), de donde api/notify.js las lee para enviar.
//
// Requisitos por plataforma:
//  - Android/desktop: cualquier navegador con service worker.
//  - iOS/iPadOS: SOLO funciona con la PWA instalada en la pantalla de inicio
//    (iOS 16.4+). En Safari suelto, PushManager ni siquiera existe.

import { supabase, hasSupabase } from './sync.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// pushManager.subscribe exige la llave VAPID como bytes, no base64url
function vapidKeyBytes() {
  const base64 = VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  return Uint8Array.from(atob(base64 + pad), (c) => c.charCodeAt(0))
}

export const pushDisponible = () =>
  Boolean(VAPID_PUBLIC_KEY) &&
  hasSupabase &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

// iOS sin instalar: no hay push posible, pero sí sabemos decirle al usuario
// qué le falta (agregar la app a la pantalla de inicio).
export const iosSinInstalar = () => {
  const esIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  return esIos && !instalada
}

// null si el SW aún no está registrado (p. ej. npm run dev, donde el SW de
// la PWA está apagado) — los llamadores tratan null como "no disponible".
async function registroSW() {
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function suscripcionActual() {
  if (!pushDisponible()) return null
  const reg = await registroSW()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function suscribir() {
  const reg = await registroSW()
  if (!reg) throw new Error('service worker no registrado (¿modo dev?)')
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return null
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKeyBytes(),
  })
  // delete + insert en lugar de upsert: la tabla no tiene policy de SELECT
  // (nadie puede leer suscripciones ajenas con la anon key) y el upsert de
  // Postgres necesita leer la fila en conflicto.
  await supabase.from('push_subs').delete().eq('endpoint', sub.endpoint)
  const { error } = await supabase
    .from('push_subs')
    .insert({ endpoint: sub.endpoint, sub: sub.toJSON() })
  if (error) {
    await sub.unsubscribe()
    throw error
  }
  return sub
}

export async function desuscribir() {
  const sub = await suscripcionActual()
  if (!sub) return
  await supabase.from('push_subs').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
