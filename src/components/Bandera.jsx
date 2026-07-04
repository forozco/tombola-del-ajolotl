// Bandera cuadrada del equipo, empacada como data-URI dentro del bundle
// (sin peticiones de red por bandera). Cuando no se pasa teamId, muestra un
// placeholder vacío del mismo tamaño (para slots "Por definir" del cuadro).

import { TEAMS } from '../data.js'
import { FLAG_URLS } from '../banderas.js'

export function Bandera({ teamId, className = '' }) {
  const team = TEAMS[teamId]
  if (!team) return <span className={`bandera bandera-vacia ${className}`} />
  return (
    <span
      className={`bandera ${className}`}
      style={{ backgroundImage: FLAG_URLS[team.code] }}
      title={team.name}
    />
  )
}
