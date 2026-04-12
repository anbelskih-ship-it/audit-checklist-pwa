/**
 * Classic traffic-light gradient for score bar, slightly muted:
 *   0% → #ef5350 (soft red)
 *  50% → #ffca28 (warm amber)
 * 100% → #66bb6a (calm green)
 */
export function tempColor(pct: number): string {
  const t = Math.max(0, Math.min(100, pct)) / 100
  let r: number, g: number, b: number
  if (t <= 0.5) {
    const p = t / 0.5
    r = Math.round(239 + (255 - 239) * p)
    g = Math.round(83 + (202 - 83) * p)
    b = Math.round(80 + (40 - 80) * p)
  } else {
    const p = (t - 0.5) / 0.5
    r = Math.round(255 + (102 - 255) * p)
    g = Math.round(202 + (187 - 202) * p)
    b = Math.round(40 + (106 - 40) * p)
  }
  return `rgb(${r},${g},${b})`
}

/**
 * Fill badge — 3 fixed tiers for fill percentage:
 *   0–59%  red digits on pink bg
 *  60–79%  dark orange digits on warm yellow-orange bg
 *  80–100% dark green digits on light green bg
 */
export function fillBadgeColor(pct: number): string {
  if (pct < 60) return '#b71c1c'    // dark red text
  if (pct < 80) return '#bf5600'    // dark orange text
  return '#2e7d32'                   // dark green text
}

export function fillBadgeBg(pct: number): string {
  if (pct < 60) return '#fce4ec'    // light pink bg
  if (pct < 80) return '#fff3e0'    // light orange-yellow bg
  return '#e8f5e9'                   // light green bg
}
