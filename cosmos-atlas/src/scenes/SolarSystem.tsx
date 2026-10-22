// Tier 1 — the Solar System, authored in AU.
// Planets use real orbits (JPL elements) at the real current date; sizes are true to scale,
// which is why labels exist (components/three/Labels.tsx): at true scale, planets are specks from afar.
import { useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  MathUtils,
  RingGeometry,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
  type Points,
  type Sprite,
  type Texture,
} from 'three'
import { TierGroup, tierScale } from '../components/three/TierGroup'
import { makeStarMaterial } from '../components/three/starMaterial'
import { OBJECTS, type CosmicObject } from '../data/objects'
import { orbitPath } from '../lib/kepler'
import { rig } from '../lib/rig'
import { eclipticToThree, moonOrbitPoint, sim } from '../lib/simulation'
import { makeGlowTexture, makeRingTexture, makeSurfaceTexture } from '../lib/textures'
import { AU, KM } from '../lib/units'
import { useAtlas } from '../store/useAtlas'

const DEG = Math.PI / 180

export function SolarSystem() {
  return (
    <TierGroup unit={AU}>
      <ambientLight intensity={0.035} />
      <Sun />
      {OBJECTS.filter((o) => o.kind !== 'star').map((o, i) => (
        <Body key={o.id} o={o} seed={i + 1} />
      ))}
      <Orbits />
      <AsteroidBelt />
    </TierGroup>
  )
}

/** Click on a mesh — but not at the end of a drag. */
function useBodyClick(id: string) {
  const travelTo = useAtlas((s) => s.travelTo)
  return (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return
    e.stopPropagation()
    travelTo(id)
  }
}

// ── Sun ───────────────────────────────────────────────────────────────────────
function Sun() {
  const o = OBJECTS[0]
  const r = (o.radiusKm * KM) / AU
  const surface = useMemo(() => makeSurfaceTexture(o.surface, 7, 512), [o])
  const glow = useMemo(() => makeGlowTexture(), [])
  const spin = useRef<Mesh>(null)
  const screenGlow = useRef<Sprite>(null)
  const onClick = useBodyClick('sun')

  useFrame(() => {
    spin.current!.rotation.y = ((sim.jd * 24) / o.rotationHours) % 1 * Math.PI * 2
    // Constant on-screen size, so the Sun still reads as a star from the outer planets and beyond.
    screenGlow.current!.scale.setScalar(0.055 / tierScale(AU))
  })

  return (
    <group>
      <mesh ref={spin} scale={r} onClick={onClick}>
        <sphereGeometry args={[1, 64, 32]} />
        {/* Colour above 1.0 + toneMapped=false = only the Sun feeds the bloom pass. */}
        <meshBasicMaterial map={surface} color={new Color(3.2, 2.5, 1.7)} toneMapped={false} />
      </mesh>
      <sprite scale={r * 6}>
        <spriteMaterial map={glow} color={new Color(1.3, 0.85, 0.5)} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={screenGlow}>
        <spriteMaterial map={glow} color={new Color(1.8, 1.4, 1.0)} blending={AdditiveBlending} depthWrite={false} sizeAttenuation={false} toneMapped={false} />
      </sprite>
      <pointLight intensity={3.2} decay={0} color="#fff4e6" />
    </group>
  )
}

// ── Planets & moons ───────────────────────────────────────────────────────────
function Body({ o, seed }: { o: CosmicObject; seed: number }) {
  const group = useRef<Group>(null)
  const spin = useRef<Mesh>(null)
  const r = (o.radiusKm * KM) / AU
  const procedural = useMemo(() => (o.textureUrl ? null : makeSurfaceTexture(o.surface, seed, o.kind === 'moon' ? 256 : o.id === 'earth' ? 1024 : 512)), [o, seed])
  const onClick = useBodyClick(o.id)

  useFrame(() => {
    group.current!.position.copy(sim.positions.get(o.id)!).divideScalar(AU)
    spin.current!.rotation.y = (((sim.jd * 24) / o.rotationHours) % 1) * Math.PI * 2
  }, -1)

  return (
    <group ref={group}>
      <group rotation={[0, 0, o.tiltDeg * DEG]}>
        <mesh ref={spin} scale={r} onClick={onClick}>
          <sphereGeometry args={[1, 64, 32]} />
          {o.textureUrl ? (
            <Suspense fallback={<meshStandardMaterial color={o.surface.kind === 'rocky' ? o.surface.base : '#888'} />}>
              <TexturedMaterial url={o.textureUrl} />
            </Suspense>
          ) : (
            <meshStandardMaterial map={procedural} roughness={1} metalness={0} />
          )}
        </mesh>
        {o.ring && <Rings o={o} />}
        {o.atmosphere && <Atmosphere o={o} />}
      </group>
    </group>
  )
}

function TexturedMaterial({ url }: { url: string }) {
  const map = useTexture(url) as Texture
  return <meshStandardMaterial map={map} roughness={1} metalness={0} />
}

function Rings({ o }: { o: CosmicObject }) {
  const { innerKm, outerKm } = o.ring!
  const tex = useMemo(() => makeRingTexture(), [])
  const geo = useMemo(() => {
    const g = new RingGeometry((innerKm * KM) / AU, (outerKm * KM) / AU, 160, 1)
    // Re-map UVs radially so the 1-D ring strip wraps around the planet.
    const pos = g.attributes.position as BufferAttribute
    const uv = g.attributes.uv as BufferAttribute
    const inner = (innerKm * KM) / AU, outer = (outerKm * KM) / AU
    for (let i = 0; i < pos.count; i++) {
      const rad = Math.hypot(pos.getX(i), pos.getY(i))
      uv.setXY(i, (rad - inner) / (outer - inner), 0.5)
    }
    return g
  }, [innerKm, outerKm])
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial map={tex} transparent side={DoubleSide} depthWrite={false} roughness={1} metalness={0} />
    </mesh>
  )
}

/** Fresnel rim light on the day side — cheap, and it sells the "real planet" look instantly. */
function Atmosphere({ o }: { o: CosmicObject }) {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: new Color(o.atmosphere) }, uSunDir: { value: new Vector3(1, 0, 0) } },
        vertexShader: /* glsl */ `
          #include <common>
          #include <logdepthbuf_pars_vertex>
          varying vec3 vN; varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            vN = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * w;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: /* glsl */ `
          #include <common>
          #include <logdepthbuf_pars_fragment>
          uniform vec3 uColor; uniform vec3 uSunDir;
          varying vec3 vN; varying vec3 vW;
          void main() {
            #include <logdepthbuf_fragment>
            vec3 V = normalize(cameraPosition - vW);
            float fres = pow(1.0 - max(dot(V, normalize(vN)), 0.0), 2.6);
            float lit = smoothstep(-0.25, 0.5, dot(normalize(vN), uSunDir));
            gl_FragColor = vec4(uColor * fres * lit * 1.3, 1.0);
          }`,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [o.atmosphere],
  )
  useFrame(() => {
    mat.uniforms.uSunDir.value.copy(sim.positions.get(o.id)!).negate().normalize()
  })
  return (
    <mesh scale={((o.radiusKm * KM) / AU) * 1.03} material={mat}>
      <sphereGeometry args={[1, 64, 32]} />
    </mesh>
  )
}

// ── Orbit lines ───────────────────────────────────────────────────────────────
const smooth = (a: number, b: number, x: number) => MathUtils.smoothstep(x, a, b)

function Orbits() {
  const show = useAtlas((s) => s.layers.orbits)
  return (
    <group visible={show}>
      {OBJECTS.filter((o) => o.elements).map((o) => (
        <PlanetOrbit key={o.id} o={o} />
      ))}
      {OBJECTS.filter((o) => o.moonOrbit).map((o) => (
        <MoonOrbit key={o.id} o={o} />
      ))}
    </group>
  )
}

function useOrbitMaterial() {
  return useMemo(() => new LineBasicMaterial({ color: '#a9c1ff', transparent: true, opacity: 0.2, depthWrite: false }), [])
}

function PlanetOrbit({ o }: { o: CosmicObject }) {
  const mat = useOrbitMaterial()
  const selected = useAtlas((s) => s.selectedId === o.id)
  const geo = useMemo(() => {
    const ecl = orbitPath(o.elements!, sim.jd, 512)
    const out = new Float32Array(ecl.length)
    const v = new Vector3()
    for (let i = 0; i < ecl.length; i += 3) {
      eclipticToThree(ecl[i], ecl[i + 1], ecl[i + 2], v)
      out.set([v.x, v.y, v.z], i)
    }
    return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(out, 3))
  }, [o])
  const aLog = Math.log10(o.elements!.a[0] * AU)
  useFrame(() => {
    // Fade out when zoomed right in (the line would slice through the planet) and when far beyond it.
    const near = smooth(aLog - 2.8, aLog - 1.9, rig.logDist)
    const far = 1 - smooth(aLog + 1.6, aLog + 2.2, rig.logDist)
    mat.opacity = (selected ? 0.5 : 0.2) * near * far
  })
  return <lineLoop geometry={geo} material={mat} />
}

function MoonOrbit({ o }: { o: CosmicObject }) {
  const mat = useOrbitMaterial()
  const group = useRef<Group>(null)
  const selected = useAtlas((s) => s.selectedId === o.id)
  const geo = useMemo(() => {
    const N = 256
    const out = new Float32Array(N * 3)
    const v = new Vector3()
    for (let i = 0; i < N; i++) {
      moonOrbitPoint(o.moonOrbit!, (i / N) * Math.PI * 2, v).divideScalar(AU)
      out.set([v.x, v.y, v.z], i * 3)
    }
    return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(out, 3))
  }, [o])
  const aLog = Math.log10(o.moonOrbit!.aKm * KM)
  useFrame(() => {
    const parent = sim.positions.get(o.parent!)!
    group.current!.position.copy(parent).divideScalar(AU)
    const near = smooth(aLog - 1.6, aLog - 1.0, rig.logDist)
    const far = 1 - smooth(aLog + 1.0, aLog + 1.5, Math.log10(rig.cameraPos.distanceTo(parent)))
    mat.opacity = (selected ? 0.45 : 0.16) * near * far
  }, -1)
  return (
    <group ref={group}>
      <lineLoop geometry={geo} material={mat} />
    </group>
  )
}

// ── Asteroid belt ─────────────────────────────────────────────────────────────
function AsteroidBelt() {
  const ref = useRef<Points>(null)
  const { geo, mat } = useMemo(() => {
    const N = 14000
    const pos = new Float32Array(N * 3)
    const col = new Float32Array(N * 3)
    const size = new Float32Array(N)
    const v = new Vector3()
    for (let i = 0; i < N; i++) {
      // Main belt: 2.1–3.3 AU, peaking near 2.7 AU, thin and slightly eccentric.
      const a = 2.1 + 1.2 * Math.pow(Math.random(), 0.9) * (0.6 + 0.4 * Math.random())
      const e = Math.random() * 0.15
      const M = Math.random() * Math.PI * 2
      const r = a * (1 - e * Math.cos(M))
      const inc = (Math.random() - 0.5) * 2 * Math.random() * 0.25
      const th = Math.random() * Math.PI * 2
      eclipticToThree(r * Math.cos(th), r * Math.sin(th), r * Math.sin(inc) * Math.sin(th + M), v)
      pos.set([v.x, v.y, v.z], i * 3)
      const t = 0.35 + Math.random() * 0.35
      col.set([t * 1.0, t * 0.9, t * 0.78], i * 3)
      size[i] = 1 + Math.random() * 1.2
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new Float32BufferAttribute(col, 3))
    g.setAttribute('size', new Float32BufferAttribute(size, 1))
    // Reuse the star material: soft round dots with per-point size and colour.
    return { geo: g, mat: makeStarMaterial(Math.min(2, window.devicePixelRatio)) }
  }, [])
  useFrame(() => {
    // The belt orbits as a whole (~4.6-year period at 2.7 AU) — a gentle cue that time is passing.
    ref.current!.rotation.y = (((sim.jd - 2451545) / (4.6 * 365.25)) % 1) * Math.PI * 2
    // Fade in as we leave Earth's neighbourhood; thin out from far away so it doesn't turn into a solid ring.
    mat.uniforms.uOpacity.value = smooth(9.9, 10.9, rig.logDist) * (0.8 - 0.5 * smooth(12, 12.9, rig.logDist))
  })
  return <points ref={ref} geometry={geo} material={mat} />
}
