// Toast que aparece cuando el service worker detecta un deploy nuevo. Al
// tocar "Actualizar", activa la versión nueva y recarga. Está bajo un
// registerType: 'prompt' en vite.config.js — la actualización no ocurre sola,
// el usuario decide.

import { useRegisterSW } from 'virtual:pwa-register/react'
import { haptic } from '../haptics.js'

export function ActualizacionDisponible() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-toast" role="alert">
      <span>Hay una versión nueva de la app</span>
      <div className="update-actions">
        <button
          className="update-later"
          onClick={() => {
            haptic.soft()
            setNeedRefresh(false)
          }}
        >
          Ahora no
        </button>
        <button
          className="update-now"
          onClick={() => {
            haptic.success()
            updateServiceWorker(true)
          }}
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
