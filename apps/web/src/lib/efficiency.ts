/**
 * UI stores FEP efficiency as percent (30). Core expects a fraction (0.30).
 * Conversion stays in the web app — never in @sep/core.
 */
export function percentToEfficiencyFraction(percent: number): number {
  return percent / 100;
}

export function efficiencyFractionToPercent(fraction: number): number {
  return fraction * 100;
}
