// Clickable object labels, drawn as one plain DOM layer on top of the canvas.
// <LabelProjector> (inside the canvas) projects every object to the screen each frame and writes
// position/opacity straight into the DOM nodes that <Labels> (outside the canvas) rendered once.
//
// Labels fade by distance and importance so the screen never clutters:
//   1. each object has a range — beyond that camera distance its label disappears
//   2. a moon too close (on screen) to its planet, or a planet to the Sun, steps aside
//   3. once a body is a big disc on screen, it is its own label
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { OBJECTS, type CosmicObject } from '../../data/objects'
import { CAM_RENDER_DIST, FOV, rig } from '../../lib/rig'
import { sim } from '../../lib/simulation'
import { AU, KM } from '../../lib/units'
import { useAtlas } from '../../store/useAtlas'

const nodes = new Map<string, { root: HTMLDivElement; dot: HTMLSpanElement }>()
const TAN = Math.tan(MathUtils.degToRad(FOV / 2))
const v = new Vector3()

/** Distance from the camera (m) beyond which a label is hidden — small orbits = less important from afar. */
function labelRange(o: CosmicObject) {
  if (o.elements) return o.elements.a[0] * AU * 40
  if (o.moonOrbit) return o.moonOrbit.aKm * KM * 40
  return Infinity
}
const RANGES = new Map(OBJECTS.map((o) => [o.id, Math.log10(labelRange(o))]))

export function LabelProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    const { selectedId, layers } = useAtlas.getState()
    const s = CAM_RENDER_DIST / rig.camDist
    for (const o of OBJECTS) {
      const n = nodes.get(o.id)
      if (!n) continue
      const pos = sim.positions.get(o.id)!
      const d = Math.max(1, rig.cameraPos.distanceTo(pos))
      const px = (m: number) => (m / d / TAN) * (size.height / 2) // meters at the body → screen pixels
      const selected = selectedId === o.id

      let a = MathUtils.clamp((RANGES.get(o.id)! - Math.log10(d)) / 0.35, 0, 1)
      if (selected) a = Math.max(a, 0.9)
      if (o.kind !== 'star') a *= MathUtils.clamp((px(pos.distanceTo(sim.positions.get(o.parent ?? 'sun')!)) - 28) / 22, 0, 1)
      const screenR = px(o.radiusKm * KM)
      a *= MathUtils.clamp((90 - screenR) / 30, 0, 1)
      if (!layers.labels && !selected) a = 0

      // Project the floating-origin render position (computed in doubles) to the screen.
      v.copy(pos).sub(rig.focus).multiplyScalar(s).project(camera)
      if (v.z > 1 || a < 0.01) {
        n.root.style.visibility = 'hidden'
        continue
      }
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      // Once the body is a visible disc, slide the label off its right edge and drop the dot.
      const off = Math.max(0, screenR + 6)
      n.root.style.visibility = 'visible'
      n.root.style.opacity = a.toFixed(3)
      n.root.style.transform = `translate(${(x + off - 5).toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`
      n.root.style.pointerEvents = a > 0.2 ? 'auto' : 'none'
      n.dot.style.opacity = screenR > 3 ? '0' : '1'
    }
  })
  return null
}

export function Labels() {
  const selectedId = useAtlas((s) => s.selectedId)
  const travelTo = useAtlas((s) => s.travelTo)
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      {OBJECTS.map((o) => {
        const selected = selectedId === o.id
        return (
          <div
            key={o.id}
            ref={(root) => {
              const dot = root?.querySelector('span') as HTMLSpanElement | null
              if (root && dot) nodes.set(o.id, { root, dot })
              else nodes.delete(o.id)
            }}
            className="absolute top-0 left-0 will-change-transform"
            style={{ visibility: 'hidden' }}
          >
            <button
              type="button"
              onClick={() => travelTo(o.id)}
              className={`group flex cursor-pointer items-center gap-2 whitespace-nowrap select-none ${
                selected ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full border transition-colors duration-300 ${
                  selected ? 'border-white bg-white/30' : 'border-white/50 group-hover:border-white'
                }`}
              />
              <span className={`font-medium uppercase ${o.kind === 'moon' ? 'text-[9.5px] tracking-[0.24em]' : 'text-[11px] tracking-[0.28em]'}`}>
                {o.name}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
