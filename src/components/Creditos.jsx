// ── Créditos · página de gracias después del final ─────────────────────
// Se muestra automáticamente al terminar la Final (bracket.champion definido)
// y también accesible en cualquier momento via ?creditos en la URL.
// Sigue el design system principal de la app: tarjetas dark, acento rosa,
// tipografía limpia. Sin arcade, sin cómic — es la página "seria" de cierre.

import { OWNERS, TEAMS, POZO } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { Bandera } from './Bandera.jsx'
import { OwnerChip } from './OwnerChip.jsx'

const REPO_URL = 'https://github.com/forozco/tombola-del-ajolotl'

function AmigoRow({ owner, esCampeon }) {
  const f = FIGHTERS[owner.id]
  return (
    <div className={`creditos-amigo${esCampeon ? ' campeon' : ''}`}>
      <span className="creditos-amigo-avatar" style={{ background: owner.color }}>
        {owner.name.charAt(0)}
      </span>
      <div className="creditos-amigo-body">
        <div className="creditos-amigo-linea">
          <span className="creditos-amigo-nombre" style={{ color: owner.color }}>
            {owner.name}
          </span>
          <span className="creditos-amigo-fighter">{f.fighter}</span>
        </div>
        <div className="creditos-amigo-teams">
          {owner.teams.map((teamId) => (
            <span key={teamId} className="creditos-amigo-team">
              <Bandera teamId={teamId} /> {TEAMS[teamId]?.name}
            </span>
          ))}
        </div>
      </div>
      {esCampeon ? <span className="creditos-trofeo">🏆</span> : null}
    </div>
  )
}

// Stack agrupado por rol en el sistema. Cada item explica en una frase qué
// hace, para que la sección no sea solo una lista de nombres.
const STACK_GROUPS = [
  {
    label: 'Frontend',
    items: [
      { name: 'React 18', role: 'UI reactiva y estado de la partida' },
      { name: 'Vite 5', role: 'Build y hot reload en desarrollo' },
      {
        name: 'PWA (vite-plugin-pwa)',
        role: 'App instalable en el homescreen, funciona sin señal',
      },
    ],
  },
  {
    label: 'Datos y estado compartido',
    items: [
      {
        name: 'Supabase Postgres',
        role: 'Persistencia de resultados y snapshots detallados por partido',
      },
      {
        name: 'Supabase Realtime',
        role: 'Cambios registrados en un teléfono aparecen en el resto al instante',
      },
      {
        name: 'ESPN site.api',
        role: 'Marcadores en vivo, goles, tarjetas, tandas de penales, estadios',
      },
    ],
  },
  {
    label: 'Distribución',
    items: [
      { name: 'Vercel', role: 'Hosting con deploys automáticos por rama' },
      { name: 'Service Worker', role: 'Cache de sprites y bracket para modo offline' },
    ],
  },
]

function StackGroup({ group }) {
  return (
    <div className="creditos-stack-group">
      <div className="creditos-stack-cat">{group.label}</div>
      <ul className="creditos-stack-list">
        {group.items.map((item) => (
          <li key={item.name} className="creditos-stack-item">
            <span className="creditos-stack-name">{item.name}</span>
            <span className="creditos-stack-role">{item.role}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="creditos-seccion">
      <h2 className="creditos-h2">{title}</h2>
      {children}
    </section>
  )
}

export function Creditos({ bracket, onClose }) {
  const campeon = bracket?.champion
  const ownerCampeon = campeon ? OWNERS.find((o) => o.teams.includes(campeon)) : null
  const teamName = campeon ? TEAMS[campeon]?.name : null

  return (
    <div className="creditos-overlay" role="dialog" aria-label="Créditos">
      <div className="creditos-scroll">
        {/* ── Hero ── */}
        <header className="creditos-hero">
          <div className="creditos-eyebrow">TÓMBOLA DEL AJOLOTL · MUNDIAL 2026</div>
          <h1 className="creditos-titulo">Gracias, Coons &amp; Friends</h1>
          <p className="creditos-lede">
            Ocho amigos, dieciséis equipos, un mundial. Esta app existió para
            hacerle honor a la quiniela — y a los que se rifaron los $200.
          </p>
          {ownerCampeon && teamName ? (
            <div className="creditos-hero-campeon">
              <span className="creditos-hero-label">CAMPEÓN</span>
              <div className="creditos-hero-nombre" style={{ color: ownerCampeon.color }}>
                🏆 {ownerCampeon.name}
              </div>
              <div className="creditos-hero-team">
                <Bandera teamId={campeon} /> {teamName}
                <span className="creditos-hero-premio">
                  se llevó ${POZO.toLocaleString()}
                </span>
              </div>
            </div>
          ) : null}
        </header>

        {/* ── Los amigos ── */}
        <Section title="El grupo">
          <p className="creditos-p">
            Cada uno puso $200 y le tocaron 2 equipos en la tómbola. No hubo
            estrategia — pura suerte y aguante.
          </p>
          <div className="creditos-amigos">
            {OWNERS.map((o) => (
              <AmigoRow key={o.id} owner={o} esCampeon={ownerCampeon?.id === o.id} />
            ))}
          </div>
        </Section>

        {/* ── Cómo se armó ── */}
        <Section title="Cómo se armó">
          <p className="creditos-p">
            App web progresiva hecha con React sobre Vite. Todo el estado del
            torneo vive en Supabase (Postgres + Realtime) y los marcadores en
            vivo bajan directo del API pública de ESPN. Nada de esto necesitó
            servidor propio.
          </p>
          <div className="creditos-stack">
            {STACK_GROUPS.map((g) => (
              <StackGroup key={g.label} group={g} />
            ))}
          </div>
        </Section>

        {/* ── Datos ── */}
        <Section title="De dónde salen los datos">
          <ul className="creditos-datos">
            <li>
              <strong>ESPN (site.api)</strong> — marcadores en vivo, goles con
              minuto y goleador, tarjetas amarillas y rojas, tandas de penales,
              estadios. Poll adaptativo: cada 10 s durante un partido en curso,
              cada 3 min en día tranquilo.
            </li>
            <li>
              <strong>Supabase</strong> — persistencia de resultados y
              snapshots detallados por partido. Realtime para que el ganador
              registrado desde un teléfono aparezca en el resto al instante.
            </li>
            <li>
              <strong>Vercel + Service Worker</strong> — hosting con deploys
              automáticos por rama. La app instalada funciona sin señal (los
              stages, sprites y el bracket viven en cache).
            </li>
          </ul>
        </Section>

        {/* ── Código ── */}
        <Section title="Código abierto">
          <p className="creditos-p">
            Todo el código está en GitHub. Fork libre por si quieres armar tu
            propia quiniela — para el siguiente mundial o para lo que sea.
          </p>
          <a
            className="creditos-repo-link"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            forozco/tombola-del-ajolotl ↗
          </a>
        </Section>

        {/* ── Cierre ── */}
        <footer className="creditos-footer">
          <div className="creditos-hecho-por">
            hecho con <span className="creditos-heart">❤</span> por el fer
          </div>
          <div className="creditos-año">Mundial 2026 · Junio–Julio</div>
          {onClose ? (
            <button className="creditos-close" onClick={onClose}>
              Cerrar
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
