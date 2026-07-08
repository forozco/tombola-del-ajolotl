// Pie de página: crédito, versión + SHA (inyectados por vite.config), y
// una nota sobre zona horaria local del dispositivo. La versión + SHA
// permiten identificar exactamente qué build está corriendo cada teléfono.
// El botón "Créditos" abre la página de agradecimiento (siempre disponible,
// aparte del trigger automático post-final que corre en App.jsx).

import { zonaHoraria } from '../lib/dates.js'

export function Footer({ onOpenCreditos }) {
  return (
    <footer className="footer">
      <p>
        Marcadores, goles y resultados en vivo desde <strong>ESPN</strong>. Todo se actualiza solo
        cada pocos segundos y el ganador avanza de ronda al instante — aquí nadie captura nada a
        mano.
      </p>
      <span className="footer-tz">Horarios en tu hora local ({zonaHoraria()})</span>
      <span className="footer-credito">Hecho con ❤️ por el fer</span>
      {onOpenCreditos ? (
        <button className="footer-creditos-link" onClick={onOpenCreditos}>
          Créditos y stack tecnológico ↗
        </button>
      ) : null}
      <span className="footer-version">
        v{__APP_VERSION__} · {__APP_SHA__}
      </span>
    </footer>
  )
}
