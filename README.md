# 🌸 Tómbola del Ajolotl

Quiniela del Mundial 2026 (octavos en adelante) entre 8 amigos. Cada quien puso $200 MXN
y le tocaron 2 equipos en la tómbola. **El dueño del equipo que gane el Mundial se lleva
la bolsa completa de $1,600 MXN.**

## Correr en local

```bash
npm install
npm run dev
```

## Deploy a Vercel

```bash
npx vercel
```

(Vercel detecta Vite automáticamente: build `npm run build`, output `dist/`.)

## Cómo se usa

La app es un **visor 100 % automático**: nadie captura nada. Los goles, resultados y
llaves se actualizan solos desde el marcador oficial (API pública de ESPN, sin key).

- **📅 Hoy**: los partidos del día con marcador en vivo (goles y minuto de juego),
  los próximos partidos y los últimos resultados con cómo se ganó cada uno
  (en los 90, en tiempo extra o en penales).
- **🏆 Llaves**: el cuadro completo; cuando un partido termina, el ganador avanza
  de ronda solito y se registra en Supabase (ganador + marcador final).
- **🌸 Amigos**: quién sigue vivo y quién ya quedó eliminado — se recalcula solo
  con cada resultado.
- Modo claro/oscuro con el botón del header (respeta la preferencia del sistema).
- Sin Supabase configurado, los resultados solo viven en el navegador (localStorage).

## Realtime con Supabase (3 pasos)

La app funciona en dos modos: **Local** (⚪ resultados solo en tu navegador) o
**En vivo** (🟢 sincronizado entre todos los teléfonos al instante). Para activar
el modo en vivo:

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) → **New project**
   (nómbralo `tombola-ajolotl`, la región da igual, guarda la contraseña que te pida).
2. En el dashboard ve a **SQL Editor → New query**, pega el contenido completo de
   [`supabase-setup.sql`](./supabase-setup.sql) y dale **Run**.
3. Ve a **Settings → API**, copia la **Project URL** y la **anon public key**, y ponlas
   en un archivo `.env` en la raíz del proyecto (usa `.env.example` como plantilla):

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

Reinicia `npm run dev` y el header debe decir **🟢 En vivo**. En Vercel, agrega esas
mismas dos variables en **Settings → Environment Variables** y haz redeploy.

## Nota sobre la tabla

Si creaste la tabla `resultados` antes de que existiera la columna `marcador`, corre
esto una vez en el SQL Editor para que también se registre el marcador final:

```sql
alter table public.resultados add column if not exists marcador text;
```

(Sin la columna, la app igual guarda al ganador — solo omite el marcador.)
