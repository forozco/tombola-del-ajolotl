// ── Manejadores de Web Push del service worker ──
// Este archivo se suma al SW que genera vite-plugin-pwa vía
// workbox.importScripts (ver vite.config.js). Muestra las notificaciones
// que manda api/notify.js y abre/enfoca la app al tocarlas.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() ?? '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tómbola del Ajolotl', {
      body: data.body ?? '',
      // tag agrupa por partido: un gol nuevo reemplaza la notificación
      // anterior del mismo partido en vez de apilar diez
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((abiertas) => {
        const app = abiertas.find((c) => 'focus' in c)
        if (app) {
          if ('navigate' in app) app.navigate(url)
          return app.focus()
        }
        return self.clients.openWindow(url)
      })
  )
})
