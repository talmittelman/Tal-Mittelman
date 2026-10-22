// Physical units, all expressed in meters.
// Everything in the app is stored in meters (as JS doubles, which are precise enough
// for the whole universe). Each scale tier then renders in its own convenient unit.
export const KM = 1e3
export const AU = 1.495978707e11
export const LY = 9.4607304725808e15
export const KLY = LY * 1e3
export const MLY = LY * 1e6
export const GLY = LY * 1e9

const nf = (digits: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

/** Human-readable distance that switches unit as the number grows. */
export function formatDistance(m: number): string {
  const a = Math.abs(m)
  if (a < 1e9) return `${nf(0).format(m / KM)} km`
  if (a < 0.05 * LY) return `${nf(a < 10 * AU ? 3 : 1).format(m / AU)} AU`
  if (a < 1e3 * LY) return `${nf(a < 10 * LY ? 2 : 1).format(m / LY)} ly`
  if (a < 1e6 * LY) return `${nf(1).format(m / KLY)} thousand ly`
  if (a < 1e9 * LY) return `${nf(1).format(m / MLY)} million ly`
  return `${nf(2).format(m / GLY)} billion ly`
}

/** Light-travel time — a more intuitive feel for solar-system distances. */
export function formatLightTime(m: number): string {
  const s = Math.abs(m) / 299_792_458
  if (s < 60) return `${nf(1).format(s)} light-seconds`
  if (s < 3600) return `${nf(1).format(s / 60)} light-minutes`
  if (s < 86400) return `${nf(1).format(s / 3600)} light-hours`
  if (s < 86400 * 365.25) return `${nf(1).format(s / 86400)} light-days`
  return `${nf(2).format(s / (86400 * 365.25))} light-years`
}

/**
 * Pick a "nice" round length (1, 2 or 5 × 10ⁿ in a readable unit) close to `targetM`,
 * for the scale bar.
 */
export function niceScaleLength(targetM: number): { meters: number; label: string } {
  const units: [number, string][] =
    targetM < 0.1 * AU
      ? [[KM, 'km']]
      : targetM < 0.1 * LY
        ? [[AU, 'AU']]
        : targetM < 1e3 * LY
          ? [[LY, 'ly']]
          : targetM < 1e6 * LY
            ? [[KLY, 'kly']]
            : targetM < 1e9 * LY
              ? [[MLY, 'Mly']]
              : [[GLY, 'Gly']]
  const [unit, name] = units[0]
  const v = targetM / unit
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const nice = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow
  return { meters: nice * unit, label: `${nf(nice < 1 ? 3 : 0).format(nice)} ${name}` }
}
