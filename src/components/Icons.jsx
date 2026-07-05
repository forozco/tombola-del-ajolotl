// Iconos SVG inline usados por header y toggles. Se prefieren aquí sobre una
// librería para no cargar código externo (los 5 iconos suman <1KB gzip).

// Sol para el modo claro
export function IconSol() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

// Luna para el modo oscuro
export function IconLuna() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

// "Auto": círculo mitad relleno — el tema sigue al dispositivo
export function IconAuto() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Icono del toggle "Bracket" (llaves gráficas) de El Camino
export function IconBracket() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h4M4 17h4M8 7v10M8 12h9" />
    </svg>
  )
}

// Icono del toggle "Street Fighter" de El Camino: palanca de arcade
export function IconArcade() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v6" />
      <path d="M5 15h14a1 1 0 0 1 1 1v3H4v-3a1 1 0 0 1 1-1z" />
    </svg>
  )
}

// Icono del toggle "Lista" de El Camino
export function IconLista() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}

// Pin de ubicación (mapa): acompaña el nombre del estadio en la MatchCard.
// Tamaño pequeño (12px) para que se integre con el texto muted sin dominar.
export function IconPin() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s-7-7-7-13a7 7 0 0 1 14 0c0 6-7 13-7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

// Reloj con manecillas a las 10:10 (canónico). Se usa en el badge de
// INICIO RETRASADO / HORARIO ACTUALIZADO de la MatchCard.
export function IconClock() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

// Triángulo de advertencia con signo de exclamación. Para REPROGRAMADO.
export function IconWarning() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 22 20 2 20 Z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" />
    </svg>
  )
}

// Pausa: dos barras verticales. Para SUSPENDIDO (juego detenido).
export function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

// X trazada. Para CANCELADO.
export function IconX() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6 18 18 M18 6 6 18" />
    </svg>
  )
}

// Joystick estilo cabinete arcade: bola + palanca + base. Se usa en el
// botoncito easter egg de la vista Street Fighter (bonus stage del auto).
// Pixel-y por dentro (rectángulos con esquinas rectas).
export function IconJoystick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <circle cx="12" cy="6" r="3" fill="currentColor" />
      <path d="M12 9v7" />
      <rect x="6" y="16" width="12" height="4" fill="currentColor" opacity="0.35" />
      <rect x="6" y="16" width="12" height="4" />
    </svg>
  )
}
