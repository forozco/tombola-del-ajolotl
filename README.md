# 🌸 Tómbola del Ajolotl

Quiniela del Mundial 2026 entre 8 amigos — cada quien se rifó $200 MXN y le tocaron
2 equipos en la tómbola. **El dueño del equipo campeón se lleva la bolsa completa
de $1,600 MXN.**

App web progresiva (PWA), instalable en el teléfono, funciona sin señal. Nadie
captura nada a mano: los goles, resultados, tarjetas y llaves se actualizan solos
desde ESPN.

## Qué hace

- **📅 Hoy** — Partidos del día con marcador en vivo, minuto, goleadores con
  minuto, tarjetas amarillas y rojas, tandas de penales, estadio y barra de
  posesión. Los partidos próximos y los últimos resultados debajo.
- **🏆 El Camino** — Tres vistas del bracket:
  - **Cuadro** con líneas conectadas de octavos a final,
  - **Lista** cronológica plana,
  - **Street Fighter** con retratos de peleadores para cada amigo, barra de
    vida que baja con cada gol, sello WIN / K.O. al terminar, panel LIVE VS
    encima del roster, y un panel NEXT FIGHT con countdown LED estilo attract
    mode para el próximo partido.
- **🧑 Coonstl** — Roster de amigos: quién sigue vivo, quién quedó eliminado,
  se recalcula solo con cada resultado.
- **Estado alterado** — Si ESPN reporta que el partido fue retrasado,
  reprogramado, suspendido o cancelado, se muestra un badge con el detalle.
  También detecta reprogramación silenciosa (kickoff distinto al oficial).
- **Página de créditos** — Al terminar la final (5 h después del kickoff), la
  app deja de mostrar la vista normal y aparece la landing de agradecimiento
  con el campeón, los 8 amigos y el stack técnico.
- **Easter egg** — Bonus stage del auto de Street Fighter II, accesible desde
  un botoncito discreto en el panel NEXT FIGHT.
- **Modo claro / oscuro** — Toggle en el header, respeta la preferencia del
  sistema por defecto.
- **PWA instalable** — Añadir a pantalla de inicio en iOS y Android, corre
  offline con service worker.

## Stack

- **Frontend:** React 18, Vite 5, PWA vía `vite-plugin-pwa`.
- **Datos:** API pública de ESPN (`site.api.espn.com`) con poll adaptativo:
  10 s en vivo, 15 s en la ventana de kickoff (–5 min / +10 min), 30 s
  cerca del comienzo, 3 min en día tranquilo.
- **Estado compartido:** Supabase Postgres + Realtime — los ganadores
  registrados por cualquier teléfono aparecen en el resto al instante.
- **Hosting:** Vercel, deploys automáticos por rama (cada PR con preview).

## Correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Sin `.env` funciona en modo local — los
resultados quedan solo en el navegador (localStorage).

### URL params útiles

- `?simular` — recorre el torneo completo en ~4 min con datos falsos, útil
  para probar la experiencia sin esperar partidos reales.
- `?admin` — habilita corregir manualmente el ganador de cualquier partido
  tocando el renglón del equipo.
- `?bonus` — abre el bonus stage del auto directo (modo prueba del easter egg).
- `?creditos` — abre la página de créditos (preview del cierre post-final).

## Deploy a Vercel

```bash
npx vercel
```

Vercel detecta Vite automáticamente (`npm run build`, output en `dist/`).
Si vas a usar Supabase, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
en **Settings → Environment Variables** antes del primer deploy.

## Modo en vivo con Supabase (opcional)

Sin Supabase la app funciona igual, pero cada teléfono solo ve sus propios
resultados. Para sincronizar entre los 8 amigos:

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) →
   **New project** (nómbralo `tombola-ajolotl`).
2. En el dashboard, **SQL Editor → New query**, pega el contenido de
   [`supabase-setup.sql`](./supabase-setup.sql) y dale **Run**. Esto crea
   la tabla `resultados` con RLS y constraints.
3. **Settings → API**, copia **Project URL** y la **anon public key** a un
   `.env` en la raíz del proyecto:

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

Reinicia `npm run dev` y el chip del header debe decir **🟢 En vivo**.

### Migraciones sobre una tabla existente

Si tenías la tabla antes de que existiera la columna `marcador`:

```sql
alter table public.resultados add column if not exists marcador text;
```

Los constraints anti-basura (`resultados_match_id_valido` y
`resultados_winner_valido`) también están en el SQL de setup como bloque
idempotente — se pueden correr en cualquier momento.

## Estructura del código

```
src/
├── App.jsx                    — composition root
├── components/
│   ├── MatchCard.jsx          — tarjeta grande de un partido (Hoy)
│   ├── MiniMatch.jsx          — renglón compacto (próximos/últimos)
│   ├── Llaves.jsx             — cuadro con Bracket / Lista / SF
│   ├── StreetFighter.jsx      — modo arcade del bracket
│   ├── SfLiveVsPanel.jsx      — panel VS en vivo (arriba del roster)
│   ├── SfNextFightPanel.jsx   — countdown attract mode + easter egg
│   ├── SfBracket.jsx          — cards del bracket estilo arcade
│   ├── BonusStage.jsx         — juego del bonus stage
│   ├── BonusStageAssets.js    — sprites + reglas
│   ├── BonusStageAudio.js     — SFX y música
│   ├── BonusStageScene.jsx    — fondo de muelles
│   └── Creditos.jsx           — landing post-final
├── hooks/
│   ├── useLive.js             — poll adaptativo a ESPN
│   ├── useResults.js          — persistencia + realtime Supabase
│   ├── useTheme.js            — light/dark/auto
│   └── useRuta.js             — tabs y vistas en la URL
├── lib/
│   ├── bracket.js             — resuelve slots, gana / eliminado / campeón
│   ├── matches.js             — finishLabel + venue + persistencia
│   └── dates.js               — hora local, fecha ISO
├── data.js                    — MATCHES, TEAMS, OWNERS, VENUES
├── live.js                    — cliente de ESPN
├── sync.js                    — cliente de Supabase
└── simulacion.js              — guion del torneo simulado (?simular)
```

## Créditos

- Ícono de ajolote: [caro-asercion](https://game-icons.net/1x1/caro-asercion/axolotl.html)
  vía game-icons.net, licencia [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Banderas: [flag-icons](https://github.com/lipis/flag-icons), licencia MIT.
- Fuente pixel del modo arcade: `Press Start 2P` (Open Font License).
- Sprites y SFX del modo Street Fighter y bonus stage: uso no comercial para
  esta app privada entre amigos, no se redistribuyen.

Hecho con ❤ por el fer para los 8 coons — Mundial 2026.
