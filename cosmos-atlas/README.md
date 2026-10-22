# Cosmos Atlas

An interactive, cinematic 3D map of the universe. Fly from Earth to the edge of the observable universe in one continuous camera move.

**Status: Phase 1 of 5 complete.** The Solar System tier is live.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in /dist, ready for Vercel or GitHub Pages
```

Add `?debug` to the URL to get `window.atlas` in the console. For example, `atlas.flyTo('saturn')`.

---

## What works now (Phase 1)

- **Real Solar System at today's date.** Planet positions come from JPL orbital elements, so the planets sit where they actually are right now. The Moon's phase is real too.
- **True-scale sizes.** Planets are real-size spheres, which is why labels exist: from far away a true-scale planet is a speck.
- **Sun, 8 planets, 7 major moons, asteroid belt and orbit lines.** Earth, Venus, Mars, the giants and Titan have an atmosphere rim glow. Saturn has rings with the Cassini Division.
- **Controls.** Drag to orbit, scroll or pinch to zoom, right-drag (or shift-drag) to pan, all with smooth damping.
- **Click to fly.** Click any name or planet. The camera pulls back, travels and pushes in as one cinematic move.
- **Info panel.** Shows type, live distance from Earth, light-travel time, diameter, year and day length, and a one-line "why it matters" fact. It becomes a bottom sheet on phones.
- **Live HUD.** Distance from Earth, an auto-scaling scale bar, the current tier, and the simulation date.
- **Time controls.** Pause, 1 min/s, 1 hr/s, 1 day/s, 1 week/s.
- **Layer toggles.** Orbits and labels.

## Roadmap

| Phase | Scope |
|---|---|
| ✅ 1 | Scaffold, Solar System tier, camera controls, click-to-fly |
| 2 | Stellar Neighborhood: ~100k real stars from the HYG catalogue, crossfade between tiers |
| 3 | Milky Way and Local Universe tiers, search bar |
| 4 | Cinematic Tour (60-second Earth-to-cosmic-web journey), vignette and grain, UI polish, mobile pass |
| 5 | Screenshots, deploy config, portfolio case-study blurb |

---

## Key decisions (the "why")

### 1. The camera never moves. The universe moves around it (floating origin)
GPUs work in 32-bit floats, which hold only about 7 significant digits. The universe spans about 26 orders of magnitude. If you put the camera at Neptune in meters, everything jitters.

So the camera always sits 10 units from the origin, looking at it. Whatever you're focused on is drawn at the origin. All real positions are kept in meters as 64-bit JavaScript numbers, which are precise enough for the whole universe. Every frame the world is shifted and scaled around the camera. See `src/lib/rig.ts` and `src/components/three/TierGroup.tsx`.

### 2. Zoom happens in log space
`rig.logDist` is log₁₀ of the camera's distance in meters. One scroll notch multiplies the distance by the same factor whether you're at 1,000 km or 1 billion light-years, so the zoom feels the same at every scale.

### 3. Four scale tiers, each in its own unit
`src/lib/tiers.ts` defines Solar System (AU), Stellar Neighborhood (light-years), Milky Way (thousand ly) and Local Universe (million ly). Each tier's content is authored in its own unit, so the numbers stay small and readable.

### 4. Logarithmic depth buffer
It keeps near and far objects sorting correctly when one scene holds both a moon 2,000 km away and an orbit 4 billion km away. The custom shaders include three.js's `logdepthbuf` chunks for this reason.

### 5. Custom controls instead of OrbitControls
OrbitControls moves the camera through the world, but this camera stays put. `src/controls/RigControls.tsx` only nudges the rig's targets, and the rig eases toward them.

### 6. Per-frame data lives outside React
Positions and camera values change 60 times a second, and re-rendering React that often would kill performance. They live in plain modules (`lib/simulation.ts`, `lib/rig.ts`). The HUD gets a copy about 10 times a second through Zustand.

### 7. Restrained bloom
Only colours brighter than 1.0 bloom, and right now that's just the Sun. This keeps the NASA-meets-Interstellar look clean instead of glowy.

---

## Make it yours: swap in AI-generated textures

Planet surfaces are procedural placeholders, painted on a canvas at startup (`src/lib/textures.ts`). To use your own (Midjourney, Magnific, Higgsfield…):

1. Generate an **equirectangular** map with a 2:1 aspect ratio, e.g. 2048×1024.
2. Save it to `public/textures/jupiter.jpg`.
3. In `src/data/objects.ts`, add `textureUrl: 'textures/jupiter.jpg'` to Jupiter (no leading slash, so it also works on GitHub Pages).

## Project structure

```
src/
  data/objects.ts          curated objects with facts (the source of truth for clicks and search)
  lib/
    rig.ts                 floating-origin camera rig, fly-to, intro move
    simulation.ts          clock and live positions of every body (meters, doubles)
    kepler.ts              JPL orbital elements → positions and orbit paths
    tiers.ts               the 4 scale tiers
    units.ts               AU, ly, … and distance formatting
    textures.ts            procedural planet, ring and glow textures
  scenes/
    CosmosCanvas.tsx       canvas, per-frame driver, post-processing
    SolarSystem.tsx        tier 1
    BackgroundStars.tsx    placeholder sky (replaced by real stars in Phase 2)
  components/three/        TierGroup, Labels (one projected DOM layer), star material
  components/ui/           HUD and info panel
  controls/RigControls.tsx mouse, trackpad and touch input
  store/useAtlas.ts        Zustand app state
```

## Known issues and notes

- **Moon orbits are simplified.** They're circular and tilted to approximate planes. Apart from Earth's Moon, which uses the real lunar phase, the moons' starting angles are illustrative, not ephemerides.
- **Orbit lines fade near their body.** At very close zoom an orbit line would cut through its planet, so it fades out.
- **The JS bundle is about 380 kB gzipped**, mostly three.js. Code-splitting can come in Phase 4.

## Data sources

- **Planet orbits:** NASA JPL Solar System Dynamics, [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- **Physical data** (radii, rotation, tilt): NASA Planetary Fact Sheets
- **Saturn ring radii:** NASA / JPL Cassini mission
