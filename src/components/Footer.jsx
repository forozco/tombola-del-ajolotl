// Pie de página: crédito, versión + SHA (inyectados por vite.config), y
// una nota sobre zona horaria local del dispositivo. La versión + SHA
// permiten identificar exactamente qué build está corriendo cada teléfono.

import { zonaHoraria } from '../lib/dates.js'

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Marcadores, goles y resultados en vivo desde <strong>ESPN</strong>. Todo se actualiza solo
        cada pocos segundos y el ganador avanza de ronda al instante — aquí nadie captura nada a
        mano.
      </p>
      <span className="footer-tz">Horarios en tu hora local ({zonaHoraria()})</span>
      <span className="footer-credito">Hecho con ❤️ por el fer</span>
      <span className="footer-version">
        v{__APP_VERSION__} · {__APP_SHA__}
      </span>
    </footer>
  )
}
