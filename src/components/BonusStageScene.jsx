// ── Escena de fondo del Bonus Stage ─────────────────────────────────────
// Muelles con océano y barco al horizonte, como en el arcade. Se dibuja
// detrás del auto y Ryu como decoración pura (SVG absoluto, sin
// interactividad). Anclado al fondo del arena con preserveAspectRatio
// YMax para que el piso de madera quede exactamente donde pisan Ryu y
// el auto sin importar el tamaño de la pantalla.

export function BonusScene() {
  return (
    <svg
      className="sf-bonus-bg"
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMax slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7ec7ff" />
          <stop offset="60%" stopColor="#a8d8ff" />
          <stop offset="100%" stopColor="#dae8f2" />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1e4a80" />
          <stop offset="100%" stopColor="#0e2a55" />
        </linearGradient>
      </defs>

      {/* Cielo */}
      <rect x="0" y="0" width="480" height="180" fill="url(#skyGrad)" />

      {/* Nubes suaves */}
      <ellipse cx="80" cy="50" rx="30" ry="6" fill="#fff" opacity="0.75" />
      <ellipse cx="120" cy="70" rx="22" ry="5" fill="#fff" opacity="0.55" />
      <ellipse cx="320" cy="40" rx="34" ry="6" fill="#fff" opacity="0.7" />
      <ellipse cx="410" cy="65" rx="26" ry="5" fill="#fff" opacity="0.5" />

      {/* Barco/crucero al fondo, lado derecho (silueta pixel-y) */}
      <g transform="translate(360 128)">
        {/* Casco */}
        <path
          d="M 0 24 L 12 12 L 90 12 L 100 24 L 96 32 L 4 32 Z"
          fill="#e8ecee"
          stroke="#3a4a55"
          strokeWidth="1.5"
        />
        {/* Bandera en mástil izq */}
        <line x1="8" y1="12" x2="8" y2="-4" stroke="#1a1a2a" strokeWidth="1.2" />
        <rect x="8" y="-4" width="10" height="6" fill="#c8302a" />
        <rect x="8" y="-4" width="10" height="2" fill="#fff" />
        <rect x="8" y="-4" width="4" height="3" fill="#25376b" />
        {/* Superestructura blanca */}
        <rect x="20" y="2" width="60" height="10" fill="#f5f5f5" stroke="#3a4a55" strokeWidth="1" />
        <rect x="26" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="36" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="46" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="56" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="66" y="4" width="6" height="4" fill="#5a7ea5" />
        {/* Chimenea con banda roja */}
        <rect x="50" y="-8" width="10" height="12" fill="#f5f5f5" stroke="#3a4a55" strokeWidth="1" />
        <rect x="50" y="-6" width="10" height="4" fill="#c8302a" />
        {/* Ventanillas del casco */}
        <circle cx="16" cy="22" r="1.5" fill="#25376b" />
        <circle cx="26" cy="22" r="1.5" fill="#25376b" />
        <circle cx="36" cy="22" r="1.5" fill="#25376b" />
        <circle cx="46" cy="22" r="1.5" fill="#25376b" />
        <circle cx="56" cy="22" r="1.5" fill="#25376b" />
        <circle cx="66" cy="22" r="1.5" fill="#25376b" />
        <circle cx="76" cy="22" r="1.5" fill="#25376b" />
        <circle cx="86" cy="22" r="1.5" fill="#25376b" />
      </g>

      {/* Océano */}
      <rect x="0" y="180" width="480" height="70" fill="url(#seaGrad)" />
      {/* Olas horizontales sutiles */}
      <g fill="#4a7abf" opacity="0.55">
        <path d="M 0 190 Q 20 187 40 190 T 80 190 T 120 190 T 160 190 T 200 190 T 240 190 T 280 190 T 320 190 T 360 190 T 400 190 T 440 190 T 480 190 L 480 194 L 0 194 Z" />
        <path d="M 0 205 Q 24 202 48 205 T 96 205 T 144 205 T 192 205 T 240 205 T 288 205 T 336 205 T 384 205 T 432 205 T 480 205 L 480 208 L 0 208 Z" />
        <path d="M 0 222 Q 20 219 40 222 T 80 222 T 120 222 T 160 222 T 200 222 T 240 222 T 280 222 T 320 222 T 360 222 T 400 222 T 440 222 T 480 222 L 480 225 L 0 225 Z" />
      </g>

      {/* Muelle de madera — tablones horizontales con vetas */}
      <rect x="0" y="250" width="480" height="70" fill="#8a5a2a" />
      <g stroke="#4a2a10" strokeWidth="1.2" opacity="0.9">
        {/* Tablas horizontales */}
        <line x1="0" y1="260" x2="480" y2="260" />
        <line x1="0" y1="278" x2="480" y2="278" />
        <line x1="0" y1="296" x2="480" y2="296" />
        <line x1="0" y1="314" x2="480" y2="314" />
      </g>
      {/* Vetas verticales que dividen los tablones */}
      <g stroke="#4a2a10" strokeWidth="0.8" opacity="0.6">
        <line x1="60" y1="250" x2="60" y2="320" />
        <line x1="130" y1="250" x2="130" y2="320" />
        <line x1="195" y1="250" x2="195" y2="320" />
        <line x1="265" y1="250" x2="265" y2="320" />
        <line x1="330" y1="250" x2="330" y2="320" />
        <line x1="400" y1="250" x2="400" y2="320" />
      </g>
      {/* Highlight superior del muelle (borde iluminado) */}
      <rect x="0" y="248" width="480" height="4" fill="#c88a4a" />
      {/* Sombras entre tablones */}
      <g fill="#5a3818" opacity="0.5">
        <rect x="0" y="269" width="480" height="1.5" />
        <rect x="0" y="287" width="480" height="1.5" />
        <rect x="0" y="305" width="480" height="1.5" />
      </g>
    </svg>
  )
}
