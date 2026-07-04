// ── useNotificaciones ──
// Estado del botón de campana del header y la acción de alternarlo.
//
// Estados:
//  - 'oculto'       sin soporte o sin config (VAPID/Supabase): el botón no se pinta
//  - 'ios-instalar' iPhone/iPad sin la PWA instalada: al tocar, explica cómo
//  - 'denegado'     el usuario bloqueó las notificaciones en el navegador
//  - 'off' / 'on'   suscripción apagada / activa
//  - 'cargando'     transición en curso (suscribiendo o dando de baja)

import { useCallback, useEffect, useState } from 'react'
import { pushDisponible, iosSinInstalar, suscripcionActual, suscribir, desuscribir } from '../push.js'

const TITULO = {
  'ios-instalar': 'Instala la app (Compartir → Agregar a inicio) para recibir notificaciones',
  denegado: 'Notificaciones bloqueadas — actívalas en la configuración del navegador',
  off: 'Avisarme goles y resultados',
  on: 'Notificaciones activadas — tocar para apagar',
  cargando: 'Un momento…',
}

export function useNotificaciones() {
  const [estado, setEstado] = useState('oculto')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (iosSinInstalar()) {
        if (vivo) setEstado('ios-instalar')
        return
      }
      if (!pushDisponible()) return
      if (Notification.permission === 'denied') {
        if (vivo) setEstado('denegado')
        return
      }
      const sub = await suscripcionActual()
      if (vivo) setEstado(sub ? 'on' : 'off')
    })()
    return () => {
      vivo = false
    }
  }, [])

  const toggle = useCallback(async () => {
    if (estado === 'ios-instalar') {
      alert(
        'Para recibir notificaciones en iPhone/iPad primero instala la app: ' +
          'botón Compartir → "Agregar a pantalla de inicio", y actívalas desde ahí.'
      )
      return
    }
    if (estado === 'denegado') {
      alert(
        'Las notificaciones están bloqueadas para este sitio. ' +
          'Actívalas en la configuración del navegador y vuelve a intentar.'
      )
      return
    }
    if (estado === 'on') {
      setEstado('cargando')
      try {
        await desuscribir()
        setEstado('off')
      } catch {
        setEstado('on')
      }
      return
    }
    if (estado === 'off') {
      setEstado('cargando')
      try {
        const sub = await suscribir()
        setEstado(sub ? 'on' : Notification.permission === 'denied' ? 'denegado' : 'off')
      } catch {
        setEstado('off')
      }
    }
  }, [estado])

  return { estado, toggle, titulo: TITULO[estado] ?? '' }
}
