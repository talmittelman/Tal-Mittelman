// The WebGL canvas, the per-frame driver and the post-processing stack.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useRef } from 'react'
import { MathUtils } from 'three'
import { LabelProjector } from '../components/three/Labels'
import { RigControls } from '../controls/RigControls'
import { CAM_RENDER_DIST, FOV, rig, setupIntro, updateRig } from '../lib/rig'
import { sim, updatePositions } from '../lib/simulation'
import { tierForDistance } from '../lib/tiers'
import { niceScaleLength } from '../lib/units'
import { useAtlas } from '../store/useAtlas'
import { BackgroundStars } from './BackgroundStars'
import { SolarSystem } from './SolarSystem'

const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const TAN = Math.tan(MathUtils.degToRad(FOV / 2))

export function CosmosCanvas() {
  return (
    <Canvas
      className="!fixed inset-0"
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      camera={{ fov: FOV, near: 0.001, far: 1e10, position: [0, 0, CAM_RENDER_DIST] }}
      // Logarithmic depth keeps near and far objects sorted correctly across huge distance ranges.
      gl={{ logarithmicDepthBuffer: true, antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#000000')}
    >
      <Driver />
      <RigControls />
      <BackgroundStars />
      <SolarSystem />
      <LabelProjector />
      <EffectComposer multisampling={isTouch ? 0 : 4}>
        {/* Restrained bloom: only HDR colours (> 1.0, i.e. the Sun) glow. */}
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}

/** Runs first every frame: advance time → update positions → move the rig → place the camera. */
function Driver() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const setHud = useAtlas((s) => s.setHud)
  const lastHud = useRef(0)

  useEffect(() => setupIntro(), [])

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1)
    updatePositions(sim.jd + (d * sim.timeScale) / 86400)
    updateRig(d)
    camera.position.copy(rig.dir).multiplyScalar(CAM_RENDER_DIST)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    // Copy a few numbers into React state ~10×/s for the HUD.
    if (state.clock.elapsedTime - lastHud.current > 0.1) {
      lastHud.current = state.clock.elapsedTime
      const earth = sim.positions.get('earth')!
      const sel = useAtlas.getState().selectedId
      const mpp = (2 * rig.camDist * TAN) / size.height
      const nice = niceScaleLength(mpp * 110)
      setHud({
        earthDist: rig.cameraPos.distanceTo(earth),
        selectedDist: sel ? sim.positions.get(sel)!.distanceTo(earth) : 0,
        scalePx: nice.meters / mpp,
        scaleLabel: nice.label,
        tier: tierForDistance(rig.camDist),
        jd: sim.jd,
      })
    }
  }, -2)
  return null
}
