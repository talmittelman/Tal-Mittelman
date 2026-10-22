import { CosmosCanvas } from './scenes/CosmosCanvas'
import { Labels } from './components/three/Labels'
import { Hud } from './components/ui/Hud'
import { InfoPanel } from './components/ui/InfoPanel'

export function App() {
  return (
    <>
      <CosmosCanvas />
      <Labels />
      <Hud />
      <InfoPanel />
    </>
  )
}
