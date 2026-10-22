// Placeholder sky for Phase 1: procedural stars on a distant sphere with a Milky Way band.
// Phase 2 replaces this with the real HYG catalogue in true 3D positions.
import { useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { makeStarMaterial } from '../components/three/starMaterial'

const R = 1e5 // render units — effectively infinitely far from a camera sitting 10 units from the origin
const STAR_COLORS = ['#9bb0ff', '#aabfff', '#cad7ff', '#f8f7ff', '#fff4ea', '#ffd2a1', '#ffb56c'].map((c) => new Color(c))

export function BackgroundStars() {
  const { geo, mat } = useMemo(() => {
    const N = 9000
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const size = new Float32Array(N)
    // The galactic plane is tilted ~60° to the ecliptic.
    const tilt = (60 * Math.PI) / 180
    const v = new Vector3()
    for (let i = 0; i < N; i++) {
      const inBand = Math.random() < 0.45
      const lon = Math.random() * Math.PI * 2
      const lat = inBand
        ? (Math.random() + Math.random() + Math.random() - 1.5) * 0.18
        : Math.asin(Math.random() * 2 - 1)
      v.set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon))
      v.applyAxisAngle(new Vector3(1, 0, 0), tilt).multiplyScalar(R)
      pos.set([v.x, v.y, v.z], i * 3)
      // Few bright stars, many faint ones.
      const b = Math.pow(Math.random(), 6)
      const c = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
      const k = 0.25 + b * 0.9
      col.set([c.r * k, c.g * k, c.b * k], i * 3)
      size[i] = 1.2 + b * 3.2
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new Float32BufferAttribute(col, 3))
    g.setAttribute('size', new Float32BufferAttribute(size, 1))
    return { geo: g, mat: makeStarMaterial(Math.min(2, window.devicePixelRatio)) }
  }, [])
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />
}
