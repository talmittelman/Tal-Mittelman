// Side panel for the selected object (bottom sheet on phones).
import { OBJECT_BY_ID } from '../../data/objects'
import { flyTo, rig } from '../../lib/rig'
import { formatDistance, formatLightTime } from '../../lib/units'
import { useAtlas } from '../../store/useAtlas'

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function InfoPanel() {
  const id = useAtlas((s) => s.selectedId)
  const dist = useAtlas((s) => s.hud.selectedDist)
  const select = useAtlas((s) => s.select)
  const o = id ? OBJECT_BY_ID.get(id) : undefined

  return (
    <aside
      className={`glass fixed z-20 rounded-2xl p-6 transition-all duration-500 ease-out
        inset-x-3 bottom-3 sm:inset-x-auto sm:top-1/2 sm:right-7 sm:bottom-auto sm:w-[340px] sm:-translate-y-1/2
        ${o ? 'translate-y-0 opacity-100 sm:-translate-y-1/2' : 'pointer-events-none translate-y-6 opacity-0'}`}
    >
      {o && (
        <>
          <div className="flex items-start justify-between">
            <div className="micro">{o.type}</div>
            <button type="button" onClick={() => select(null)} className="-mt-1 -mr-2 cursor-pointer px-2 text-white/50 hover:text-white" aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="mt-2 text-[34px] leading-none font-light tracking-wide text-white">{o.name}</h2>
          <div className="my-5 h-px bg-white/10" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Stat label="From Earth" value={o.id === 'earth' ? 'You are here' : formatDistance(dist)} sub={o.id === 'earth' ? undefined : formatLightTime(dist)} />
            <Stat label="Diameter" value={`${nf.format(o.radiusKm * 2)} km`} sub={o.id === 'earth' ? undefined : `${(o.radiusKm / 6371).toFixed(o.radiusKm < 6371 ? 2 : 1)} × Earth`} />
            {o.orbitPeriod && <Stat label={o.parent ? 'Orbits planet in' : 'Year length'} value={o.orbitPeriod} />}
            <Stat label="Day length" value={formatDay(o.rotationHours)} />
          </dl>
          <div className="my-5 h-px bg-white/10" />
          <div className="micro">Why it matters</div>
          <p className="mt-2 text-[14px] leading-relaxed font-light text-white/85">{o.fact}</p>
          {rig.focusId !== o.id && (
            <button
              type="button"
              onClick={() => flyTo(o.id)}
              className="mt-5 w-full cursor-pointer rounded-lg border border-white/25 py-2 text-[10px] uppercase tracking-[0.3em] text-white/80 hover:bg-white/10"
            >
              Fly here
            </button>
          )}
        </>
      )}
    </aside>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="micro">{label}</dt>
      <dd className="mt-1 text-[15px] tabular-nums text-white">{value}</dd>
      {sub && <dd className="text-[11px] text-white/45">{sub}</dd>}
    </div>
  )
}

function formatDay(h: number) {
  const a = Math.abs(h)
  const s = a < 48 ? `${a.toFixed(1)} hours` : `${nf.format(a / 24)} Earth days`
  return h < 0 ? `${s} (retro)` : s
}

