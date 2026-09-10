import { describe, expect, it } from 'vitest';
import {
  formatAreaM2,
  formatCosine,
  formatEfficiencyPercent,
  formatMassKg,
  formatMaterialName,
  formatParetoLabel,
  formatPowerW,
  formatStructure,
  formatWPerKg,
} from './format.ts';
import { efficiencyFractionToPercent, percentToEfficiencyFraction } from './efficiency.ts';

describe('display formatters', () => {
  it('formats area, cosine, power and mass for reading only', () => {
    expect(formatAreaM2(0.1)).toBe('0.10');
    expect(formatCosine(0.7084)).toBe('0.7084');
    expect(formatPowerW(28.94)).toBe('28.9');
    expect(formatMassKg(0.326)).toBe('0.326');
    expect(formatWPerKg(88.773)).toBe('88.77');
  });

  it('shows efficiency as percent and null material as a dash', () => {
    expect(formatEfficiencyPercent(0.3)).toBe('30.0%');
    expect(formatMaterialName(null)).toBe('—');
    expect(formatMaterialName('BK7')).toBe('BK7');
    expect(formatStructure('honeycomb')).toBe('Сотопанель');
    expect(formatStructure('frame')).toBe('Каркас');
    expect(formatParetoLabel(true)).toBe('Парето');
    expect(formatParetoLabel(false)).toBe('');
  });
});

describe('efficiency conversion', () => {
  it('converts UI percent to a core fraction and back', () => {
    expect(percentToEfficiencyFraction(30)).toBe(0.3);
    expect(percentToEfficiencyFraction(100)).toBe(1);
    expect(efficiencyFractionToPercent(0.3)).toBe(30);
  });
});
