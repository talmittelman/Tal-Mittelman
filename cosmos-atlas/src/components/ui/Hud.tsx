// The heads-up display: wordmark, live scale bar, distance readout, time and layer controls.
import { useEffect, useState } from 'react'
import { TIERS } from '../../lib/tiers'
import { formatDistance, formatLightTime } from '../../lib/units'
import { TIME_SCALES, useAtlas, type Layer } from '../../store/useAtlas'

const jdToDate = (jd: number) => new Date((jd - 2440587.5) * 86400000)

export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-7">
      <header className="flex items-start justify-between">
        <Wordmark />
      </header>
      <footer className="flex flex-wrap items-end justify-between gap-4">
        <Readout />
        <Hint />
        <Controls />
      </footer>
    </div>
  )
}

function Wordmark() {
  const tier = useAtlas((s) => s.hud.tier)
  return (
    <div>
      <h1 className="text-[15px] font-light tracking-[0.5em] text-white sm:text-[17px]">COSMOS ATLAS</h1>
      <div className="mt-2 flex items-center gap-3">
        <span className="micro">
          Tier {tier + 1} / {TIERS.length}
        </span>
        <span className="h-px w-6 bg-white/25" />
        <span className="micro !text-white/80">{TIERS[tier].name}</span>
      </div>
    </div>
  )
}

function Readout() {
  const { earthDist, scalePx, scaleLabel } = useAtlas((s) => s.hud)
  return (
    <div className="min-w-[200px]">
      <div className="micro">Distance from Earth</div>
      <div className="mt-1 text-[22px] font-light tabular-nums tracking-wide text-white sm:text-[26px]">{formatDistance(earthDist)}</div>
      <div className="micro mt-0.5 !tracking-[0.18em] !normal-case">{formatLightTime(earthDist)} away</div>
      <div className="mt-5">
        <div className="relative h-2 border-x border-white/60" style={{ width: Math.round(scalePx) }}>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/60" />
        </div>
        <div className="micro mt-1.5 !text-white/70">{scaleLabel}</div>
      </div>
    </div>
  )
}

/** Gesture hint — fades away once the user starts exploring. */
function Hint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const hide = () => setVisible(false)
    const t = setTimeout(hide, 14000)
    window.addEventListener('wheel', hide, { once: true })
    window.addEventListener('pointerdown', hide, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('wheel', hide)
      window.removeEventListener('pointerdown', hide)
    }
  }, [])
  return (
    <div className={`micro hidden text-center transition-opacity duration-1000 lg:block ${visible ? 'opacity-100' : 'opacity-0'}`}>
      Drag to orbit · Scroll to zoom · Right-drag to pan · Click a name to travel
    </div>
  )
}

function Controls() {
  const jd = useAtlas((s) => s.hud.jd)
  const timeScale = useAtlas((s) => s.timeScale)
  const setTimeScale = useAtlas((s) => s.setTimeScale)
  const layers = useAtlas((s) => s.layers)
  const toggle = useAtlas((s) => s.toggleLayer)
  const date = jdToDate(jd)
  return (
    <div className="glass pointer-events-auto rounded-xl px-4 py-3">
      <div className="flex items-baseline justify-between gap-6">
        <span className="micro">Date (UTC)</span>
        <span className="text-[12px] tabular-nums tracking-wider text-white/85">
          {date.toISOString().slice(0, 10)} · {date.toISOString().slice(11, 16)}
        </span>
      </div>
      <div className="mt-2.5 flex gap-1">
        {TIME_SCALES.map((t) => (
          <Chip key={t.label} active={timeScale === t.value} onClick={() => setTimeScale(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-1 border-t border-white/10 pt-2.5">
        <span className="micro mr-2">Layers</span>
        {(['orbits', 'labels'] as Layer[]).map((l) => (
          <Chip key={l} active={layers[l]} onClick={() => toggle(l)}>
            {l}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-md border px-2 py-1 text-[9.5px] uppercase tracking-[0.16em] transition-colors ${
        active ? 'border-white/40 bg-white/10 text-white' : 'border-transparent text-white/45 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  )
}
