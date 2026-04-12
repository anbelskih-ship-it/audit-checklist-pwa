/**
 * Excel-style 3-color scale (muted, calm):
 *   0% → #F8696B (soft red)
 *  50% → #FFEB84 (warm yellow)
 * 100% → #63BE7B (calm green)
 */
function excelLerp(pct: number): [number, number, number] {
  const t = Math.max(0, Math.min(100, pct)) / 100
  let r: number, g: number, b: number
  if (t <= 0.5) {
    const p = t / 0.5
    r = Math.round(248 + (255 - 248) * p)
    g = Math.round(105 + (235 - 105) * p)
    b = Math.round(107 + (132 - 107) * p)
  } else {
    const p = (t - 0.5) / 0.5
    r = Math.round(255 + (99 - 255) * p)
    g = Math.round(235 + (190 - 235) * p)
    b = Math.round(132 + (123 - 132) * p)
  }
  return [r, g, b]
}

/** Temperature text color for score bar — darker version for readability */
export function tempColor(pct: number): string {
  const [r, g, b] = excelLerp(pct)
  return `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`
}

/** Temperature background for score bar — light pastel version */
export function tempBg(pct: number): string {
  const [r, g, b] = excelLerp(pct)
  return `rgb(${Math.round(r * 0.3 + 255 * 0.7)},${Math.round(g * 0.3 + 255 * 0.7)},${Math.round(b * 0.3 + 255 * 0.7)})`
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
