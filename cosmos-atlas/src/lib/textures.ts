// Procedural planet textures, painted on a canvas once at startup.
// These are placeholders with taste: swap in real or AI-generated maps by setting
// `textureUrl` on an object in data/objects.ts.
import { CanvasTexture, Color, SRGBColorSpace, type Texture } from 'three'
import type { SurfaceStyle } from '../data/objects'

// Small, seeded 3D value noise. Sampling on the sphere (not the flat map) avoids seams and pole pinching.
function makeNoise(seed: number) {
  const perm = new Uint8Array(512)
  let s = seed * 9301 + 49297
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const p = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const vals = new Float32Array(256).map(() => rand())
  const fade = (t: number) => t * t * (3 - 2 * t)
  const h = (x: number, y: number, z: number) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]]
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi)
    const l = (a: number, b: number, t: number) => a + (b - a) * t
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    )
  }
  return (x: number, y: number, z: number, octaves = 5) => {
    let sum = 0, amp = 0.5, f = 1
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * f, y * f, z * f)
      f *= 2.03
      amp *= 0.5
    }
    return sum / (1 - Math.pow(0.5, octaves)) // ≈ 0..1
  }
}

const hex = (c: string) => new Color(c)
const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, Math.min(1, Math.max(0, t)))

export function makeSurfaceTexture(style: SurfaceStyle, seed: number, width = 512): Texture {
  const W = width, H = width / 2
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const fbm = makeNoise(seed)

  const paint = (fn: (x: number, y: number, z: number, lat: number) => Color) => {
    for (let j = 0; j < H; j++) {
      const lat = (0.5 - j / H) * Math.PI
      const cl = Math.cos(lat), sl = Math.sin(lat)
      for (let i = 0; i < W; i++) {
        const lon = (i / W) * Math.PI * 2
        const c = fn(cl * Math.cos(lon), sl, cl * Math.sin(lon), lat)
        const k = (j * W + i) * 4
        img.data[k] = c.r * 255
        img.data[k + 1] = c.g * 255
        img.data[k + 2] = c.b * 255
        img.data[k + 3] = 255
      }
    }
  }

  switch (style.kind) {
    case 'sun': {
      const a = hex('#fff1c9'), b = hex('#ffb347'), c = hex('#ff7a1a')
      paint((x, y, z) => {
        const n = fbm(x * 9, y * 9, z * 9, 4)
        return n > 0.5 ? mix(a, b, (0.75 - n) * 3) : mix(b, c, (0.5 - n) * 3)
      })
      break
    }
    case 'rocky': {
      const base = hex(style.base), acc = hex(style.accent), dark = hex(style.dark)
      paint((x, y, z) => {
        const n = fbm(x * 3, y * 3, z * 3)
        const crater = fbm(x * 14 + 7, y * 14, z * 14, 3)
        let c = n > 0.5 ? mix(base, acc, (n - 0.5) * 3) : mix(base, dark, (0.5 - n) * 3)
        if (crater > 0.68) c = mix(c, dark, (crater - 0.68) * 4)
        return c
      })
      break
    }
    case 'banded': {
      const cols = style.colors.map(hex)
      paint((x, y, z, lat) => {
        const warp = (fbm(x * 4, y * 4, z * 4) - 0.5) * style.turbulence
        const b = (Math.sin((lat + warp * 0.35) * 14) * 0.5 + 0.5) * (cols.length - 1)
        const i = Math.floor(b)
        const c = mix(cols[i], cols[Math.min(cols.length - 1, i + 1)], b - i)
        return mix(c, cols[0], (fbm(x * 20, y * 40, z * 20, 2) - 0.5) * 0.4)
      })
      break
    }
    case 'ice': {
      const base = hex(style.base), acc = hex(style.accent)
      paint((x, y, z, lat) => {
        const n = fbm(x * 2 + Math.sin(lat * 6), y * 6, z * 2, 4)
        return mix(base, acc, (n - 0.35) * 1.6)
      })
      break
    }
    case 'earth': {
      const deep = hex('#0b2a5a'), shallow = hex('#1d5d9b'), land = hex('#3f6b35'), desert = hex('#b59a63')
      const ice = hex('#eef4f8'), cloud = hex('#ffffff')
      paint((x, y, z, lat) => {
        const n = fbm(x * 2.2, y * 2.2, z * 2.2, 6)
        const a = Math.abs(lat)
        let c: Color
        if (n < 0.52) c = mix(deep, shallow, (n - 0.35) * 5)
        else c = mix(land, desert, (fbm(x * 5 + 3, y * 5, z * 5, 3) - 0.4) * 2.5 * (1 - a))
        if (a > 1.2) c = mix(c, ice, (a - 1.2) * 4)
        const cl = fbm(x * 4 + 11, y * 7, z * 4, 5)
        return mix(c, cloud, (cl - 0.55) * 2.2)
      })
      break
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Saturn's rings as a 1-D radial strip: C ring (faint), B ring (bright), Cassini Division, A ring. */
export function makeRingTexture(): Texture {
  const W = 1024
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 1
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(W, 1)
  const fbm = makeNoise(42)
  const inner = 74_500, outer = 137_000
  for (let i = 0; i < W; i++) {
    const r = inner + (i / W) * (outer - inner)
    let a = 0
    if (r < 92_000) a = 0.18 // C ring
    else if (r < 117_580) a = 0.85 // B ring
    else if (r < 122_170) a = 0.05 // Cassini Division
    else if (r < 133_400) a = 0.6 // A ring
    else if (r < 133_700) a = 0.05 // Encke Gap
    else a = 0.5
    a *= 0.7 + 0.3 * fbm(i * 0.08, 0, 0, 3)
    const tone = 0.75 + 0.25 * fbm(i * 0.02, 5, 5, 2)
    img.data[i * 4] = 230 * tone
    img.data[i * 4 + 1] = 214 * tone
    img.data[i * 4 + 2] = 180 * tone
    img.data[i * 4 + 3] = a * 255
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Soft radial glow for sprites (Sun corona, distant bright points). */
export function makeGlowTexture(inner = 'rgba(255,240,210,1)', outer = 'rgba(255,170,80,0)'): Texture {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.15, inner.replace(/[\d.]+\)$/, '0.55)'))
  g.addColorStop(0.45, outer.replace(/[\d.]+\)$/, '0.12)'))
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}
