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

// Stack agrupado por rol en el sistema. Cada grupo lleva una intro que
// explica qué pasa en esa capa, y cada tech describe con detalle qué hace
// para que la sección se lea como una ficha técnica real, no una lista.
const STACK_GROUPS = [
  {
    label: 'Frontend',
    intro:
      'Toda la UI que se ve en el teléfono. Pura app cliente — nada corre en servidor propio.',
    items: [
      {
        name: 'React 18',
        role: 'Toda la UI se re-renderiza sola cuando cambia el estado (un gol en ESPN, un pick de admin, un cruce del bracket que se decide). Sin librerías de estado externas — solo hooks y prop drilling controlado.',
      },
      {
        name: 'Vite 5',
        role: 'Bundler y dev server. HMR instantáneo mientras se codea; build de producción sale en ~130 KB gzip incluyendo los sprites del bracket.',
      },
      {
        name: 'vite-plugin-pwa',
        role: 'Genera el Service Worker con precache de todos los assets del build. La app es instalable en el homescreen desde Safari o Chrome, y funciona sin señal (los sprites y el último bracket viven en cache).',
      },
    ],
  },
  {
    label: 'Datos y estado compartido',
    intro:
      'Cómo la app sabe qué pasó y cómo los 8 amigos ven exactamente lo mismo al instante.',
    items: [
      {
        name: 'Supabase Postgres',
        role: 'Dos tablas con RLS: una guarda match_id → ganador, la otra un snapshot completo por partido (goles con minuto, tarjetas, cómo terminó — regular, tiempo extra o penales). Ese snapshot es el respaldo cuando ESPN deja de servir el evento.',
      },
      {
        name: 'Supabase Realtime',
        role: 'Suscripción vía WebSocket a las tablas anteriores. Cuando un teléfono registra un ganador (auto desde ESPN o manual con ?admin), el resto de los amigos lo ve en el mismo segundo, sin refrescar la app.',
      },
      {
        name: 'ESPN site.api',
        role: 'Endpoint público sin API key. Poll adaptativo: cada 10 s durante un partido en curso, 15 s en la ventana crítica de kickoff (5 min antes hasta 10 min después), cada 3 min en un día sin partidos. De ahí bajan marcadores, goles con goleador, tarjetas, penales y estadios.',
      },
    ],
  },
  {
    label: 'Distribución',
    intro:
      'Cómo llega el código al teléfono y qué queda disponible sin internet.',
    items: [
      {
        name: 'Vercel',
        role: 'Hosting con CDN global. Cada PR genera automáticamente una URL de preview para probar antes de mergear; producción sale de main. Deploys en menos de un minuto.',
      },
      {
        name: 'Service Worker',
        role: 'Registrado por vite-plugin-pwa. Precachea JS, CSS, sprites del arcade, banderas y stages. Al abrir la app instalada sin internet, todo carga desde caché y solo faltan los marcadores en vivo.',
      },
    ],
  },
]

function StackGroup({ group }) {
  return (
    <div className="creditos-stack-group">
      <div className="creditos-stack-cat">{group.label}</div>
      {group.intro ? <p className="creditos-stack-intro">{group.intro}</p> : null}
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

export function Creditos({ bracket }) {
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
            Cada uno se rifó $200 y aceptó su destino: dos equipos al azar,
            cero derecho a reclamar. No hubo estrategia. No hubo negociación.
            Puro aguante durante un mes de partidos, mensajes en el grupo, y
            esa mezcla rara de mala suerte y suerte pura que trae cada
            Mundial.
          </p>
          <div className="creditos-amigos">
            {OWNERS.map((o) => (
              <AmigoRow key={o.id} owner={o} esCampeon={ownerCampeon?.id === o.id} />
            ))}
          </div>
          <div className="creditos-dedicatoria">
            <p>
              Gracias por meterle a la quiniela con toda la seriedad y con
              nada de seriedad al mismo tiempo. Por cada gol celebrado en el
              chat, cada &ldquo;no puede ser que me haya tocado&rdquo;, cada
              apuesta paralela y cada partido visto juntos. Ustedes son los
              coons — la app es solo un bracket bonito.
            </p>
            <p className="creditos-dedicatoria-firma">
              Nos vemos en el 2030.
            </p>
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
        </footer>
      </div>
    </div>
  )
}
