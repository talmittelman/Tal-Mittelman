// The camera rig — the heart of the scale architecture.
//
// Why not a normal camera? The universe spans ~26 orders of magnitude, far beyond what 32-bit
// GPU floats can hold. So we use a "floating origin":
//   • The camera never moves: it sits CAM_RENDER_DIST units from the origin, looking at it.
//   • The point we orbit (`focus`, in meters, as precise JS doubles) is always drawn at the origin.
//   • Each scale tier is a group that gets shifted and scaled every frame so the world appears
//     around the camera (see TierGroup.tsx). Zooming = changing `logDist`, not moving the camera.
//
// `logDist` is log10 of the camera's distance from the focus in meters — working in log space is
// what makes one scroll gesture feel the same at 1,000 km and at 1 billion light-years.
import gsap from 'gsap'
import { Vector3 } from 'three'
import { OBJECT_BY_ID } from '../data/objects'
import { sim } from './simulation'
import { KM } from './units'

export const CAM_RENDER_DIST = 10
export const FOV = 45

interface Flight {
  from: Vector3
  toId: string
  fromLog: number
  toLog: number
  peakLog: number
  t: number
  tween: gsap.core.Tween
}

export const rig = {
  focusId: 'earth' as string | null,
  pan: new Vector3(), // meters, offset from the focused body
  focus: new Vector3(), // meters, the point we orbit (derived every frame)

  logDist: 7.5,
  targetLogDist: 7.5,
  az: 0,
  targetAz: 0,
  polar: 1.25,
  targetPolar: 1.25,
  minLogDist: 6,
  // Phase 1 stops just outside the planets (~330 AU). Later tiers raise this to the edge of the universe.
  maxLogDist: Math.log10(5e13),

  flight: null as Flight | null,

  // Derived every frame — read-only for everyone else.
  camDist: 1,
  dir: new Vector3(), // unit vector from focus to camera
  cameraPos: new Vector3(), // camera position in meters
}

const tmp = new Vector3()

export function bodyMinLogDist(id: string | null) {
  const o = id ? OBJECT_BY_ID.get(id) : undefined
  return o ? Math.log10(o.radiusKm * KM * 1.25) : 4
}

/** Nice framing distance for a body: it fills roughly a third of the screen height. */
export function framingLogDist(id: string) {
  const o = OBJECT_BY_ID.get(id)!
  return Math.log10(o.radiusKm * KM * (o.ring ? 9 : o.kind === 'star' ? 8 : 6.5))
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) // easeInOutCubic
const smootherstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Cinematic fly-to: pull back until both ends are in view, travel, then push in. */
export function flyTo(id: string, opts: { logDist?: number; duration?: number } = {}) {
  cancelFlight(false)
  const target = sim.positions.get(id)
  if (!target) return
  const from = rig.focus.clone()
  const fromLog = rig.logDist
  const toLog = opts.logDist ?? framingLogDist(id)
  const sep = Math.max(1, from.distanceTo(target))
  const peakLog = Math.max(fromLog, toLog, Math.log10(sep) + 0.25)
  const travel = Math.abs(peakLog - fromLog) + Math.abs(peakLog - toLog)
  const duration = opts.duration ?? Math.min(6, Math.max(1.8, 1.2 + travel * 0.45))

  const proxy = { t: 0 }
  const tween = gsap.to(proxy, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      if (rig.flight) rig.flight.t = proxy.t
    },
    onComplete: () => {
      rig.focusId = id
      rig.pan.set(0, 0, 0)
      rig.logDist = rig.targetLogDist = toLog
      rig.flight = null
    },
  })
  rig.flight = { from, toId: id, fromLog, toLog, peakLog, t: 0, tween }
  rig.minLogDist = Math.min(rig.minLogDist, bodyMinLogDist(id))
}

/**
 * Stop a flight where it is (user grabbed the controls). We adopt the destination as focus and
 * keep the current position as a pan offset, so nothing jumps.
 */
export function cancelFlight(adoptTarget = true) {
  const f = rig.flight
  if (!f) return
  f.tween.kill()
  rig.flight = null
  if (adoptTarget) {
    rig.focusId = f.toId
    rig.pan.copy(rig.focus).sub(sim.positions.get(f.toId)!)
    rig.targetLogDist = rig.logDist
    rig.minLogDist = bodyMinLogDist(f.toId)
  }
}

/** Advance the rig one frame. Runs before anything else reads the camera. */
export function updateRig(dt: number) {
  const f = rig.flight
  const k = 1 - Math.exp(-dt * 7) // frame-rate independent damping

  if (f) {
    const t = f.t
    rig.logDist =
      t < 0.5
        ? f.fromLog + (f.peakLog - f.fromLog) * ease(t * 2)
        : f.peakLog + (f.toLog - f.peakLog) * ease((t - 0.5) * 2)
    rig.targetLogDist = rig.logDist
    // Travel mostly happens while we're pulled back — that's what makes it read as one camera move.
    rig.focus.copy(f.from).lerp(sim.positions.get(f.toId)!, smootherstep(0.12, 0.88, t))
  } else {
    if (rig.focusId) rig.minLogDist = bodyMinLogDist(rig.focusId)
    rig.targetLogDist = Math.min(rig.maxLogDist, Math.max(rig.minLogDist, rig.targetLogDist))
    rig.logDist += (rig.targetLogDist - rig.logDist) * k
    const base = rig.focusId ? sim.positions.get(rig.focusId)! : tmp.set(0, 0, 0)
    rig.focus.copy(base).add(rig.pan)
  }

  rig.targetPolar = Math.min(Math.PI - 0.05, Math.max(0.05, rig.targetPolar))
  rig.az += (rig.targetAz - rig.az) * k
  rig.polar += (rig.targetPolar - rig.polar) * k

  rig.camDist = Math.pow(10, rig.logDist)
  rig.dir.setFromSphericalCoords(1, rig.polar, rig.az)
  rig.cameraPos.copy(rig.dir).multiplyScalar(rig.camDist).add(rig.focus)
}

/** Opening shot: start tight on Earth's lit side, then drift back to reveal the Moon's orbit. */
let introStarted = false
export function setupIntro() {
  if (introStarted) return // React StrictMode runs effects twice in dev
  introStarted = true
  const earth = sim.positions.get('earth')!
  const toSun = tmp.copy(earth).negate().normalize()
  const sunAz = Math.atan2(toSun.x, toSun.z)
  rig.focusId = 'earth'
  rig.az = rig.targetAz = sunAz + 1.15 // three-quarter lit, so the terminator shows
  rig.polar = rig.targetPolar = 1.22
  rig.logDist = rig.targetLogDist = Math.log10(2.4e7)
  const proxy = { v: rig.logDist }
  intro = [gsap.to(proxy, {
    v: Math.log10(1.1e9),
    duration: 7,
    delay: 0.6,
    ease: 'power2.inOut',
    onUpdate: () => {
      if (!rig.flight) rig.targetLogDist = proxy.v
    },
  }), gsap.to(rig, { targetAz: rig.targetAz + 0.6, duration: 7, delay: 0.6, ease: 'power2.inOut' })]
}

let intro: gsap.core.Tween[] = []
/** The user took the controls — never fight them. */
export function killIntro() {
  intro.forEach((t) => t.kill())
  intro = []
}
