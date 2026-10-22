import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/space-grotesk/300.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// `?debug` exposes internals in the console (and lets automated screenshot tests drive the camera).
if (new URLSearchParams(location.search).has('debug')) {
  Promise.all([import('gsap'), import('./lib/rig'), import('./lib/simulation')]).then(([{ default: gsap }, rig, sim]) => {
    Object.assign(window, { atlas: { gsap, ...rig, ...sim } })
  })
}
