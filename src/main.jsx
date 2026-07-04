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
