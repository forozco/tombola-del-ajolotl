// Barra de pestañas con píldora deslizante detrás. El CSS calcula la
// posición vía --active-tab-index (0/1/2). Vibra al cambiar de pestaña.

import { haptic } from '../haptics.js'

const TABS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'llaves', label: 'El Camino' },
  { id: 'amigos', label: 'Coonstl' },
]

export function TabBar({ tab, setTab }) {
  const activeIndex = TABS.findIndex((t) => t.id === tab)
  return (
    <nav className="tabs" style={{ '--active-tab-index': activeIndex }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? 'active' : ''}
          onClick={() => {
            if (tab !== t.id) haptic.soft()
            setTab(t.id)
          }}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
