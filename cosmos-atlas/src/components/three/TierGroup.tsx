// A scale tier: everything inside is authored in the tier's own unit (AU, ly, kly, Mly).
// Every frame we shift the group so the camera's focus sits at the origin, and scale it so that
// one tier unit maps to the right number of render units. This is the floating origin in practice.
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { Vector3, type Group } from 'three'
import { CAM_RENDER_DIST, rig } from '../../lib/rig'

const ZERO = new Vector3()

export function TierGroup({ unit, origin = ZERO, children }: { unit: number; origin?: Vector3; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    const g = ref.current!
    const s = CAM_RENDER_DIST / rig.camDist // render units per meter
    g.scale.setScalar(unit * s)
    g.position.copy(origin).sub(rig.focus).multiplyScalar(s) // computed in doubles, so no jitter
  }, -1)
  return <group ref={ref}>{children}</group>
}

/** Render units per tier unit, for things that must stay a constant size on screen. */
export const tierScale = (unit: number) => (unit * CAM_RENDER_DIST) / rig.camDist
