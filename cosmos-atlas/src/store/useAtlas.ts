// App state that the UI reacts to. Per-frame camera/simulation numbers live in lib/rig.ts and
// lib/simulation.ts instead (re-rendering React 60× a second would kill performance) and are
// copied into `hud` here ~10× per second.
import { create } from 'zustand'
import { flyTo } from '../lib/rig'
import { sim } from '../lib/simulation'

export type Layer = 'orbits' | 'labels'

export const TIME_SCALES = [
  { label: 'Pause', value: 0 },
  { label: '1 min/s', value: 60 },
  { label: '1 hr/s', value: 3600 },
  { label: '1 day/s', value: 86400 },
  { label: '1 wk/s', value: 604800 },
] as const

interface Hud {
  earthDist: number // camera → Earth, meters
  selectedDist: number // selected object → Earth, meters
  scalePx: number
  scaleLabel: string
  tier: number
  jd: number
}

interface AtlasState {
  selectedId: string | null
  layers: Record<Layer, boolean>
  timeScale: number
  hud: Hud
  select: (id: string | null) => void
  travelTo: (id: string) => void
  toggleLayer: (l: Layer) => void
  setTimeScale: (v: number) => void
  setHud: (h: Hud) => void
}

export const useAtlas = create<AtlasState>((set) => ({
  selectedId: null,
  layers: { orbits: true, labels: true },
  timeScale: sim.timeScale,
  hud: { earthDist: 0, selectedDist: 0, scalePx: 0, scaleLabel: '', tier: 0, jd: sim.jd },
  select: (id) => set({ selectedId: id }),
  travelTo: (id) => {
    set({ selectedId: id })
    flyTo(id)
  },
  toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
  setTimeScale: (v) => {
    sim.timeScale = v
    set({ timeScale: v })
  },
  setHud: (hud) => set({ hud }),
}))
