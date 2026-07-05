import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// iOS Safari ignora user-scalable=no: bloqueamos el gesto de pellizco de dos
// dedos (hacia afuera/adentro) para que la PWA no haga zoom. En Android/Chrome
// lo cubren el meta viewport y touch-action: pan-x pan-y del body.
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => e.preventDefault(), { passive: false })
}

// PWA instalada: mata el swipe de borde izq/der (atrás/adelante del historial
// con animación de página) para que se sienta app nativa. iOS no expone CSS
// para esto — la única vía es cancelar el touchstart que nace en el borde.
// Costo asumido: la franja de 20px de cada borde no inicia taps ni scroll
// (igual que la zona de gestos de una app nativa). Solo aplica instalada;
// en el navegador normal no tocamos los gestos de Safari/Chrome. En Android
// el swipe-nav del navegador lo cubre overscroll-behavior-x en el CSS (el
// gesto back del SISTEMA no se puede bloquear, es del OS).
const esStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true
if (esStandalone) {
  const BORDE = 20
  document.addEventListener(
    'touchstart',
    (e) => {
      const x = e.touches[0]?.clientX ?? window.innerWidth / 2
      if (x <= BORDE || x >= window.innerWidth - BORDE) e.preventDefault()
    },
    { passive: false }
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Oculta la splash una vez montada la app. Si es una recarga dentro de la
// sesión (pull-to-refresh), la splash venía oculta por CSS: solo se quita.
const splash = document.getElementById('splash')
if (splash) {
  if (document.documentElement.classList.contains('no-splash')) {
    splash.remove()
  } else {
    const ocultar = () => {
      splash.classList.add('hidden')
      setTimeout(() => splash.remove(), 500)
    }
    window.requestAnimationFrame(() => setTimeout(ocultar, 500))
  }
}
