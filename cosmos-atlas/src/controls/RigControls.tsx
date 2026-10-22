// Mouse / trackpad / touch input → rig targets.
// We don't use OrbitControls because it moves the camera through the world; our camera stays put
// and the universe moves around it (see lib/rig.ts), so the controls only nudge rig targets.
//
//   drag            orbit
//   right-drag      pan        (or shift + drag)
//   scroll / pinch  zoom       (log-space — one gesture feels the same at every scale)
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { MathUtils, Vector3 } from 'three'
import { cancelFlight, FOV, killIntro, rig } from '../lib/rig'

const TAN = Math.tan(MathUtils.degToRad(FOV / 2))
const right = new Vector3()
const up = new Vector3()

export function RigControls() {
  const { gl, camera } = useThree()

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let mode: 'orbit' | 'pan' | null = null
    let pinch = 0
    let start = { x: 0, y: 0, dragging: false } // tiny jitters during a click must not cancel a flight

    const takeControl = () => {
      killIntro()
      cancelFlight()
    }

    const pan = (dx: number, dy: number) => {
      const mpp = (2 * rig.camDist * TAN) / el.clientHeight // meters per pixel at the focus
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      up.setFromMatrixColumn(camera.matrixWorld, 1)
      rig.pan.addScaledVector(right, -dx * mpp).addScaledVector(up, dy * mpp)
    }

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      mode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit'
      if (pointers.size === 1) start = { x: e.clientX, y: e.clientY, dragging: false }
      if (pointers.size === 2) pinch = spread()
    }

    const spread = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const mid = () => {
      const [a, b] = [...pointers.values()]
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      if (!start.dragging) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return
        start.dragging = true
        takeControl()
      }

      if (pointers.size === 2) {
        const m0 = mid()
        p.x = e.clientX
        p.y = e.clientY
        const m1 = mid()
        const s = spread()
        if (pinch > 0 && s > 0) rig.targetLogDist -= Math.log10(s / pinch) * 1.2
        pinch = s
        pan(m1.x - m0.x, m1.y - m0.y)
        return
      }
      p.x = e.clientX
      p.y = e.clientY
      if (mode === 'pan') pan(dx, dy)
      else if (mode === 'orbit') {
        rig.targetAz -= dx * 0.005
        rig.targetPolar -= dy * 0.005
      }
    }

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = 0
      if (pointers.size === 0) mode = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      takeControl()
      const lines = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1
      // Trackpad pinch arrives as ctrl+wheel with small deltas — give it a boost.
      const k = e.ctrlKey ? 0.008 : 0.0011
      rig.targetLogDist += MathUtils.clamp(e.deltaY * lines * k, -0.5, 0.5)
    }

    const noMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', noMenu)
    el.style.touchAction = 'none'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', noMenu)
    }
  }, [gl, camera])

  return null
}
