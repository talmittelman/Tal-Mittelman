// The simulation clock and the live position of every body.
// Positions are heliocentric, in meters, already converted to the three.js frame
// (ecliptic plane = XZ, ecliptic north = +Y). Stored as doubles, never in the GPU.
import { Vector3 } from 'three'
import { OBJECTS, type CosmicObject, type MoonOrbit } from '../data/objects'
import { dateToJD, planetPosition } from './kepler'
import { AU, KM } from './units'

const DEG = Math.PI / 180

export const sim = {
  jd: dateToJD(Date.now()),
  /** Simulated seconds per real second. */
  timeScale: 60,
  positions: new Map<string, Vector3>(OBJECTS.map((o) => [o.id, new Vector3()])),
}

/** Ecliptic (x, y, z) → three.js (x, z, −y). */
export function eclipticToThree(x: number, y: number, z: number, out: Vector3) {
  return out.set(x, z, -y)
}

const tmp: [number, number, number] = [0, 0, 0]
const offset = new Vector3()

// Parents must be computed before their moons.
const ORDERED: CosmicObject[] = [...OBJECTS].sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0))

export function updatePositions(jd: number) {
  sim.jd = jd
  for (const o of ORDERED) {
    const out = sim.positions.get(o.id)!
    if (o.elements) {
      planetPosition(o.elements, jd, tmp)
      eclipticToThree(tmp[0] * AU, tmp[1] * AU, tmp[2] * AU, out)
    } else if (o.moonOrbit && o.parent) {
      moonOffset(o, jd, offset)
      out.copy(sim.positions.get(o.parent)!).add(offset)
    } else {
      out.set(0, 0, 0) // the Sun
    }
  }
}

/** Moon position relative to its planet (meters, three.js frame). Circular-orbit approximation. */
function moonOffset(o: CosmicObject, jd: number, out: Vector3) {
  const m = o.moonOrbit!
  let angle: number
  if (o.id === 'moon') {
    // Real lunar phase: elongation grows by 360° every synodic month (29.53 d), counted from
    // the new moon of 2000-01-06 18:14 UT. Moon longitude = Sun longitude (seen from Earth) + elongation.
    const earth = sim.positions.get('earth')!
    const sunLon = Math.atan2(-earth.z, earth.x) + Math.PI // ecliptic (x, y) = three (x, −z)
    angle = sunLon + ((jd - 2451550.26) / 29.530588) * 2 * Math.PI
  } else {
    angle = m.phaseDeg * DEG + ((jd - 2451545) / m.periodDays) * 2 * Math.PI
  }
  return moonOrbitPoint(m, angle, out)
}

/** A point on a moon's (circular, tilted) orbit at a given orbital angle — also used to draw the orbit line. */
export function moonOrbitPoint(m: MoonOrbit, angle: number, out: Vector3) {
  const r = m.aKm * KM
  const i = m.inclinationDeg * DEG
  const node = m.nodeDeg * DEG
  // Point on a circle, tilted by `i` around the node line, then rotated to the node longitude.
  const u = angle - node
  const xp = r * Math.cos(u)
  const yp = r * Math.sin(u) * Math.cos(i)
  const zp = r * Math.sin(u) * Math.sin(i)
  const x = xp * Math.cos(node) - yp * Math.sin(node)
  const y = xp * Math.sin(node) + yp * Math.cos(node)
  return eclipticToThree(x, y, zp, out)
}

updatePositions(sim.jd)
