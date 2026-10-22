// The 4 nested scale tiers. Each one renders in its own unit so numbers on the GPU stay small.
// `range` is the camera distance (meters) over which the tier is the "active" one.
import { AU, KLY, LY, MLY } from './units'

export interface Tier {
  id: 'solar' | 'stellar' | 'galaxy' | 'local'
  name: string
  unit: number
  unitLabel: string
  range: [number, number]
}

export const TIERS: Tier[] = [
  { id: 'solar', name: 'Solar System', unit: AU, unitLabel: 'AU', range: [0, 0.05 * LY] },
  { id: 'stellar', name: 'Stellar Neighborhood', unit: LY, unitLabel: 'ly', range: [0.05 * LY, 2 * KLY] },
  { id: 'galaxy', name: 'Milky Way', unit: KLY, unitLabel: 'kly', range: [2 * KLY, 1 * MLY] },
  { id: 'local', name: 'Local Universe', unit: MLY, unitLabel: 'Mly', range: [1 * MLY, Infinity] },
]

export function tierForDistance(m: number): number {
  return Math.max(0, TIERS.findIndex((t) => m >= t.range[0] && m < t.range[1]))
}
