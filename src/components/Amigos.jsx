// ── Pestaña "Coonstl" ──
// Estado de los 8 amigos: quiénes siguen vivos con qué equipos, quiénes ya
// quedaron eliminados. Cuando hay campeón, cambia a "Resultado final" con
// el ganador destacado y el subcampeón etiquetado.

import { TEAMS, OWNERS, OWNER_BY_TEAM, POZO } from '../data.js'
import { Bandera } from './Bandera.jsx'
import { OwnerChip } from './OwnerChip.jsx'

// Tarjeta de un amigo con sus 2 equipos y su estado (vivos, sin equipos,
// campeón). Los equipos eliminados van tachados; el campeón lleva ★.
function FriendCard({ owner, tag, campeon }) {
  const dead = owner.alive === 0 && !campeon && !tag
  return (
    <div
      className={`friend-card${dead ? ' dead' : ''}${campeon ? ' es-campeon' : ''}`}
      style={{ '--owner': owner.color }}
    >
      <div className="friend-head">
        <OwnerChip owner={owner} />
        {tag ? (
          <span className={`friend-tag${campeon ? ' campeon' : ''}`}>{tag}</span>
        ) : (
          <span className="friend-count">
            {dead ? 'sin equipos' : `${owner.alive} de 2 vivos`}
          </span>
        )}
      </div>
      <div className="friend-teams">
        {owner.teamStatus.map((t) => (
          <span
            key={t.id}
            className={`friend-team${t.out ? ' out' : ''}${t.champ ? ' champ' : ''}`}
          >
            <Bandera teamId={t.id} /> {t.name}
            {t.champ ? ' ★' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Amigos({ bracket }) {
  const status = OWNERS.map((o) => {
    const teams = o.teams.map((t) => ({
      id: t,
      ...TEAMS[t],
      out: bracket.eliminated.has(t),
      champ: bracket.champion === t,
    }))
    const alive = teams.filter((t) => !t.out).length
    return { ...o, teamStatus: teams, alive }
  })

  // Torneo terminado: estado final con campeón destacado y subcampeón.
  if (bracket.champion) {
    const campeon = OWNER_BY_TEAM[bracket.champion]
    const final = bracket.resolved.find((m) => m.id === 'f1')
    const subTeam = final.winner === final.homeTeam ? final.awayTeam : final.homeTeam
    const subOwner = subTeam ? OWNER_BY_TEAM[subTeam] : null
    const ganador = status.find((s) => s.id === campeon.id)
    const resto = status
      .filter((s) => s.id !== campeon.id)
      .sort((a, b) => (a.id === subOwner?.id ? -1 : b.id === subOwner?.id ? 1 : 0))
    return (
      <div className="amigos">
        <h2 className="round-title">Resultado final</h2>
        <FriendCard owner={ganador} tag={`Campeón · $${POZO.toLocaleString()}`} campeon />
        <h2 className="round-title out-title">Los demás</h2>
        <div className="friend-grid">
          {resto.map((o) => (
            <FriendCard key={o.id} owner={o} tag={o.id === subOwner?.id ? 'Subcampeón' : null} />
          ))}
        </div>
      </div>
    )
  }

  // Torneo en curso: pills de resumen + dos secciones (vivos / eliminados).
  const vivos = status.filter((s) => s.alive > 0).sort((a, b) => b.alive - a.alive)
  const fuera = status.filter((s) => s.alive === 0)

  return (
    <div className="amigos">
      <div className="amigos-summary">
        <div className="summary-pill alive-pill">{vivos.length} siguen vivos</div>
        <div className="summary-pill out-pill">{fuera.length} eliminados</div>
        <div className="summary-pill bolsa-pill">Bolsa ${POZO.toLocaleString()}</div>
      </div>
      <h2 className="round-title">Siguen en la pelea</h2>
      <div className="friend-grid">
        {vivos.map((o) => (
          <FriendCard key={o.id} owner={o} />
        ))}
      </div>
      {fuera.length > 0 && (
        <>
          <h2 className="round-title out-title">Eliminados</h2>
          <div className="friend-grid">
            {fuera.map((o) => (
              <FriendCard key={o.id} owner={o} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
