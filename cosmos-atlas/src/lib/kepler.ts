// Planet positions from Keplerian orbital elements.
// Source: JPL Solar System Dynamics, "Approximate Positions of the Planets", Table 1
// (valid 1800–2050 AD, accurate to well under a degree — perfect for visualisation).
// https://ssd.jpl.nasa.gov/planets/approx_pos.html

export interface OrbitalElements {
  // [value at J2000, rate per Julian century]
  a: [number, number] // semi-major axis (AU)
  e: [number, number] // eccentricity
  I: [number, number] // inclination (deg)
  L: [number, number] // mean longitude (deg)
  w: [number, number] // longitude of perihelion ϖ (deg)
  O: [number, number] // longitude of ascending node Ω (deg)
}

const DEG = Math.PI / 180
export const J2000 = 2451545.0

export function dateToJD(ms: number): number {
  return ms / 86400000 + 2440587.5
}

/** Elements evaluated at a given Julian Date. */
function elementsAt(el: OrbitalElements, jd: number) {
  const T = (jd - J2000) / 36525
  const get = ([v, r]: [number, number]) => v + r * T
  return { a: get(el.a), e: get(el.e), I: get(el.I) * DEG, L: get(el.L) * DEG, w: get(el.w) * DEG, O: get(el.O) * DEG }
}

/** Rotate an in-plane orbit point (x', y') into heliocentric ecliptic coordinates (AU). */
function toEcliptic(xp: number, yp: number, w: number, O: number, I: number, out: [number, number, number]) {
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I)
  out[0] = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp
  out[1] = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp
  out[2] = sw * sI * xp + cw * sI * yp
  return out
}

/** Heliocentric ecliptic position (AU) of a planet at Julian Date `jd`. */
export function planetPosition(el: OrbitalElements, jd: number, out: [number, number, number] = [0, 0, 0]) {
  const { a, e, I, L, w, O } = elementsAt(el, jd)
  const omega = w - O // argument of perihelion
  let M = (L - w) % (2 * Math.PI)
  if (M > Math.PI) M -= 2 * Math.PI
  if (M < -Math.PI) M += 2 * Math.PI
  // Solve Kepler's equation M = E − e·sin E with Newton iterations.
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 8; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-10) break
  }
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  return toEcliptic(xp, yp, omega, O, I, out)
}

/** Sample the full orbit ellipse (for drawing orbit lines), in ecliptic AU. */
export function orbitPath(el: OrbitalElements, jd: number, segments = 360): Float32Array {
  const { a, e, I, w, O } = elementsAt(el, jd)
  const omega = w - O
  const pts = new Float32Array(segments * 3)
  const p: [number, number, number] = [0, 0, 0]
  for (let i = 0; i < segments; i++) {
    const E = (i / segments) * Math.PI * 2
    toEcliptic(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), omega, O, I, p)
    pts[i * 3] = p[0]
    pts[i * 3 + 1] = p[1]
    pts[i * 3 + 2] = p[2]
  }
  return pts
}
