// Header con marca, tagline (que puede mostrar chip "En vivo" cuando hay
// partidos activos, o "admin"/"demo" para los modos especiales) y el botón
// cíclico de tema.

import { IconAuto, IconSol, IconLuna } from './Icons.jsx'
import { haptic } from '../haptics.js'
import { ES_ADMIN, ES_SIM } from '../lib/modes.js'

const ICONO_TEMA = { system: IconAuto, light: IconSol, dark: IconLuna }

export function Header({ enVivoCount, themeMode, cyclearTema, tituloTema }) {
  const IconoActual = ICONO_TEMA[themeMode]
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">
          <img className="brand-logo" src="/ajolote.svg" alt="" />
          <h1 className="title">Tómbola del Ajolotl</h1>
        </div>
        <button
          className="theme-btn"
          onClick={() => {
            haptic.soft()
            cyclearTema()
          }}
          aria-label={tituloTema}
          title={tituloTema}
        >
          <IconoActual />
        </button>
      </div>
      <p className="tagline">
        Mundial 2026 · Quiniela de los Coonstl
        {enVivoCount > 0 && (
          <span className="sync-pill en-vivo">
            <span className="live-dot" />
            {enVivoCount === 1 ? 'En vivo' : `${enVivoCount} en vivo`}
          </span>
        )}
        {ES_ADMIN && <span className="sync-pill admin-pill">admin</span>}
        {ES_SIM && <span className="sync-pill admin-pill">demo</span>}
      </p>
    </header>
  )
}
