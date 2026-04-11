/** Temperature color: 0% = red, 50% = orange, 100% = green */
export function tempColor(pct: number): string {
  const r = pct < 50 ? 255 : Math.round(255 - (pct - 50) * 5.1)
  const g = pct < 50 ? Math.round(pct * 4.2) : Math.round(160 + (pct - 50) * 1.9)
  return `rgb(${r},${g},0)`
}

/** Light background version of temperature color (20% opacity feel) */
export function tempBg(pct: number): string {
  const r = pct < 50 ? 255 : Math.round(255 - (pct - 50) * 2)
  const g = pct < 50 ? Math.round(230 + pct * 0.5) : Math.round(240 + (pct - 50) * 0.3)
  const b = pct < 50 ? Math.round(230 - pct * 1.5) : Math.round(220 - (pct - 50) * 1.5)
  return `rgb(${r},${g},${b})`
}
