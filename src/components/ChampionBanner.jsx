// Banner con animación pop que aparece cuando ya hay campeón del torneo:
// bandera del equipo, nombre del amigo dueño y bolsa que se lleva.

import { TEAMS, OWNER_BY_TEAM, POZO } from '../data.js'
import { Bandera } from './Bandera.jsx'

export function ChampionBanner({ championTeamId }) {
  if (!championTeamId) return null
  const owner = OWNER_BY_TEAM[championTeamId]
  return (
    <div className="champion-banner" style={{ '--owner': owner.color }}>
      <div className="champion-trophy">🏆</div>
      <div>
        <div className="champion-team">
          <Bandera teamId={championTeamId} /> {TEAMS[championTeamId].name} — ¡Campeón del Mundo!
        </div>
        <div className="champion-owner">
          <strong>{owner.name}</strong> se lleva la bolsa de ${POZO.toLocaleString()} MXN
        </div>
      </div>
    </div>
  )
}
