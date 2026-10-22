// Curated showcase objects — every clickable, searchable thing in the atlas lives here.
// Phase 1: the Sun, 8 planets and 7 major moons. Stars and galaxies get added in later phases.
//
// Facts are deliberately conservative. Anything uncertain should be marked `// TODO: verify`.
import type { OrbitalElements } from '../lib/kepler'

export type BodyKind = 'star' | 'planet' | 'moon'

/** Look of the procedurally generated surface (until real/AI-generated textures are dropped in). */
export type SurfaceStyle =
  | { kind: 'sun' }
  | { kind: 'rocky'; base: string; accent: string; dark: string }
  | { kind: 'banded'; colors: string[]; turbulence: number }
  | { kind: 'earth' }
  | { kind: 'ice'; base: string; accent: string }

export interface MoonOrbit {
  aKm: number // orbital radius
  periodDays: number // sidereal period (negative = retrograde)
  inclinationDeg: number // tilt of the orbit plane relative to the ecliptic (visual approximation)
  nodeDeg: number // where the orbit plane crosses the ecliptic (visual approximation)
  phaseDeg: number // starting angle — NOT a real ephemeris, except the Moon (see simulation.ts)
}

export interface CosmicObject {
  id: string
  name: string
  type: string // shown in the info panel, e.g. "Gas giant"
  kind: BodyKind
  radiusKm: number
  parent?: string
  elements?: OrbitalElements
  moonOrbit?: MoonOrbit
  tiltDeg: number
  rotationHours: number // negative = retrograde spin
  surface: SurfaceStyle
  /** Optional image in /public/textures — drop an AI-generated equirectangular map here to override the procedural look. */
  textureUrl?: string
  ring?: { innerKm: number; outerKm: number }
  atmosphere?: string // rim-glow colour
  orbitPeriod?: string
  fact: string
}

// JPL approximate elements (see lib/kepler.ts for the source).
const el = (a: number[], e: number[], I: number[], L: number[], w: number[], O: number[]): OrbitalElements => ({
  a: a as [number, number], e: e as [number, number], I: I as [number, number],
  L: L as [number, number], w: w as [number, number], O: O as [number, number],
})

export const OBJECTS: CosmicObject[] = [
  {
    id: 'sun', name: 'Sun', type: 'G-type main-sequence star', kind: 'star',
    radiusKm: 695_700, tiltDeg: 7.25, rotationHours: 609.1,
    surface: { kind: 'sun' },
    fact: 'It holds 99.86% of the Solar System’s mass, and its fusion powers nearly all life on Earth.',
  },
  {
    id: 'mercury', name: 'Mercury', type: 'Terrestrial planet', kind: 'planet',
    radiusKm: 2439.7, tiltDeg: 0.03, rotationHours: 1407.6, orbitPeriod: '88 days',
    elements: el([0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749],
      [252.2503235, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]),
    surface: { kind: 'rocky', base: '#8c8781', accent: '#a9a39b', dark: '#5d5955' },
    fact: 'The smallest planet has an oversized iron core that fills most of its interior — a clue to a violent early history.',
  },
  {
    id: 'venus', name: 'Venus', type: 'Terrestrial planet', kind: 'planet',
    radiusKm: 6051.8, tiltDeg: 177.4, rotationHours: -5832.5, orbitPeriod: '225 days',
    elements: el([0.72333566, 0.0000039], [0.00677672, -0.00004107], [3.39467605, -0.0007889],
      [181.9790995, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]),
    surface: { kind: 'banded', colors: ['#e8d3a8', '#d9bd8a', '#f0dfba', '#cfae7a'], turbulence: 0.9 },
    atmosphere: '#ffd9a0',
    fact: 'A runaway greenhouse effect makes it the hottest planet (~465 °C), even though Mercury is closer to the Sun.',
  },
  {
    id: 'earth', name: 'Earth', type: 'Terrestrial planet', kind: 'planet',
    radiusKm: 6371, tiltDeg: 23.44, rotationHours: 23.934, orbitPeriod: '365.25 days',
    // JPL gives the Earth–Moon barycentre; the ~4,700 km offset is invisible at these scales.
    elements: el([1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668],
      [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]),
    surface: { kind: 'earth' },
    atmosphere: '#6fb7ff',
    fact: 'The only world known to host life — so far.',
  },
  {
    id: 'mars', name: 'Mars', type: 'Terrestrial planet', kind: 'planet',
    radiusKm: 3389.5, tiltDeg: 25.19, rotationHours: 24.623, orbitPeriod: '687 days',
    elements: el([1.52371034, 0.00001847], [0.0933941, 0.00007882], [1.84969142, -0.00813131],
      [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]),
    surface: { kind: 'rocky', base: '#b5583a', accent: '#d08a5f', dark: '#6e3324' },
    atmosphere: '#ff9a6a',
    fact: 'Ancient river valleys and dried lake beds show that liquid water once flowed across its surface.',
  },
  {
    id: 'jupiter', name: 'Jupiter', type: 'Gas giant', kind: 'planet',
    radiusKm: 69_911, tiltDeg: 3.13, rotationHours: 9.925, orbitPeriod: '11.9 years',
    elements: el([5.202887, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714],
      [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]),
    surface: { kind: 'banded', colors: ['#d8c3a5', '#b98d62', '#efe3cf', '#a8714c', '#e2cfb2', '#8f5f3f'], turbulence: 0.5 },
    atmosphere: '#f3dcb8',
    fact: 'More than twice as massive as all the other planets combined, its gravity shaped the architecture of the Solar System.',
  },
  {
    id: 'saturn', name: 'Saturn', type: 'Gas giant', kind: 'planet',
    radiusKm: 58_232, tiltDeg: 26.73, rotationHours: 10.656, orbitPeriod: '29.5 years',
    elements: el([9.53667594, -0.0012506], [0.05386179, -0.00050991], [2.48599187, 0.00193609],
      [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]),
    surface: { kind: 'banded', colors: ['#e9d8b0', '#d4bc8a', '#f2e6c8', '#c4a774', '#e0cc9e'], turbulence: 0.25 },
    ring: { innerKm: 74_500, outerKm: 137_000 },
    atmosphere: '#f5e2b5',
    fact: 'Its rings span about 270,000 km yet are mostly only tens of meters thick — made largely of water ice.',
  },
  {
    id: 'uranus', name: 'Uranus', type: 'Ice giant', kind: 'planet',
    radiusKm: 25_362, tiltDeg: 97.77, rotationHours: -17.24, orbitPeriod: '84 years',
    elements: el([19.18916464, -0.00196176], [0.04725744, -0.00004397], [0.77263783, -0.00242939],
      [313.23810451, 428.48202785], [170.9542763, 0.40805281], [74.01692503, 0.04240589]),
    surface: { kind: 'ice', base: '#a6dbe3', accent: '#c3eaef' },
    atmosphere: '#bff3ff',
    fact: 'Tilted about 98°, it rolls around the Sun on its side — each pole gets 42 years of continuous sunlight.',
  },
  {
    id: 'neptune', name: 'Neptune', type: 'Ice giant', kind: 'planet',
    radiusKm: 24_622, tiltDeg: 28.32, rotationHours: 16.11, orbitPeriod: '165 years',
    elements: el([30.06992276, 0.00026291], [0.00859048, 0.00005105], [1.77004347, 0.00035372],
      [-55.12002969, 218.45945325], [44.96476227, -0.32241464], [131.78422574, -0.00508664]),
    surface: { kind: 'ice', base: '#3f63d1', accent: '#6f8ff0' },
    atmosphere: '#7fa4ff',
    fact: 'The first planet found by mathematical prediction (1846) rather than by chance — and home to the fastest winds in the Solar System.',
  },

  // ── Major moons ────────────────────────────────────────────────────────────
  {
    id: 'moon', name: 'Moon', type: 'Moon of Earth', kind: 'moon', parent: 'earth',
    radiusKm: 1737.4, tiltDeg: 6.7, rotationHours: 655.7, orbitPeriod: '27.3 days',
    moonOrbit: { aKm: 384_400, periodDays: 27.321661, inclinationDeg: 5.14, nodeDeg: 0, phaseDeg: 0 },
    surface: { kind: 'rocky', base: '#9a9893', accent: '#b8b6b0', dark: '#5c5b58' },
    fact: 'Likely formed from debris of a giant impact, it steadies Earth’s axial tilt and keeps our climate stable.',
  },
  {
    id: 'io', name: 'Io', type: 'Moon of Jupiter', kind: 'moon', parent: 'jupiter',
    radiusKm: 1821.6, tiltDeg: 0, rotationHours: 42.46, orbitPeriod: '1.8 days',
    moonOrbit: { aKm: 421_700, periodDays: 1.769138, inclinationDeg: 2.2, nodeDeg: 100, phaseDeg: 40 },
    surface: { kind: 'rocky', base: '#d9c45a', accent: '#f0e08a', dark: '#8a5a24' },
    fact: 'The most volcanically active body in the Solar System, heated from inside by Jupiter’s tidal squeezing.',
  },
  {
    id: 'europa', name: 'Europa', type: 'Moon of Jupiter', kind: 'moon', parent: 'jupiter',
    radiusKm: 1560.8, tiltDeg: 0, rotationHours: 85.23, orbitPeriod: '3.6 days',
    moonOrbit: { aKm: 671_034, periodDays: 3.551181, inclinationDeg: 2.2, nodeDeg: 100, phaseDeg: 160 },
    surface: { kind: 'ice', base: '#d8cbb4', accent: '#a87a55' },
    fact: 'A global saltwater ocean hides beneath its ice shell — one of the best places to look for life beyond Earth.',
  },
  {
    id: 'ganymede', name: 'Ganymede', type: 'Moon of Jupiter', kind: 'moon', parent: 'jupiter',
    radiusKm: 2634.1, tiltDeg: 0, rotationHours: 171.7, orbitPeriod: '7.2 days',
    moonOrbit: { aKm: 1_070_412, periodDays: 7.154553, inclinationDeg: 2.2, nodeDeg: 100, phaseDeg: 260 },
    surface: { kind: 'rocky', base: '#8f877c', accent: '#b9b0a2', dark: '#5a534b' },
    fact: 'The largest moon in the Solar System — bigger than Mercury — and the only moon with its own magnetic field.',
  },
  {
    id: 'callisto', name: 'Callisto', type: 'Moon of Jupiter', kind: 'moon', parent: 'jupiter',
    radiusKm: 2410.3, tiltDeg: 0, rotationHours: 400.5, orbitPeriod: '16.7 days',
    moonOrbit: { aKm: 1_882_709, periodDays: 16.689018, inclinationDeg: 2.0, nodeDeg: 100, phaseDeg: 330 },
    surface: { kind: 'rocky', base: '#5f564c', accent: '#8a8073', dark: '#3a332c' },
    fact: 'One of the most heavily cratered surfaces known — a nearly untouched record of four billion years of impacts.',
  },
  {
    id: 'titan', name: 'Titan', type: 'Moon of Saturn', kind: 'moon', parent: 'saturn',
    radiusKm: 2574.7, tiltDeg: 0, rotationHours: 382.7, orbitPeriod: '15.9 days',
    moonOrbit: { aKm: 1_221_870, periodDays: 15.945421, inclinationDeg: 27.5, nodeDeg: 169, phaseDeg: 70 },
    surface: { kind: 'banded', colors: ['#d6a04a', '#c88c3a', '#e0b062'], turbulence: 0.15 },
    atmosphere: '#e9b25c',
    fact: 'The only moon with a thick atmosphere, and the only other world with stable surface liquids — lakes of methane and ethane.',
  },
  {
    id: 'triton', name: 'Triton', type: 'Moon of Neptune', kind: 'moon', parent: 'neptune',
    radiusKm: 1353.4, tiltDeg: 0, rotationHours: 141.0, orbitPeriod: '5.9 days (retrograde)',
    moonOrbit: { aKm: 354_759, periodDays: -5.876854, inclinationDeg: 130, nodeDeg: 210, phaseDeg: 120 },
    surface: { kind: 'ice', base: '#d9c9c0', accent: '#b98f86' },
    fact: 'It orbits backwards, which suggests it is a captured Kuiper Belt object — and it has active nitrogen geysers.',
  },
]

export const OBJECT_BY_ID = new Map(OBJECTS.map((o) => [o.id, o]))
